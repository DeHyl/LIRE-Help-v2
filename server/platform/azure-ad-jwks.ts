// Azure AD id_token signature verification (A3).
//
// Pulls the Microsoft JWKS, finds the matching kid, reconstitutes the RSA
// public key via Node's stdlib (no new deps), and verifies an RS256
// signature before trusting any claim on the token. Caches the JWKS per
// tenantId with a 1h TTL.
//
// Exported as a standalone module so tests can inject a fake fetchJwks.

import { createPublicKey, createVerify } from "node:crypto";

export type Jwk = {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
};

export type Jwks = {
  keys: Jwk[];
};

export type VerifyIdTokenConfig = {
  tenantId: string;
  clientId: string;
  clockNow?: () => number;
  fetchJwks?: (tenantId: string) => Promise<Jwks>;
};

export type IdTokenClaims = {
  oid: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  tid: string;
  iss: string;
  aud: string;
  exp: number;
};

type JwksCacheEntry = { fetchedAt: number; jwks: Jwks };
const jwksCache = new Map<string, JwksCacheEntry>();
const JWKS_TTL_MS = 60 * 60 * 1000;

export async function defaultFetchJwks(tenantId: string): Promise<Jwks> {
  const cached = jwksCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.jwks;
  }
  const url = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status} ${await res.text()}`);
  }
  const jwks = (await res.json()) as Jwks;
  jwksCache.set(tenantId, { fetchedAt: Date.now(), jwks });
  return jwks;
}

function base64urlToBuffer(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function decodeJson<T>(segment: string): T {
  return JSON.parse(base64urlToBuffer(segment).toString("utf8")) as T;
}

export async function verifyIdToken(idToken: string, cfg: VerifyIdTokenConfig): Promise<IdTokenClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed id_token");
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];

  const header = decodeJson<{ alg: string; kid?: string; typ?: string }>(encodedHeader);
  if (header.alg !== "RS256") throw new Error(`Unsupported id_token alg: ${header.alg}`);
  if (!header.kid) throw new Error("id_token header is missing kid");

  const fetchJwks = cfg.fetchJwks ?? defaultFetchJwks;
  const jwks = await fetchJwks(cfg.tenantId);
  const key = jwks.keys.find((k) => k.kid === header.kid);
  if (!key) throw new Error(`No JWKS key for kid ${header.kid}`);
  if (key.kty !== "RSA") throw new Error(`Unexpected JWKS kty: ${key.kty}`);

  const publicKey = createPublicKey({ key: { kty: "RSA", n: key.n, e: key.e } as any, format: "jwk" });

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64urlToBuffer(encodedSignature);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();
  if (!verifier.verify(publicKey, signature)) {
    throw new Error("id_token signature verification failed");
  }

  const claims = decodeJson<IdTokenClaims>(encodedPayload);

  if (claims.aud !== cfg.clientId) throw new Error("id_token audience mismatch");
  const expectedIssuer = `https://login.microsoftonline.com/${cfg.tenantId}/v2.0`;
  if (claims.iss !== expectedIssuer) throw new Error("id_token issuer mismatch");
  if (claims.tid !== cfg.tenantId) throw new Error("id_token tenant id mismatch");
  const now = cfg.clockNow ? cfg.clockNow() : Date.now();
  if (claims.exp * 1000 < now) throw new Error("id_token expired");

  return claims;
}
