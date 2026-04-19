import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import { staffIdentities, staffUsers, tenants, type StaffUser } from "../../shared/schema.js";
import { verifyIdToken, type OidcIdTokenClaims } from "./oidc-jwks.js";

// ─────────────────────────────────────────────────────────────────────────────
// Generic OIDC provider handler (authorization code + PKCE).
//
// Used by both Azure AD and Google. Providers supply endpoints, client creds,
// scopes, the JWKS URI, and which id_token claim to treat as the stable
// subject. The handler drives the PKCE + state flow, exchanges the code,
// verifies the id_token via oidc-jwks.ts, and upserts a staff user + linked
// identity.
//
// Deliberately no library (openid-client / passport) — direct implementation
// keeps the network calls auditable. See comment in the old azure-ad.ts.
// ─────────────────────────────────────────────────────────────────────────────

export type OidcProviderConfig = {
  id: string;
  label: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  allowedIssuers: string[];
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  subjectClaim: "sub" | "oid";
  homeTenantSlug: string;
  expectedTid?: string;
};

type PkceState = {
  provider: string;
  state: string;
  codeVerifier: string;
};

type TokenResponse = {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function scopeString(scopes: string[]): string {
  const unique = new Set(["openid", ...scopes]);
  return Array.from(unique).join(" ");
}

// ─── Step 1: authorization URL ──────────────────────────────────────────────

export function buildAuthorizationUrl(cfg: OidcProviderConfig, req: Request): string {
  const state = base64url(randomBytes(24));
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());

  (req.session as any).oidcPkce = { provider: cfg.id, state, codeVerifier } satisfies PkceState;

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: "code",
    redirect_uri: cfg.redirectUri,
    response_mode: "query",
    scope: scopeString(cfg.scopes),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${cfg.authorizationEndpoint}?${params.toString()}`;
}

// ─── Step 2: code → tokens ──────────────────────────────────────────────────

async function exchangeCodeForTokens(
  cfg: OidcProviderConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: scopeString(cfg.scopes),
    code,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const res = await fetch(cfg.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

// ─── Step 3: upsert staff user + identity ───────────────────────────────────

async function upsertStaffFromClaims(cfg: OidcProviderConfig, claims: OidcIdTokenClaims): Promise<StaffUser> {
  if (cfg.expectedTid && claims.tid !== cfg.expectedTid) {
    throw new Error("id_token tenant id mismatch");
  }

  const subjectId = cfg.subjectClaim === "oid" ? claims.oid : claims.sub;
  if (!subjectId) throw new Error(`id_token missing ${cfg.subjectClaim} claim`);

  const email = (claims.email ?? claims.preferred_username ?? "").toLowerCase();
  if (!email) throw new Error("id_token missing email");

  // 1. Identity already linked?
  const identityRow = await db
    .select({ staff: staffUsers })
    .from(staffIdentities)
    .innerJoin(staffUsers, eq(staffIdentities.staffUserId, staffUsers.id))
    .where(and(eq(staffIdentities.provider, cfg.id), eq(staffIdentities.providerSub, subjectId)))
    .limit(1);

  if (identityRow.length > 0) {
    const linked = identityRow[0]!.staff;
    await db
      .update(staffUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(staffUsers.id, linked.id));
    return linked;
  }

  // 2. Auto-link by verified email.
  //    Google always sends email_verified; Azure typically omits it, but we've
  //    already validated the tenant (tid) and audience, so a missing claim is
  //    treated as trusted. Only false rejects auto-link.
  const emailTrusted = claims.email_verified !== false;
  if (emailTrusted) {
    const [byEmail] = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);
    if (byEmail) {
      await db.insert(staffIdentities).values({
        staffUserId: byEmail.id,
        provider: cfg.id,
        providerSub: subjectId,
        email,
        emailVerified: claims.email_verified ?? true,
      });
      await db
        .update(staffUsers)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(staffUsers.id, byEmail.id));
      return byEmail;
    }
  }

  // 3. Provision new staff user + identity under the provider's home tenant.
  const [tenantRow] = await db.select().from(tenants).where(eq(tenants.slug, cfg.homeTenantSlug)).limit(1);
  if (!tenantRow) throw new Error(`Home tenant not found: ${cfg.homeTenantSlug}`);

  const [inserted] = await db
    .insert(staffUsers)
    .values({
      email,
      passwordHash: `oidc:${cfg.id}-sso`,
      name: claims.name ?? email,
      role: "readonly",
      tenantId: tenantRow.id,
      isActive: true,
      lastLoginAt: new Date(),
    })
    .returning();

  if (!inserted) throw new Error("Failed to provision staff user");

  await db.insert(staffIdentities).values({
    staffUserId: inserted.id,
    provider: cfg.id,
    providerSub: subjectId,
    email,
    emailVerified: claims.email_verified ?? true,
  });

  return inserted;
}

// ─── Callback handler ───────────────────────────────────────────────────────

export async function handleOidcCallback(req: Request, res: Response, cfg: OidcProviderConfig): Promise<void> {
  const pkce = (req.session as any).oidcPkce as PkceState | undefined;
  const { code, state } = req.query as { code?: string; state?: string };

  if (!pkce) {
    res.status(400).send("No PKCE session state");
    return;
  }
  if (pkce.provider !== cfg.id) {
    res.status(400).send("Provider mismatch");
    return;
  }
  if (!code || !state || state !== pkce.state) {
    res.status(400).send("Invalid state");
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(cfg, code, pkce.codeVerifier);
    const claims = await verifyIdToken(tokens.id_token, {
      jwksUri: cfg.jwksUri,
      allowedIssuers: cfg.allowedIssuers,
      audience: cfg.clientId,
    });

    const user = await upsertStaffFromClaims(cfg, claims);
    const { setStaffSession } = await import("../helpers/authHelpers.js");
    await setStaffSession(req, user);
    delete (req.session as any).oidcPkce;

    req.session.save((err) => {
      if (err) {
        console.error(`[oidc:${cfg.id} callback] session save error:`, err);
        res.status(500).send("Session error");
        return;
      }
      res.redirect("/dashboard");
    });
  } catch (err) {
    console.error(`[oidc:${cfg.id} callback]`, err);
    res.status(500).send("Authentication failed");
  }
}
