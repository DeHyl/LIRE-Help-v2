// Generic OIDC id_token signature verification.
//
// Fetches the provider's JWKS, finds the matching kid, reconstitutes the RSA
// public key via Node's stdlib (no new deps), and verifies an RS256 signature
// before trusting any claim on the token. Caches each JWKS document by URI
// with a 1h TTL.
//
// Exported as a standalone module so tests can inject a fake fetchJwks.

import { createPublicKey, createVerify } from "node:crypto";

export type OidcJwk = {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
};

export type OidcJwks = {
  keys: OidcJwk[];
};

export type OidcVerifyConfig = {
  jwksUri: string;
  allowedIssuers: string[];
  audience: string;
  clockNow?: () => number;
  fetchJwks?: (jwksUri: string) => Promise<OidcJwks>;
};

export type OidcIdTokenClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  picture?: string;
  oid?: string;
  tid?: string;
  iss: string;
  aud: string;
  exp: number;
  iat?: number;
  nonce?: string;
};

type JwksCacheEntry = { fetchedAt: number; jwks: OidcJwks };
const jwksCache = new Map<string, JwksCacheEntry>();
const JWKS_TTL_MS = 60 * 60 * 1000;

export async function defaultFetchJwks(jwksUri: string): Promise<OidcJwks> {
  const cached = jwksCache.get(jwksUri);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.jwks;
  }
  const res = await fetch(jwksUri);
  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status} ${await res.text()}`);
  }
  const jwks = (await res.json()) as OidcJwks;
  jwksCache.set(jwksUri, { fetchedAt: Date.now(), jwks });
  return jwks;
}

function base64urlToBuffer(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function decodeJson<T>(segment: string): T {
  return JSON.parse(base64urlToBuffer(segment).toString("utf8")) as T;
}

export async function verifyIdToken(idToken: string, cfg: OidcVerifyConfig): Promise<OidcIdTokenClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed id_token");
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];

  const header = decodeJson<{ alg: string; kid?: string; typ?: string }>(encodedHeader);
  if (header.alg !== "RS256") throw new Error(`Unsupported id_token alg: ${header.alg}`);
  if (!header.kid) throw new Error("id_token header is missing kid");

  const fetchJwks = cfg.fetchJwks ?? defaultFetchJwks;
  const jwks = await fetchJwks(cfg.jwksUri);
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

  const claims = decodeJson<OidcIdTokenClaims>(encodedPayload);

  if (claims.aud !== cfg.audience) throw new Error("id_token audience mismatch");
  if (!cfg.allowedIssuers.includes(claims.iss)) throw new Error("id_token issuer mismatch");
  const now = cfg.clockNow ? cfg.clockNow() : Date.now();
  if (claims.exp * 1000 < now) throw new Error("id_token expired");

  return claims;
}
