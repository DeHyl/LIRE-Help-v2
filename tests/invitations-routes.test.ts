import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { getApp } from "./helpers/request.js";
import { seedTenant, seedStaff, truncateAll } from "./helpers/seed.js";

async function agentFor(email: string) {
  const app = await getApp();
  const agent = supertest.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: "Password1234" });
  expect(res.status).toBe(200);
  return agent;
}

describe("invitation flow", () => {
  beforeEach(truncateAll);

  it("readonly cannot create invitations", async () => {
    const a = await seedTenant("a");
    await seedStaff({ email: "ro@x.com", role: "readonly", tenantId: a.id });
    const agent = await agentFor("ro@x.com");
    const res = await agent.post("/api/invitations").send({ email: "new@x.com", role: "staff" });
    expect(res.status).toBe(403);
  });

  it("manager cannot invite a peer or above", async () => {
    const a = await seedTenant("a");
    await seedStaff({ email: "mgr@x.com", role: "manager", tenantId: a.id });
    const agent = await agentFor("mgr@x.com");

    const peer = await agent.post("/api/invitations").send({ email: "peer@x.com", role: "manager" });
    expect(peer.status).toBe(403);

    const sr = await agent.post("/api/invitations").send({ email: "sr@x.com", role: "senior_reviewer" });
    expect(sr.status).toBe(403);

    const owner = await agent.post("/api/invitations").send({ email: "o@x.com", role: "owner" });
    expect(owner.status).toBe(403);
  });

  it("manager can invite operators and readonly", async () => {
    const a = await seedTenant("a");
    await seedStaff({ email: "mgr@x.com", role: "manager", tenantId: a.id });
    const agent = await agentFor("mgr@x.com");
    for (const role of ["broker", "analyst", "staff", "readonly"] as const) {
      const res = await agent.post("/api/invitations").send({ email: `${role}@x.com`, role });
      expect(res.status, `role=${role} body=${JSON.stringify(res.body)}`).toBe(201);
      expect(res.body.token).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("owner can invite compliance + senior_reviewer but not other owners", async () => {
    const a = await seedTenant("a");
    await seedStaff({ email: "own@x.com", role: "owner", tenantId: a.id });
    const agent = await agentFor("own@x.com");

    const comp = await agent.post("/api/invitations").send({ email: "c@x.com", role: "compliance" });
    expect(comp.status).toBe(201);

    const sr = await agent.post("/api/invitations").send({ email: "sr@x.com", role: "senior_reviewer" });
    expect(sr.status).toBe(201);

    const peer = await agent.post("/api/invitations").send({ email: "peer@x.com", role: "owner" });
    expect(peer.status).toBe(403);
  });

  it("invitation is scoped to inviter's tenant", async () => {
    const a = await seedTenant("a");
    const b = await seedTenant("b");
    await seedStaff({ email: "own-a@x.com", role: "owner", tenantId: a.id });
    await seedStaff({ email: "own-b@x.com", role: "owner", tenantId: b.id });
    const agent = await agentFor("own-a@x.com");

    const create = await agent.post("/api/invitations").send({ email: "new@x.com", role: "staff" });
    expect(create.status).toBe(201);

    const list = await agent.get("/api/invitations");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].tenantId).toBe(a.id);

    const otherTenantAgent = await agentFor("own-b@x.com");
    const otherList = await otherTenantAgent.get("/api/invitations");
    expect(otherList.body).toHaveLength(0);
  });

  it("signup with valid token creates a logged-in user with the invited role", async () => {
    const a = await seedTenant("a");
    await seedStaff({ email: "own@x.com", role: "owner", tenantId: a.id });
    const ownerAgent = await agentFor("own@x.com");
    const create = await ownerAgent.post("/api/invitations").send({ email: "Newbie@X.com", role: "analyst" });
    expect(create.status).toBe(201);
    const token = create.body.token;

    const app = await getApp();
    const newAgent = supertest.agent(app);
    const lookup = await newAgent.get(`/api/invitations/lookup/${token}`);
    expect(lookup.status).toBe(200);
    expect(lookup.body.email).toBe("newbie@x.com");
    expect(lookup.body.role).toBe("analyst");

    const signup = await newAgent.post("/api/auth/signup").send({
      token,
      password: "Password1234",
      name: "New Body",
    });
    expect(signup.status).toBe(201);
    expect(signup.body.user.role).toBe("analyst");
    expect(signup.body.user.tenantId).toBe(a.id);

    const me = await newAgent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("newbie@x.com");
  });

  it("signup token can only be used once", async () => {
    const a = await seedTenant("a");
    await seedStaff({ email: "own@x.com", role: "owner", tenantId: a.id });
    const ownerAgent = await agentFor("own@x.com");
    const create = await ownerAgent.post("/api/invitations").send({ email: "x@x.com", role: "staff" });
    const token = create.body.token;

    const app = await getApp();
    const first = await supertest(app).post("/api/auth/signup").send({
      token, password: "Password1234", name: "First",
    });
    expect(first.status).toBe(201);

    const second = await supertest(app).post("/api/auth/signup").send({
      token, password: "Password1234", name: "Second",
    });
    expect(second.status).toBe(404);
  });

  it("revoked invitation cannot be claimed", async () => {
    const a = await seedTenant("a");
    await seedStaff({ email: "own@x.com", role: "owner", tenantId: a.id });
    const ownerAgent = await agentFor("own@x.com");
    const create = await ownerAgent.post("/api/invitations").send({ email: "y@x.com", role: "staff" });
    const id = create.body.id;
    const token = create.body.token;

    const revoke = await ownerAgent.delete(`/api/invitations/${id}`);
    expect(revoke.status).toBe(200);

    const app = await getApp();
    const lookup = await supertest(app).get(`/api/invitations/lookup/${token}`);
    expect(lookup.status).toBe(404);

    const signup = await supertest(app).post("/api/auth/signup").send({
      token, password: "Password1234", name: "Should fail",
    });
    expect(signup.status).toBe(404);
  });
});
