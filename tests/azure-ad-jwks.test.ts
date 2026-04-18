import { describe, expect, it } from "vitest";
import { createPrivateKey, createPublicKey, generateKeyPairSync, createSign } from "node:crypto";
import { verifyIdToken, type Jwks } from "../server/platform/azure-ad-jwks.js";

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

function makeJwks(publicKeyPem: string, kid: string): Jwks {
  const keyObject = createPublicKey(publicKeyPem);
  const jwk = keyObject.export({ format: "jwk" }) as { n: string; e: string; kty: string };
  return { keys: [{ kid, kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", use: "sig" }] };
}

describe("Azure id_token JWKS signature verification (A3)", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const kid = "test-key-1";
  const jwks: Jwks = makeJwks(publicKeyPem, kid);

  const validPayload = {
    oid: "user-oid-1",
    email: "user@example.com",
    name: "User One",
    tid: "tenant-guid",
    iss: "https://login.microsoftonline.com/tenant-guid/v2.0",
    aud: "client-id",
    exp: Math.floor(Date.now() / 1000) + 300,
  };

  const fetchJwks = async () => jwks;
  const baseConfig = {
    tenantId: "tenant-guid",
    clientId: "client-id",
    clockNow: () => Date.now(),
    fetchJwks,
  };

  it("accepts a properly signed, fresh token", async () => {
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, validPayload, privateKeyPem);
    const claims = await verifyIdToken(token, baseConfig);
    expect(claims.email).toBe("user@example.com");
    expect(claims.tid).toBe("tenant-guid");
  });

  it("rejects when kid is missing from JWKS", async () => {
    const token = signJwt({ alg: "RS256", kid: "unknown-key", typ: "JWT" }, validPayload, privateKeyPem);
    await expect(verifyIdToken(token, baseConfig)).rejects.toThrow(/kid/i);
  });

  it("rejects a mutated payload", async () => {
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, validPayload, privateKeyPem);
    const [h, _p, s] = token.split(".");
    const tamperedPayload = { ...validPayload, email: "attacker@evil.com" };
    const mutated = `${h}.${base64url(Buffer.from(JSON.stringify(tamperedPayload)))}.${s}`;
    await expect(verifyIdToken(mutated, baseConfig)).rejects.toThrow(/signature/i);
  });

  it("rejects an expired token", async () => {
    const expired = { ...validPayload, exp: Math.floor(Date.now() / 1000) - 60 };
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, expired, privateKeyPem);
    await expect(verifyIdToken(token, baseConfig)).rejects.toThrow(/expired/i);
  });

  it("rejects wrong audience", async () => {
    const wrongAud = { ...validPayload, aud: "different-client" };
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, wrongAud, privateKeyPem);
    await expect(verifyIdToken(token, baseConfig)).rejects.toThrow(/audience/i);
  });

  it("rejects wrong issuer", async () => {
    const wrongIss = { ...validPayload, iss: "https://evil.example.com/tenant/v2.0" };
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, wrongIss, privateKeyPem);
    await expect(verifyIdToken(token, baseConfig)).rejects.toThrow(/issuer/i);
  });

  it("rejects tenant mismatch", async () => {
    const wrongTid = { ...validPayload, tid: "different-tenant" };
    const token = signJwt({ alg: "RS256", kid, typ: "JWT" }, wrongTid, privateKeyPem);
    await expect(verifyIdToken(token, baseConfig)).rejects.toThrow(/tenant/i);
  });

  it("rejects non-RS256 alg", async () => {
    const token = signJwt({ alg: "HS256", kid, typ: "JWT" }, validPayload, privateKeyPem);
    await expect(verifyIdToken(token, baseConfig)).rejects.toThrow(/alg/i);
  });

  // Silence unused warnings for generated private key type.
  void createPrivateKey;
});
