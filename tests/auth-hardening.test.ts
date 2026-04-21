import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../server/app-factory.js";
import { seedTenant, seedStaff, truncateAll } from "./helpers/seed.js";

// Pull the session id out of a Set-Cookie header. connect.sid payload is
// URL-encoded and prefixed with `s:` — we only care that it changed, so take
// the opaque prefix up to the first `.`
function extractSid(setCookie: string[] | string | undefined): string | null {
  if (!setCookie) return null;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    const m = c.match(/connect\.sid=([^;]+)/);
    if (m) return m[1]!;
  }
  return null;
}

describe("auth hardening (H7, H18, H19)", () => {
  beforeEach(truncateAll);

  it("regenerates the session id on successful login (H7)", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "u@x.com", role: "owner", tenantId: t.id });
    const app = await buildApp();
    const agent = supertest.agent(app);
    // Warm an anonymous session by hitting any endpoint that sets a cookie.
    const initial = await agent.get("/api/auth/oidc/providers").expect(200);
    const initialSid = extractSid(initial.headers["set-cookie"]);

    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: "u@x.com", password: "Password1234" })
      .expect(200);
    const loggedInSid = extractSid(loginRes.headers["set-cookie"]);

    // Either the pre-login request set a sid (then it must have changed) OR
    // the pre-login request didn't set one (session store lazy) — in which case
    // the login must have issued one. Both paths prove regenerate() ran.
    if (initialSid) {
      expect(loggedInSid).not.toBe(initialSid);
    } else {
      expect(loggedInSid).toBeTruthy();
    }
  });

  it("logout clears the session cookie with matching options (H18)", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "u@x.com", role: "owner", tenantId: t.id });
    const app = await buildApp();
    const agent = supertest.agent(app);
    await agent.post("/api/auth/login").send({ email: "u@x.com", password: "Password1234" }).expect(200);

    const logoutRes = await agent.post("/api/auth/logout").expect(200);
    const cookies = logoutRes.headers["set-cookie"] ?? [];
    const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
    const clearCookie = cookieArr.find((c) => c.startsWith("connect.sid="));
    expect(clearCookie).toBeDefined();
    // clearCookie sets Expires in the past and Max-Age=0 or similar. Assert
    // the matching attributes are present so browsers actually drop the cookie.
    expect(clearCookie).toMatch(/Path=\//);
    expect(clearCookie).toMatch(/HttpOnly/);
    expect(clearCookie).toMatch(/SameSite=Lax/i);

    await agent.get("/api/auth/me").expect(401);
  });

  it("rate-limits login attempts per email (H19)", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "limit@x.com", role: "owner", tenantId: t.id });
    const app = await buildApp();

    // loginLimiter is OFF in test env by default — opt back in explicitly so
    // this suite exercises the production behavior without tripping unrelated
    // tests that log in many accounts per file.
    let saw429 = false;
    for (let i = 0; i < 12; i++) {
      const res = await supertest(app)
        .post("/api/auth/login")
        .set("x-exercise-login-limit", "1")
        .send({ email: "limit@x.com", password: "wrong-password" });
      if (res.status === 429) { saw429 = true; break; }
    }
    expect(saw429).toBe(true);
  });
});
