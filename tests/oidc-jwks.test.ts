import { describe, expect, it } from "vitest";
import { createPrivateKey, createPublicKey, generateKeyPairSync, createSign } from "node:crypto";
import { verifyIdToken, type OidcJwks } from "../server/platform/oidc-jwks.js";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKeyPem: string,
): string {
  const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = base64url(signer.sign(privateKeyPem));
  return `${signingInput}.${signature}`;
}

function makeJwks(publicKeyPem: string, kid: string): OidcJwks {
  const keyObject = createPublicKey(publicKeyPem);
  const jwk = keyObject.export({ format: "jwk" }) as { n: string; e: string; kty: string };
  return { keys: [{ kid, kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", use: "sig" }] };
}

describe("OIDC id_token JWKS signature verification", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const kid = "test-key-1";
  const jwks = makeJwks(publicKeyPem, kid);

  const azurePayload = {
    oid: "user-oid-1",
    sub: "azure-subject",
    email: "user@example.com",
    name: "User One",
    tid: "tenant-guid",
    iss: "https://login.microsoftonline.com/tenant-guid/v2.0",
    aud: "client-id",
    exp: Math.floor(Date.now() / 1000) + 300,
  };

  const fetchJwks = async () => jwks;
  const azureConfig = {
    jwksUri: "https://login.microsoftonline.com/tenant-guid/discovery/v2.0/keys",
    allowedIssuers: ["https://login.microsoftonline.com/tenant-guid/v2.0"],
    audience: "client-id",
    clockNow: () => Date.now(),
    fetchJwks,
  };

  it("accepts a properly signed, fresh token", async () => {
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, azurePayload, privateKeyPem);
    const claims = await verifyIdToken(token, azureConfig);
    expect(claims.email).toBe("user@example.com");
    expect(claims.tid).toBe("tenant-guid");
  });

  it("rejects when kid is missing from JWKS", async () => {
    const token = signJwt({ alg: "RS256", kid: "unknown-key", typ: "JWT" }, azurePayload, privateKeyPem);
    await expect(verifyIdToken(token, azureConfig)).rejects.toThrow(/kid/i);
  });

  it("rejects a mutated payload", async () => {
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, azurePayload, privateKeyPem);
    const [h, _p, s] = token.split(".");
    const tamperedPayload = { ...azurePayload, email: "attacker@evil.com" };
    const mutated = `${h}.${base64url(Buffer.from(JSON.stringify(tamperedPayload)))}.${s}`;
    await expect(verifyIdToken(mutated, azureConfig)).rejects.toThrow(/signature/i);
  });

  it("rejects an expired token", async () => {
    const expired = { ...azurePayload, exp: Math.floor(Date.now() / 1000) - 60 };
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, expired, privateKeyPem);
    await expect(verifyIdToken(token, azureConfig)).rejects.toThrow(/expired/i);
  });

  it("rejects wrong audience", async () => {
    const wrongAud = { ...azurePayload, aud: "different-client" };
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, wrongAud, privateKeyPem);
    await expect(verifyIdToken(token, azureConfig)).rejects.toThrow(/audience/i);
  });

  it("rejects issuer not in allowedIssuers", async () => {
    const wrongIss = { ...azurePayload, iss: "https://evil.example.com/tenant/v2.0" };
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, wrongIss, privateKeyPem);
    await expect(verifyIdToken(token, azureConfig)).rejects.toThrow(/issuer/i);
  });

  it("accepts either Google issuer variant when both are allowed", async () => {
    const googleConfig = {
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
      allowedIssuers: ["https://accounts.google.com", "accounts.google.com"],
      audience: "google-client-id",
      clockNow: () => Date.now(),
      fetchJwks,
    };
    const payloadA = {
      sub: "google-subject-1",
      email: "user@gmail.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: "google-client-id",
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    const payloadB = { ...payloadA, iss: "accounts.google.com" };
    const tokenA = signJwt({ alg: "RS256", kid, typ: "JWT" }, payloadA, privateKeyPem);
    const tokenB = signJwt({ alg: "RS256", kid, typ: "JWT" }, payloadB, privateKeyPem);
    await expect(verifyIdToken(tokenA, googleConfig)).resolves.toBeDefined();
    await expect(verifyIdToken(tokenB, googleConfig)).resolves.toBeDefined();
  });

  it("rejects non-RS256 alg", async () => {
    const token = signJwt({ alg: "HS256", kid, typ: "JWT" }, azurePayload, privateKeyPem);
    await expect(verifyIdToken(token, azureConfig)).rejects.toThrow(/alg/i);
  });

  // Silence unused warnings for generated private key type.
  void createPrivateKey;
});
