import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { getApp } from "./helpers/request.js";
import { seedTenant, seedStaff, truncateAll } from "./helpers/seed.js";

describe("platform-sessions POST (B4)", () => {
  beforeEach(truncateAll);

  it("401s anonymous writes", async () => {
    const app = await getApp();
    await supertest(app)
      .post("/api/platform-sessions")
      .send({ sessionId: "x", messages: [] })
      .expect(401);
  });

  it("400s on invalid shape", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "s@x.com", role: "staff", tenantId: t.id });
    const app = await getApp();
    const agent = supertest.agent(app);
    await agent.post("/api/auth/login").send({ email: "s@x.com", password: "Password1234" }).expect(200);
    await agent.post("/api/platform-sessions")
      .send({ sessionId: "x", messages: [{ role: "system", content: "x" }] })
      .expect(400);
  });

  it("accepts a valid payload from an authed staff user", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "s@x.com", role: "staff", tenantId: t.id });
    const app = await getApp();
    const agent = supertest.agent(app);
    await agent.post("/api/auth/login").send({ email: "s@x.com", password: "Password1234" }).expect(200);
    const r = await agent.post("/api/platform-sessions")
      .send({ sessionId: "sess-1", messages: [{ role: "user", content: "hi" }] })
      .expect(200);
    expect(r.body.ok).toBe(true);
    expect(typeof r.body.id).toBe("string");
  });
});
