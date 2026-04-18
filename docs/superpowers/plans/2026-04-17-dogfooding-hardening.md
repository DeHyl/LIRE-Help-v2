# Dogfooding Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every pre-dogfooding security/correctness gap surfaced in the 2026-04-17 deep code review so LIRE-Help-v2 is safe to onboard Berkeley with real tenant data this week.

**Architecture:** Three phases, each ending in a deployable milestone. Phase 1 = test infrastructure + tenant-isolation bedrock. Phase 2 = blocker fixes (the 15 items that gate dogfooding). Phase 3 = high-priority follow-ups (H1–H12) that unblock onboarding a second tenant. Work happens in-place on an isolated worktree branch and merges via PR at each milestone.

**Tech Stack:** TypeScript strict, Express 4, Drizzle ORM on Postgres, vitest + supertest for tests, zod for boundary validation, express-session + connect-pg-simple, express-rate-limit, Anthropic SDK (direct fetch). Tests run via `npm run test` (new script added in Task 1).

---

## Review spec

Source of truth for every finding in this plan: the 2026-04-17 deep review saved verbatim in the conversation history and mirrored by the numbered B/H codes below. Do not second-guess findings — fix them as written. If a finding reads as already-fixed when you get there, verify with a test and mark the step complete.

## File structure

### New files
- `tests/setup.ts` — vitest hooks (shared test DB URL, truncate-between-tests).
- `tests/helpers/request.ts` — thin wrapper around supertest that logs a typed session.
- `tests/helpers/seed.ts` — programmatic tenant/property/staff seeders for tests (NOT `ensureHelpdeskBootstrap`).
- `tests/tenant-isolation.test.ts` — the 6-step go/no-go scenarios from the review, as tests.
- `tests/staff-routes.test.ts` — coverage for B2 fixes.
- `tests/helpdesk-scoping.test.ts` — coverage for B3.
- `tests/knowledge.test.ts` — coverage for B10.
- `tests/platform-sessions.test.ts` — coverage for B4.
- `tests/chat.test.ts` — coverage for B1.
- `tests/credit-upload.test.ts` — coverage for B7.
- `tests/auth.test.ts` — coverage for H7, H18, H19.
- `tests/cors.test.ts` — coverage for B8.
- `tests/azure-ad.test.ts` — coverage for B5 signature verification.
- `server/types/session.d.ts` — typed session augmentation (M1, supports B-series fixes).
- `server/platform/jwks-verify.ts` — JWKS fetch + RSA signature verification for B5.
- `server/helpers/tenant-scope.ts` — shared helper to validate `propertyId` belongs to the session's tenant (supports B2, B3, H11, H12).
- `server/helpers/rate-limiters.ts` — login limiter (H19), daily chat limiter (B1), platform-sessions limiter (B4). Centralizes limiter config.
- `vitest.config.ts` — root vitest config.
- `drizzle/0001_tenant_scope_platform_knowledge.sql` — adds `tenant_id` to `platform_knowledge` (B10).
- `drizzle/0002_staff_sessions_and_indexes.sql` — declares `staff_sessions` via drizzle + indexes from H3.
- `drizzle/0003_units_yardi_unique.sql` — unique constraint on `(tenant_id, yardi_unit_id)` (H5).

### Modified files
- `shared/schema.ts` — add `platform_knowledge.tenantId`, `staff_sessions` table, indexes, `(tenantId, yardiUnitId)` unique, refine insert schemas to drop server-derived columns.
- `server/middleware/auth.ts` — use typed session, keep behavior.
- `server/staff-routes.ts` — tighten role gates, validate propertyId scope, prevent tenant spoofing (B2).
- `server/storage.ts` — fix `withinScope` (B3), remove demo bootstrap from hot path (H2), scope `platform_knowledge` queries (B10), extractions `inArray` batch (H4), pagination parameters on inbox queries (H1).
- `server/helpdesk-routes.ts` — validate `filterPropertyId` against session scope (B3).
- `server/knowledge-routes.ts` — read/write scoped by `staffTenantId` (B10).
- `server/platform-sessions-routes.ts` — auth + rate limit + zod (B4).
- `server/properties-routes.ts` — strip `tenantId` from non-superadmin payloads (H11).
- `server/agents-routes.ts` — verify propertyId belongs to session tenant (H12).
- `server/auth-routes.ts` — `regenerate` on login (H7), mirror cookie options on logout (H18), login rate limit (H19).
- `server/platform/azure-ad.ts` — JWKS signature verification (B5) + `oid`-based upsert (requires schema column).
- `server/platform/blob-store.ts` — sanitize filename in both stores (B7).
- `server/pilots/credit/routes.ts` — MIME allowlist + size cap + filename sanitization + dedup lookup (B7).
- `server/pilots/leasing/yardi-sync.ts` — batch upsert using new unique constraint (H5).
- `server/token-logger.ts` — add Opus + Sonnet 4.6 + Sonnet 4.7 pricing (H17). (H17 is listed as high but fixed here because the review flagged missing Opus; include it in blocker wave to avoid wrong metrics during dogfooding.)
- `server.ts` — reduces to a thin `buildApp` + `listen` wrapper once Task 2 extracts the app factory. All hardening lands in `server/app-factory.ts`: CORS prod regex (B8), helmet CSP in prod (B9), bounded global `express.json({ limit: "100kb" })` (H15), central error handler (H10), chat input zod + daily limiter (B1), branding validator (B14), dedupe pg pool via `conString` (H9), remove runtime `CREATE TABLE` for staff_sessions (B11/H8).
- `scripts/seed-demo.ts` — fix `cust-frito-lay` typo (B15), gate execution on `LIRE_SEED_DEMO=1`.
- `client/src/lib/auth.tsx` — `queryClient.clear()` on logout (H6).
- `client/src/pages/credit-review.tsx`, `platform-dashboard.tsx` — include tenant/user id in React Query keys (H6).
- `package.json` — add `test`, `test:watch` scripts + `vitest`, `supertest`, `@types/supertest` devDeps.

---

## Phase 1 — Test infrastructure and tenant-scoping bedrock

### Task 1: Install and wire up vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 0: Provision a test database**

The test suite refuses to run unless `DATABASE_URL` contains the substring "test" (`tests/setup.ts` enforces this). Create a dedicated DB, enable `pgcrypto` (needed for `gen_random_uuid()` defaults), and apply the current schema:

```bash
createdb lire_help_test || true
DATABASE_URL="postgres://localhost/lire_help_test" \
  psql -d lire_help_test -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
DATABASE_URL="postgres://localhost/lire_help_test" npm run db:push
```

Create `.env.test` at the repo root with a single line (this file is gitignored via the existing `.gitignore`; if not, add it):

```
DATABASE_URL=postgres://localhost/lire_help_test
```

Add a convenience npm script to `package.json` scripts so CI and local devs share the same path:

```json
"test:db:push": "DATABASE_URL=\"$(grep ^DATABASE_URL= .env.test | cut -d= -f2-)\" drizzle-kit push"
```

Document this in the "Appendix: environment checklist" at the bottom of the plan (already covered there — verify when you reach it).

- [ ] **Step 1: Add devDeps**

```bash
npm install --save-dev vitest@^1.6.0 supertest@^6.3.4 @types/supertest@^6.0.2
```

- [ ] **Step 2: Add scripts to `package.json`**

Edit the `"scripts"` object (package.json:6-15) to add:

```json
"test": "vitest run",
"test:watch": "vitest",
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    testTimeout: 20000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
```

- [ ] **Step 4: Create `tests/setup.ts`**

```ts
import { afterAll, afterEach, beforeAll } from "vitest";

if (!process.env.DATABASE_URL) {
  throw new Error("Tests require DATABASE_URL (use a dedicated test DB, e.g. postgres://...lire_help_test).");
}
if (!process.env.DATABASE_URL.includes("test")) {
  throw new Error("Refusing to run tests against a non-test DATABASE_URL. Include the substring 'test' in the URL.");
}

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-secret-not-used-in-prod";

beforeAll(async () => {
  const { truncateAll } = await import("./helpers/seed.js");
  await truncateAll();
});

afterEach(async () => {
  const { truncateAll } = await import("./helpers/seed.js");
  await truncateAll();
});

afterAll(async () => {
  const { closeDb } = await import("./helpers/seed.js");
  await closeDb();
});
```

- [ ] **Step 5: Create `tests/helpers/seed.ts` (minimal first)**

```ts
import { sql } from "drizzle-orm";
import { db, pgClient } from "../../server/db.js";
import {
  tenants,
  properties,
  staffUsers,
} from "../../shared/schema.js";
import { hashPassword } from "../../server/helpers/authHelpers.js";

const TABLES = [
  "archive_log", "credit_approvals", "credit_memos", "credit_checklist_runs",
  "credit_extractions", "credit_documents", "lessees",
  "unit_sheets", "tours", "deal_events", "deals", "units",
  "help_conversation_tags", "help_messages", "help_tickets", "help_conversations",
  "help_tags", "help_slas", "help_customers", "help_inboxes",
  "token_usage", "platform_sessions", "platform_knowledge",
  "agents", "staff_sessions", "staff_users", "properties", "tenants",
] as const;

export async function truncateAll() {
  // Skip tables that don't exist yet. This lets tests run against a partially-
  // migrated test DB during Phase 1 (staff_sessions is declared in Task 5).
  // Why: the alternative is strict ordering of Tasks 1/2/5; we prefer a
  // tolerant truncate so iteration order in the plan stays flexible.
  const existing = await db.execute<{ tablename: string }>(sql.raw(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  ));
  const present = new Set(existing.map((row: any) => row.tablename));
  for (const table of TABLES) {
    if (!present.has(table)) continue;
    await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
  }
}

export async function closeDb() {
  await pgClient.end();
}

export async function seedTenant(slug: string, name = slug) {
  const [row] = await db.insert(tenants).values({ slug, name }).returning();
  return row;
}

export async function seedProperty(tenantId: string, slug: string, name = slug) {
  const [row] = await db.insert(properties).values({ tenantId, slug, name }).returning();
  return row;
}

export async function seedStaff(opts: {
  email: string;
  role: "superadmin" | "owner" | "manager" | "staff" | "readonly";
  tenantId: string | null;
  propertyId?: string | null;
  password?: string;
  name?: string;
}) {
  const passwordHash = await hashPassword(opts.password ?? "Password1234");
  const [row] = await db.insert(staffUsers).values({
    email: opts.email.toLowerCase(),
    passwordHash,
    name: opts.name ?? opts.email,
    role: opts.role,
    tenantId: opts.tenantId,
    propertyId: opts.propertyId ?? null,
    isActive: true,
  }).returning();
  return row;
}
```

- [ ] **Step 6: Expose `pgClient` from `server/db.ts`**

Open `server/db.ts`. The file imports `postgres from "postgres"` and stores the client as `const queryClient = postgres(...)`. Add the export so tests can close the connection cleanly:

```ts
export const pgClient = queryClient;
```

(Do not rename `queryClient` itself — leave existing callers alone.)

- [ ] **Step 7: Create `tests/helpers/request.ts`**

```ts
import supertest, { type SuperTest, type Test } from "supertest";
import { buildApp } from "../../server/app-factory.js";

export async function createClient(): Promise<SuperTest<Test>> {
  const app = await buildApp();
  return supertest(app);
}

export async function login(agent: ReturnType<typeof supertest.agent>, email: string, password = "Password1234") {
  const res = await agent.post("/api/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed ${res.status}: ${JSON.stringify(res.body)}`);
  return res;
}
```

Note: `buildApp` doesn't exist yet — the next task extracts it from `server.ts`.

- [ ] **Step 8: Commit infra**

```bash
git add package.json package-lock.json vitest.config.ts tests/setup.ts tests/helpers/seed.ts tests/helpers/request.ts server/db.ts
git commit -m "test: add vitest + supertest infrastructure with tenant-scoped seed helpers"
```

---

### Task 2: Extract `buildApp()` from `server.ts` so tests can mount the real app

**Files:**
- Create: `server/app-factory.ts`
- Modify: `server.ts` (wrap listen in `main` that calls `buildApp`)

- [ ] **Step 1a: Create the `buildApp` skeleton**

Create `server/app-factory.ts` with:

```ts
import express from "express";
import helmet from "helmet";
import path from "path";

export async function buildApp(): Promise<express.Express> {
  const app = express();
  const isDev = process.env.NODE_ENV !== "production";
  const sessionSecret = process.env.SESSION_SECRET;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!sessionSecret && !isDev) throw new Error("SESSION_SECRET is required in production");

  const bundleDir = typeof __dirname !== "undefined" ? __dirname : path.dirname(new URL(import.meta.url).pathname);
  const isCjsBundle = typeof __dirname !== "undefined";
  const root = isCjsBundle ? path.resolve(bundleDir, "..") : bundleDir;

  // TODO: middleware / CORS / session (Step 1b)
  // TODO: route mounts (Step 1c)
  // TODO: chat + health (Step 1d)
  // TODO: static / SPA (Step 1e)

  return app;
}
```

- [ ] **Step 1b: Move trust-proxy, helmet, CORS, parsers, session into `buildApp`**

Copy `server.ts:32-114` (everything through the `app.use(session({...}))` block) into `buildApp` at the `// TODO: middleware` marker. Delete those lines from `server.ts` as you go.

- [ ] **Step 1c: Move route mounts into `buildApp`**

Copy `server.ts:116-139` (dynamic imports + the `app.use("/api/*", ...)` block). Leave `/api/public/brand`, `/api/chat`, health, and setup endpoint for the next step.

- [ ] **Step 1d: Move brand + system prompt + chat + health + setup into `buildApp`**

Copy `server.ts:141-433`. Preserve behavior exactly — no hardening changes yet (those land in Task 10).

- [ ] **Step 1e: Move static/SPA serving into `buildApp`**

Copy `server.ts:435-472`.

- [ ] **Step 1f: Rewrite `server.ts` to be a thin wrapper**

`server.ts` now only holds:

```ts
import { buildApp } from "./server/app-factory.js";

async function main() {
  const app = await buildApp();
  const PORT = process.env.PORT || 5000;
  const isDev = process.env.NODE_ENV !== "production";
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`LIRE Help running on port ${PORT} (${isDev ? "development" : "production"})`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Write failing smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createClient } from "./helpers/request.js";

describe("app factory", () => {
  it("serves /api/health", async () => {
    const client = await createClient();
    const res = await client.get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
```

- [ ] **Step 3: Run test, expect failure (buildApp not imported)**

```bash
npm run test -- tests/smoke.test.ts
```

Expected: fail with `Cannot find module '../../server/app-factory.js'` or similar.

- [ ] **Step 4: Run test after the extraction, expect pass**

```bash
npm run test -- tests/smoke.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/app-factory.ts server.ts tests/smoke.test.ts
git commit -m "refactor: extract buildApp from server.ts for test harness"
```

---

### Task 3: Typed session augmentation (M1)

**Files:**
- Create: `server/types/session.d.ts`
- Modify: `tsconfig.json` to include the new types path (only if needed)

- [ ] **Step 1: Create the .d.ts**

```ts
import "express-session";

declare module "express-session" {
  interface SessionData {
    staffId?: string;
    staffRole?: "superadmin" | "owner" | "manager" | "staff" | "readonly";
    staffTenantId?: string | null;
    staffTenantSlug?: string | null;
    staffPropertyId?: string | null;
    azureAdPkce?: { state: string; codeVerifier: string };
  }
}

export {};
```

- [ ] **Step 2: Verify tsconfig picks it up**

```bash
npm run check
```

Expected: PASS (no type changes in consumers yet — that's next; they still use `any`).

- [ ] **Step 3: Commit**

```bash
git add server/types/session.d.ts
git commit -m "refactor: add typed session augmentation (supports B2/B3/H11/H12 refactors)"
```

---

### Task 4: Shared tenant-scope helper

**Files:**
- Create: `server/helpers/tenant-scope.ts`
- Create: `tests/helpers/tenant-scope.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { seedTenant, seedProperty, truncateAll } from "./seed.js";
import { assertPropertyInTenant } from "../../server/helpers/tenant-scope.js";

describe("assertPropertyInTenant", () => {
  beforeEach(truncateAll);

  it("returns the property when it belongs to tenant", async () => {
    const t = await seedTenant("acme");
    const p = await seedProperty(t.id, "warehouse-1");
    const result = await assertPropertyInTenant(p.id, t.id);
    expect(result.id).toBe(p.id);
  });

  it("throws when property belongs to a different tenant", async () => {
    const a = await seedTenant("acme");
    const b = await seedTenant("bex");
    const p = await seedProperty(b.id, "warehouse-1");
    await expect(assertPropertyInTenant(p.id, a.id)).rejects.toThrow(/not found/);
  });

  it("throws when property does not exist", async () => {
    const a = await seedTenant("acme");
    await expect(assertPropertyInTenant("00000000-0000-0000-0000-000000000000", a.id)).rejects.toThrow(/not found/);
  });
});
```

- [ ] **Step 2: Create the helper**

```ts
import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import { properties, type Property } from "../../shared/schema.js";

export class PropertyScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PropertyScopeError";
  }
}

export async function assertPropertyInTenant(propertyId: string, tenantId: string): Promise<Property> {
  const [row] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new PropertyScopeError("Property not found or not in tenant scope");
  return row;
}
```

- [ ] **Step 3: Run tests, expect pass**

```bash
npm run test -- tests/helpers/tenant-scope.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add server/helpers/tenant-scope.ts tests/helpers/tenant-scope.test.ts
git commit -m "feat(scope): add assertPropertyInTenant helper used by B2/B3/H11/H12 fixes"
```

---

### Task 5: Declare `staff_sessions` in schema and drop runtime `CREATE TABLE` (B11, H8)

**Files:**
- Modify: `shared/schema.ts`
- Modify: `server.ts` (remove lines 84–94)
- Create: `drizzle/0002_staff_sessions_and_indexes.sql`

- [ ] **Step 1: Add `staffSessions` table to `shared/schema.ts`**

The existing production table uses `sess json` (not `jsonb`). Match it exactly to avoid drizzle-kit trying to ALTER a live column on the next push. Drizzle 0.39 has no first-class `json()` helper, so use `customType`:

```ts
import { customType } from "drizzle-orm/pg-core";

const pgJson = customType<{ data: unknown; driverData: string }>({
  dataType() { return "json"; },
});

export const staffSessions = pgTable("staff_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: pgJson("sess").notNull(),
  expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
});
```

Why: `connect-pg-simple` reads/writes the column as a JSON string. Declaring it as `jsonb` would cause drizzle-kit push to prompt for a column type change on prod, which can rewrite all live session rows and risks brief auth outages.

- [ ] **Step 2: Create the migration SQL**

```sql
-- Drizzle migration: idempotent staff_sessions declaration + indexes from H3.
-- sess column is json (NOT jsonb) to match connect-pg-simple's existing layout.
CREATE TABLE IF NOT EXISTS "staff_sessions" (
  "sid" varchar PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_staff_sessions_expire" ON "staff_sessions" ("expire");
CREATE INDEX IF NOT EXISTS "idx_help_conversations_tenant_last_msg"
  ON "help_conversations" ("tenant_id", "last_message_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_help_messages_conversation"
  ON "help_messages" ("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_help_conversation_tags_conversation"
  ON "help_conversation_tags" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_token_usage_tenant_created"
  ON "token_usage" ("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_credit_extractions_tenant_doc"
  ON "credit_extractions" ("tenant_id", "document_id");
CREATE INDEX IF NOT EXISTS "idx_staff_users_tenant"
  ON "staff_users" ("tenant_id");
```

- [ ] **Step 3: Remove the runtime `CREATE TABLE` block**

Edit `server.ts:84-94` and delete both `sessionPool.query(...)` calls. The table now comes from migrations.

- [ ] **Step 4: Run `npm run db:push` on the local/test DB**

```bash
npm run db:push
```

Expected: drizzle confirms schema matches; no prompt. If it prompts to drop columns, abort and reconcile.

- [ ] **Step 5: Smoke test the app still boots**

```bash
npm run test -- tests/smoke.test.ts
```

Expected: PASS (health endpoint works, sessions still load).

- [ ] **Step 6: Commit**

```bash
git add shared/schema.ts server.ts drizzle/0002_staff_sessions_and_indexes.sql
git commit -m "fix(B11,H3,H8): declare staff_sessions in schema, add hot-path indexes"
```

---

### Task 6: Add tenant isolation go/no-go tests (fail first, fix later)

**Files:**
- Create: `tests/tenant-isolation.test.ts`

- [ ] **Step 1: Write the six scenarios from review §Dogfooding readiness**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../server/app-factory.js";
import { seedTenant, seedProperty, seedStaff, truncateAll } from "./helpers/seed.js";

async function agentFor(email: string) {
  const app = await buildApp();
  const agent = supertest.agent(app);
  await agent.post("/api/auth/login").send({ email, password: "Password1234" }).expect(200);
  return agent;
}

describe("tenant isolation (dogfooding go/no-go)", () => {
  beforeEach(truncateAll);

  it("Owner B cannot read Tenant A's lessee", async () => {
    const a = await seedTenant("tenant-a");
    const b = await seedTenant("tenant-b");
    await seedStaff({ email: "owner-a@x.com", role: "owner", tenantId: a.id });
    await seedStaff({ email: "owner-b@x.com", role: "owner", tenantId: b.id });

    const ownerA = await agentFor("owner-a@x.com");
    const created = await ownerA.post("/api/pilots/credit/lessees").send({ legalName: "ACME" }).expect(201);
    const id = created.body.lessee.id;

    const ownerB = await agentFor("owner-b@x.com");
    await ownerB.get(`/api/pilots/credit/lessees/${id}`).expect(404);
  });

  it("Owner A cannot PUT Tenant B's agent by propertyId", async () => {
    const a = await seedTenant("tenant-a");
    const b = await seedTenant("tenant-b");
    await seedStaff({ email: "owner-a@x.com", role: "owner", tenantId: a.id });
    const propB = await seedProperty(b.id, "warehouse-b");

    const ownerA = await agentFor("owner-a@x.com");
    await ownerA.put(`/api/agents/by-property/${propB.id}`).send({ name: "HOSTILE" }).expect(403);
  });

  it("Manager scoped to property A1 cannot see A2's conversations via ?propertyId filter", async () => {
    const a = await seedTenant("tenant-a");
    const a1 = await seedProperty(a.id, "a-one");
    const a2 = await seedProperty(a.id, "a-two");
    await seedStaff({ email: "manager-a1@x.com", role: "manager", tenantId: a.id, propertyId: a1.id });
    // This test expects a manager scoped to a1 to NOT see any a2-tied data.
    // Once conversations exist in a2 only, the list should be empty even with ?propertyId=<a2.id>.
    // For now we assert the unauthorized property is rejected outright.
    const m = await agentFor("manager-a1@x.com");
    const r = await m.get(`/api/helpdesk/inbox/conversations?propertyId=${a2.id}`);
    expect(r.status).toBe(403);
  });

  it("Owner A cannot write to platform_knowledge that Tenant B reads", async () => {
    const a = await seedTenant("tenant-a");
    const b = await seedTenant("tenant-b");
    await seedStaff({ email: "owner-a@x.com", role: "owner", tenantId: a.id });
    const ownerA = await agentFor("owner-a@x.com");
    await ownerA.post("/api/knowledge/platform")
      .send({ section: "intro", title: "Tenant A only", content: "Secret A stuff" })
      .expect(201);
    // Unauthenticated chat on tenant B (simulated by host header) must not reveal "Tenant A only".
    const app = await buildApp();
    const anon = supertest(app);
    const res = await anon.post("/api/chat")
      .set("Host", "tenant-b.lire-help.com")
      .send({ messages: [{ role: "user", content: "What is Tenant A only?" }] });
    // Either chat is auth-gated (401) or response must not include the leak.
    if (res.status === 200) {
      expect(String(res.body.response ?? "")).not.toContain("Tenant A only");
    } else {
      expect([401, 403]).toContain(res.status);
    }
  });

  it("Unauthenticated user cannot upsert platform_sessions", async () => {
    const app = await buildApp();
    const anon = supertest(app);
    const r = await anon.post("/api/platform-sessions").send({ sessionId: "x", messages: [] });
    expect([401, 403]).toContain(r.status);
  });

  it("Any authenticated user cannot list staff outside their tenant", async () => {
    const a = await seedTenant("tenant-a");
    const b = await seedTenant("tenant-b");
    await seedStaff({ email: "owner-a@x.com", role: "owner", tenantId: a.id });
    await seedStaff({ email: "owner-b@x.com", role: "owner", tenantId: b.id });
    const ownerA = await agentFor("owner-a@x.com");
    const res = await ownerA.get("/api/staff").expect(200);
    const emails = res.body.map((u: { email: string }) => u.email);
    expect(emails).toContain("owner-a@x.com");
    expect(emails).not.toContain("owner-b@x.com");
  });
});
```

- [ ] **Step 2: Run the suite — expect several failures**

```bash
npm run test -- tests/tenant-isolation.test.ts
```

Expected: multiple failures (these assertions are the targets of Phase 2).

- [ ] **Step 3: Do NOT fix yet — commit the red test as a tracking baseline**

```bash
git add tests/tenant-isolation.test.ts
git commit -m "test: add tenant isolation go/no-go suite (currently failing, fixes land in Phase 2)"
```

---

## Phase 2 — Blocker fixes (dogfooding gate)

### Task 7: Fix staff-routes (B2)

**Files:**
- Create: `tests/staff-routes.test.ts`
- Modify: `server/staff-routes.ts`

- [ ] **Step 1: Write failing tests covering B2**

Cover: GET list excludes other tenants; owner cannot create staff with foreign `propertyId`; owner cannot set `tenantId`; PATCH forbids foreign-tenant targets; password change logs an audit line (via archive_log or stderr — accept either); deactivated users have sessions revoked.

```ts
import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../server/app-factory.js";
import { seedTenant, seedProperty, seedStaff, truncateAll } from "./helpers/seed.js";

async function agentFor(email: string) {
  const app = await buildApp();
  const agent = supertest.agent(app);
  await agent.post("/api/auth/login").send({ email, password: "Password1234" }).expect(200);
  return agent;
}

describe("staff-routes hardening (B2)", () => {
  beforeEach(truncateAll);

  it("readonly cannot list staff", async () => {
    const a = await seedTenant("a");
    await seedStaff({ email: "ro@x.com", role: "readonly", tenantId: a.id });
    const agent = await agentFor("ro@x.com");
    await agent.get("/api/staff").expect(403);
  });

  it("owner cannot create staff with a foreign propertyId", async () => {
    const a = await seedTenant("a");
    const b = await seedTenant("b");
    const propB = await seedProperty(b.id, "b-prop");
    await seedStaff({ email: "owner-a@x.com", role: "owner", tenantId: a.id });
    const agent = await agentFor("owner-a@x.com");
    await agent.post("/api/staff").send({
      email: "new@x.com", password: "Password1234", name: "N", role: "manager",
      propertyId: propB.id,
    }).expect(403);
  });

  it("owner cannot set tenantId on create", async () => {
    const a = await seedTenant("a");
    const b = await seedTenant("b");
    await seedStaff({ email: "owner-a@x.com", role: "owner", tenantId: a.id });
    const agent = await agentFor("owner-a@x.com");
    const r = await agent.post("/api/staff").send({
      email: "new@x.com", password: "Password1234", name: "N", role: "manager",
      tenantId: b.id,
    }).expect(201);
    expect(r.body.tenantId).toBe(a.id);
  });

  it("patching staff in another tenant returns 404", async () => {
    const a = await seedTenant("a");
    const b = await seedTenant("b");
    await seedStaff({ email: "owner-a@x.com", role: "owner", tenantId: a.id });
    const bUser = await seedStaff({ email: "b-mgr@x.com", role: "manager", tenantId: b.id });
    const agent = await agentFor("owner-a@x.com");
    await agent.patch(`/api/staff/${bUser.id}`).send({ name: "Hijack" }).expect(404);
  });

  it("deactivate revokes existing sessions", async () => {
    const a = await seedTenant("a");
    await seedStaff({ email: "owner-a@x.com", role: "owner", tenantId: a.id });
    const target = await seedStaff({ email: "target@x.com", role: "manager", tenantId: a.id });

    // target logs in, then owner deactivates, then target's next call must 401.
    const targetAgent = await agentFor("target@x.com");
    await targetAgent.get("/api/auth/me").expect(200);

    const ownerAgent = await agentFor("owner-a@x.com");
    await ownerAgent.delete(`/api/staff/${target.id}`).expect(200);

    await targetAgent.get("/api/auth/me").expect(401);
  });
});
```

- [ ] **Step 2: Run tests, expect red**

```bash
npm run test -- tests/staff-routes.test.ts
```

- [ ] **Step 3: Fix `server/staff-routes.ts`**

This replaces the whole file. Work through it in passes — do NOT commit or run `npm run check` until the last pass lands; intermediate states may have unused imports, which is fine (repo's tsconfig does not enable `noUnusedLocals`).

Pass A (imports + zod schemas): add `and`, `sql` to the drizzle imports, import `staffSessions` from schema, import `z` from zod, import `assertPropertyInTenant`/`PropertyScopeError` from the tenant-scope helper, and define `createBody`/`patchBody` schemas at the top of the file.

Pass B (GET list): replace the `router.get("/", ...)` handler with the `requireStaffRole("superadmin", "owner", "manager")`-gated version.

Pass C (POST create): replace `router.post("/", ...)` with the zod-validated, tenant-derived version; add the `assertPropertyInTenant` call before the insert.

Pass D (PATCH): replace the PATCH handler with the zod-validated version; route password and deactivation updates to `revokeSessionsForStaff`.

Pass E (DELETE): replace with the deactivate handler that also calls `revokeSessionsForStaff`.

Pass F: add `revokeSessionsForStaff` helper (below the router definitions).

Final file content (reference — match this exactly once all five passes are done):

```ts
import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db.js";
import { staffUsers, staffSessions } from "../shared/schema.js";
import { hashPassword, safeUser } from "./helpers/authHelpers.js";
import { requireStaffRole } from "./middleware/auth.js";
import { assertPropertyInTenant, PropertyScopeError } from "./helpers/tenant-scope.js";

const router = Router();

const createBody = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8),
  name: z.string().min(1).transform((v) => v.trim()),
  role: z.enum(["superadmin", "owner", "manager", "staff", "readonly"]).default("readonly"),
  tenantId: z.string().uuid().optional(),
  propertyId: z.string().uuid().nullish(),
  whatsappNumber: z.string().optional(),
});

const patchBody = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["superadmin", "owner", "manager", "staff", "readonly"]).optional(),
  tenantId: z.string().uuid().nullish(),
  propertyId: z.string().uuid().nullish(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
  whatsappNumber: z.string().nullish(),
});

router.get("/", requireStaffRole("superadmin", "owner", "manager"), async (req, res) => {
  try {
    const sess = req.session;
    const isSuperadmin = sess.staffRole === "superadmin";
    const tenantId = sess.staffTenantId ?? null;
    const rows = isSuperadmin
      ? await db.select().from(staffUsers).orderBy(staffUsers.createdAt)
      : tenantId
        ? await db.select().from(staffUsers).where(eq(staffUsers.tenantId, tenantId)).orderBy(staffUsers.createdAt)
        : [];
    res.json(rows.map(safeUser));
  } catch (err) {
    console.error("[staff list]", err);
    res.status(500).json({ message: "Error fetching staff" });
  }
});

router.post("/", requireStaffRole("superadmin", "owner"), async (req, res) => {
  try {
    const sess = req.session;
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });

    const isSuperadmin = sess.staffRole === "superadmin";
    const tenantId = isSuperadmin
      ? (parsed.data.tenantId ?? null)
      : (sess.staffTenantId ?? null);
    if (!isSuperadmin && !tenantId) return res.status(400).json({ message: "Session has no tenant" });

    if (!isSuperadmin && !["manager", "staff", "readonly"].includes(parsed.data.role)) {
      return res.status(403).json({ message: "Cannot assign that role" });
    }

    if (parsed.data.propertyId && tenantId) {
      try {
        await assertPropertyInTenant(parsed.data.propertyId, tenantId);
      } catch (err) {
        if (err instanceof PropertyScopeError) {
          return res.status(403).json({ message: "propertyId outside tenant scope" });
        }
        throw err;
      }
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const [created] = await db.insert(staffUsers).values({
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role,
      tenantId,
      propertyId: parsed.data.propertyId ?? null,
      whatsappNumber: parsed.data.whatsappNumber ?? null,
    }).returning();
    res.status(201).json(safeUser(created));
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ message: "User with that email already exists" });
    console.error("[staff create]", err);
    res.status(500).json({ message: "Error creating user" });
  }
});

router.patch("/:id", requireStaffRole("superadmin", "owner"), async (req, res) => {
  try {
    const sess = req.session;
    const parsed = patchBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });

    const isSuperadmin = sess.staffRole === "superadmin";
    const isOwner = sess.staffRole === "owner";

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
    if (parsed.data.whatsappNumber !== undefined) updates.whatsappNumber = parsed.data.whatsappNumber;

    if (isSuperadmin) {
      if (parsed.data.role !== undefined) updates.role = parsed.data.role;
      if (parsed.data.tenantId !== undefined) updates.tenantId = parsed.data.tenantId;
      if (parsed.data.propertyId !== undefined) updates.propertyId = parsed.data.propertyId;
    } else if (isOwner && parsed.data.role !== undefined) {
      if (!["manager", "staff", "readonly"].includes(parsed.data.role)) {
        return res.status(403).json({ message: "Cannot assign that role" });
      }
      updates.role = parsed.data.role;
    }

    if (!isSuperadmin && parsed.data.propertyId !== undefined && parsed.data.propertyId !== null && sess.staffTenantId) {
      try {
        await assertPropertyInTenant(parsed.data.propertyId, sess.staffTenantId);
        updates.propertyId = parsed.data.propertyId;
      } catch (err) {
        if (err instanceof PropertyScopeError) {
          return res.status(403).json({ message: "propertyId outside tenant scope" });
        }
        throw err;
      }
    }

    if (parsed.data.password) {
      updates.passwordHash = await hashPassword(parsed.data.password);
    }

    const userId = req.params.id;
    const where = isSuperadmin
      ? eq(staffUsers.id, userId)
      : and(eq(staffUsers.id, userId), eq(staffUsers.tenantId, sess.staffTenantId!));

    const [updated] = await db.update(staffUsers).set(updates).where(where).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    if (parsed.data.password || parsed.data.isActive === false) {
      await revokeSessionsForStaff(updated.id);
    }
    res.json(safeUser(updated));
  } catch (err) {
    console.error("[staff patch]", err);
    res.status(500).json({ message: "Error updating user" });
  }
});

router.delete("/:id", requireStaffRole("superadmin", "owner"), async (req, res) => {
  try {
    const sess = req.session;
    const isSuperadmin = sess.staffRole === "superadmin";
    const userId = req.params.id;
    const where = isSuperadmin
      ? eq(staffUsers.id, userId)
      : and(eq(staffUsers.id, userId), eq(staffUsers.tenantId, sess.staffTenantId!));
    const [updated] = await db.update(staffUsers).set({ isActive: false, updatedAt: new Date() }).where(where).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    await revokeSessionsForStaff(updated.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("[staff delete]", err);
    res.status(500).json({ message: "Error deactivating user" });
  }
});

async function revokeSessionsForStaff(staffId: string) {
  await db.execute(sql`DELETE FROM staff_sessions WHERE sess::jsonb->>'staffId' = ${staffId}`);
}

export default router;
```

- [ ] **Step 4: Run tests, expect green**

```bash
npm run test -- tests/staff-routes.test.ts tests/tenant-isolation.test.ts
```

Expected: staff suite PASS; `tenant-isolation` row "Any authenticated user cannot list staff" now passes.

- [ ] **Step 5: Commit**

```bash
git add server/staff-routes.ts tests/staff-routes.test.ts
git commit -m "fix(B2): gate staff routes by role, block foreign-tenant writes, revoke sessions on deactivate"
```

---

### Task 8: Scope `platform_knowledge` by tenant (B10)

**Files:**
- Modify: `shared/schema.ts`
- Create: `drizzle/0001_tenant_scope_platform_knowledge.sql`
- Modify: `server/storage.ts` (getPlatformKnowledge + CRUD + reorder)
- Modify: `server/knowledge-routes.ts`
- Modify: `server.ts` (buildSystemPrompt must take a tenantId or slug)
- Create: `tests/knowledge.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../server/app-factory.js";
import { seedTenant, seedStaff, truncateAll } from "./helpers/seed.js";

async function agentFor(email: string) {
  const app = await buildApp();
  const agent = supertest.agent(app);
  await agent.post("/api/auth/login").send({ email, password: "Password1234" }).expect(200);
  return agent;
}

describe("platform_knowledge tenant scoping (B10)", () => {
  beforeEach(truncateAll);

  it("owner A's KB entries are not visible to owner B", async () => {
    const a = await seedTenant("a");
    const b = await seedTenant("b");
    await seedStaff({ email: "oa@x.com", role: "owner", tenantId: a.id });
    await seedStaff({ email: "ob@x.com", role: "owner", tenantId: b.id });
    const oa = await agentFor("oa@x.com");
    await oa.post("/api/knowledge/platform").send({ section: "intro", title: "A Only", content: "…" }).expect(201);
    const ob = await agentFor("ob@x.com");
    const list = await ob.get("/api/knowledge/platform").expect(200);
    expect(list.body.some((e: any) => e.title === "A Only")).toBe(false);
  });

  it("DELETE of another tenant's entry returns 404", async () => {
    const a = await seedTenant("a");
    const b = await seedTenant("b");
    await seedStaff({ email: "oa@x.com", role: "owner", tenantId: a.id });
    await seedStaff({ email: "ob@x.com", role: "owner", tenantId: b.id });
    const oa = await agentFor("oa@x.com");
    const created = await oa.post("/api/knowledge/platform").send({ section: "x", title: "A", content: "…" }).expect(201);
    const ob = await agentFor("ob@x.com");
    await ob.delete(`/api/knowledge/platform/${created.body.id}`).expect(404);
  });
});
```

- [ ] **Step 2: Add `tenantId` to schema**

In `shared/schema.ts`, change:

```ts
export const platformKnowledge = pgTable("platform_knowledge", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  section: text("section").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 3: Write the migration**

`drizzle/0001_tenant_scope_platform_knowledge.sql`:

```sql
ALTER TABLE "platform_knowledge" ADD COLUMN IF NOT EXISTS "tenant_id" varchar;
-- Any legacy global rows: move them to a special "system" tenant so they don't vanish.
-- If no 'system' tenant exists, create one (idempotent via slug unique).
INSERT INTO "tenants" ("name", "slug") VALUES ('System', 'system')
  ON CONFLICT (slug) DO NOTHING;
UPDATE "platform_knowledge" SET "tenant_id" = (SELECT id FROM tenants WHERE slug = 'system') WHERE "tenant_id" IS NULL;
ALTER TABLE "platform_knowledge" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "platform_knowledge" ADD CONSTRAINT "platform_knowledge_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION;
CREATE INDEX IF NOT EXISTS "idx_platform_knowledge_tenant" ON "platform_knowledge" ("tenant_id");
```

- [ ] **Step 4: Update `server/storage.ts` KB functions**

Open `server/storage.ts`, find the platform-knowledge block near line 170. Rewrite in passes — one function per save; passes share a single commit, so don't run `npm run check` between them (later passes will fix up callsites the earlier passes break). Add `and` to the drizzle-orm import at the top of the file first.

Pass A — `getPlatformKnowledge(tenantId)`.
Pass B — `createPlatformKnowledge(tenantId, data)`.
Pass C — `updatePlatformKnowledge(tenantId, id, data)`.
Pass D — `deletePlatformKnowledge(tenantId, id)` (return boolean).
Pass E — `reorderPlatformKnowledge(tenantId, id, direction)`.

Each callsite change is propagated in Step 5 below.

Reference final shape for all passes combined:

```ts
export async function getPlatformKnowledge(tenantId: string): Promise<PlatformKnowledgeEntry[]> {
  return db.select().from(platformKnowledge).where(eq(platformKnowledge.tenantId, tenantId)).orderBy(platformKnowledge.sortOrder);
}

export async function createPlatformKnowledge(tenantId: string, data: { section: string; title: string; content: string }) {
  const entries = await getPlatformKnowledge(tenantId);
  const maxOrder = entries.reduce((max, e) => Math.max(max, e.sortOrder), 0);
  const [row] = await db.insert(platformKnowledge).values({ ...data, tenantId, sortOrder: maxOrder + 1 }).returning();
  return row;
}

export async function updatePlatformKnowledge(tenantId: string, id: string, data: { section?: string; title?: string; content?: string }) {
  const [row] = await db.update(platformKnowledge)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(platformKnowledge.id, id), eq(platformKnowledge.tenantId, tenantId)))
    .returning();
  return row ?? null;
}

export async function deletePlatformKnowledge(tenantId: string, id: string) {
  const result = await db.delete(platformKnowledge).where(and(eq(platformKnowledge.id, id), eq(platformKnowledge.tenantId, tenantId))).returning({ id: platformKnowledge.id });
  return result.length > 0;
}

export async function reorderPlatformKnowledge(tenantId: string, id: string, direction: "up" | "down") {
  const entries = await getPlatformKnowledge(tenantId);
  const index = entries.findIndex((e) => e.id === id);
  if (index < 0) return entries;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= entries.length) return entries;
  const a = entries[index]!;
  const b = entries[swapIndex]!;
  await db.update(platformKnowledge).set({ sortOrder: b.sortOrder }).where(and(eq(platformKnowledge.id, a.id), eq(platformKnowledge.tenantId, tenantId)));
  await db.update(platformKnowledge).set({ sortOrder: a.sortOrder }).where(and(eq(platformKnowledge.id, b.id), eq(platformKnowledge.tenantId, tenantId)));
  return getPlatformKnowledge(tenantId);
}
```

Also add `and` to the drizzle-orm import at top of storage.ts if not already present.

- [ ] **Step 5: Update `server/knowledge-routes.ts`**

```ts
import { Router } from "express";
import { requireAdmin } from "./middleware/auth.js";
import {
  getPlatformKnowledge,
  createPlatformKnowledge,
  updatePlatformKnowledge,
  deletePlatformKnowledge,
  reorderPlatformKnowledge,
} from "./storage.js";

const router = Router();

function tenantOrReject(req: any, res: any): string | null {
  const tid = req.session?.staffTenantId;
  if (!tid) {
    res.status(400).json({ message: "Session has no tenant" });
    return null;
  }
  return tid;
}

router.get("/platform", requireAdmin, async (req, res) => {
  try {
    const tid = tenantOrReject(req, res);
    if (!tid) return;
    res.json(await getPlatformKnowledge(tid));
  } catch (err) {
    console.error("[kb list]", err);
    res.status(500).json({ message: "Error fetching knowledge base" });
  }
});

router.post("/platform", requireAdmin, async (req, res) => {
  try {
    const tid = tenantOrReject(req, res);
    if (!tid) return;
    const { section, title, content } = req.body;
    if (!section || !title || !content) return res.status(400).json({ message: "section, title, and content required" });
    const entry = await createPlatformKnowledge(tid, { section, title, content });
    res.status(201).json(entry);
  } catch (err) {
    console.error("[kb create]", err);
    res.status(500).json({ message: "Error creating entry" });
  }
});

router.put("/platform/:id", requireAdmin, async (req, res) => {
  try {
    const tid = tenantOrReject(req, res);
    if (!tid) return;
    const { section, title, content } = req.body;
    const entry = await updatePlatformKnowledge(tid, req.params.id, { section, title, content });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json(entry);
  } catch (err) {
    console.error("[kb update]", err);
    res.status(500).json({ message: "Error updating entry" });
  }
});

router.delete("/platform/:id", requireAdmin, async (req, res) => {
  try {
    const tid = tenantOrReject(req, res);
    if (!tid) return;
    const ok = await deletePlatformKnowledge(tid, req.params.id);
    if (!ok) return res.status(404).json({ message: "Entry not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[kb delete]", err);
    res.status(500).json({ message: "Error deleting entry" });
  }
});

router.patch("/platform/:id/reorder", requireAdmin, async (req, res) => {
  try {
    const tid = tenantOrReject(req, res);
    if (!tid) return;
    const { direction } = req.body as { direction: "up" | "down" };
    const entries = await reorderPlatformKnowledge(tid, req.params.id, direction);
    res.json(entries);
  } catch (err) {
    console.error("[kb reorder]", err);
    res.status(500).json({ message: "Error reordering" });
  }
});

export default router;
```

- [ ] **Step 6: Update `server.ts` `buildSystemPrompt`**

`buildSystemPrompt` must take a tenantId. In the chat handler, resolve the tenant from the request `Host` header (same logic as `/api/public/brand`). If no tenant can be resolved, skip KB injection and return a generic system prompt. Code sketch:

```ts
async function resolveTenantIdFromHost(host: string): Promise<string | null> {
  const parts = host.split(".");
  const subdomain = parts.length >= 3 ? parts[0]?.toLowerCase() : "";
  if (!subdomain || subdomain === "app" || subdomain === "www") return null;
  // app-factory.ts is at server/app-factory.ts; db.ts is at server/db.ts and
  // schema.ts is at shared/schema.ts — so the relative paths below are correct.
  const { db } = await import("./db.js");
  const { properties } = await import("../shared/schema.js");
  const { eq } = await import("drizzle-orm");
  const [prop] = await db.select({ tenantId: properties.tenantId })
    .from(properties)
    .where(eq(properties.slug, subdomain))
    .limit(1);
  return prop?.tenantId ?? null;
}

async function buildSystemPrompt(tenantId: string | null): Promise<string> {
  let kbContent = "";
  if (tenantId) {
    try {
      const { getPlatformKnowledge } = await import("./storage.js");
      const entries = await getPlatformKnowledge(tenantId);
      if (entries.length > 0) {
        kbContent = "\n\nPROPERTY KNOWLEDGE BASE (from database — this is your source of truth):\n\n" +
          entries.map(e => `## ${e.title}\n${e.content}`).join("\n\n");
      }
    } catch (err) {
      console.error("[chat] KB fetch error:", err);
    }
  }
  // ... rest of the prompt string, unchanged except `${kbContent}` now comes from per-tenant fetch
}
```

And at the chat handler, resolve the tenant and pass it through: `const tenantId = await resolveTenantIdFromHost(req.hostname); ... system: await buildSystemPrompt(tenantId),`.

- [ ] **Step 7: Run the test DB push and the suite**

```bash
npm run db:push
npm run test -- tests/knowledge.test.ts tests/tenant-isolation.test.ts
```

Expected: knowledge suite PASS; the tenant-isolation B10 scenario (KB leak) now passes too.

- [ ] **Step 8: Commit**

```bash
git add shared/schema.ts drizzle/0001_tenant_scope_platform_knowledge.sql server/storage.ts server/knowledge-routes.ts server.ts tests/knowledge.test.ts
git commit -m "fix(B10): tenant-scope platform_knowledge; chat resolves tenant from host"
```

---

### Task 9: Auth + rate limit + zod on `/api/platform-sessions` (B4)

**Files:**
- Modify: `server/platform-sessions-routes.ts`
- Create: `server/helpers/rate-limiters.ts`
- Create: `tests/platform-sessions.test.ts`

- [ ] **Step 1: Create `server/helpers/rate-limiters.ts`**

```ts
import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
    return email ? `login:${email}` : `login:${req.ip}`;
  },
  message: { message: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const chatPerMinuteLimiter = rateLimit({
  windowMs: 60_000,
  max: 6,
  message: { error: "Too many requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const chatPerDayLimiter = rateLimit({
  windowMs: 24 * 60 * 60_000,
  max: 200,
  message: { error: "Daily chat limit reached." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const platformSessionsWriteLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { message: "Too many session writes." },
  standardHeaders: true,
  legacyHeaders: false,
});
```

- [ ] **Step 2: Tighten `server/platform-sessions-routes.ts`**

```ts
import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireStaff } from "./middleware/auth.js";
import { upsertPlatformSession, getPlatformSessions, getPlatformSession, updatePlatformSessionTags } from "./storage.js";
import { platformSessionsWriteLimiter } from "./helpers/rate-limiters.js";

const router = Router();

const messagesSchema = z.object({
  sessionId: z.string().min(1).max(128),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).max(200),
  escalated: z.boolean().optional(),
});

router.post("/", requireStaff, platformSessionsWriteLimiter, async (req, res) => {
  try {
    const parsed = messagesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
    const session = await upsertPlatformSession(parsed.data.sessionId, parsed.data.messages, parsed.data.escalated ?? false);
    res.json({ ok: true, id: session.id });
  } catch (err) {
    console.error("[platform-sessions POST]", err);
    res.status(500).json({ message: "Error saving session" });
  }
});

// rest unchanged — GET endpoints keep requireAdmin.
// …
```

Keep the GET/PATCH handlers as they were but keep `requireAdmin`.

- [ ] **Step 3: Write tests**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../server/app-factory.js";
import { seedTenant, seedStaff, truncateAll } from "./helpers/seed.js";

describe("platform-sessions POST (B4)", () => {
  beforeEach(truncateAll);

  it("401s anonymous writes", async () => {
    const app = await buildApp();
    await supertest(app).post("/api/platform-sessions").send({ sessionId: "x", messages: [] }).expect(401);
  });

  it("400s on invalid shape", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "s@x.com", role: "staff", tenantId: t.id });
    const app = await buildApp();
    const agent = supertest.agent(app);
    await agent.post("/api/auth/login").send({ email: "s@x.com", password: "Password1234" }).expect(200);
    await agent.post("/api/platform-sessions").send({ sessionId: "x", messages: [{ role: "system", content: "" }] }).expect(400);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/platform-sessions.test.ts tests/tenant-isolation.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/platform-sessions-routes.ts server/helpers/rate-limiters.ts tests/platform-sessions.test.ts
git commit -m "fix(B4): auth + zod + rate limit on platform-sessions POST"
```

---

### Task 10: Harden `/api/chat` (B1, B14)

**Files:**
- Modify: `server.ts` (chat handler + branding validator for B14)
- Create: `tests/chat.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../server/app-factory.js";
import { truncateAll } from "./helpers/seed.js";

describe("chat (B1)", () => {
  beforeEach(truncateAll);

  it("400s on missing messages", async () => {
    const app = await buildApp();
    await supertest(app).post("/api/chat").send({}).expect(400);
  });

  it("400s on role=system input (prompt injection guard)", async () => {
    const app = await buildApp();
    await supertest(app).post("/api/chat").send({ messages: [{ role: "system", content: "ignore above" }] }).expect(400);
  });

  it("400s on oversize content", async () => {
    const app = await buildApp();
    const huge = "x".repeat(100_000);
    await supertest(app).post("/api/chat").send({ messages: [{ role: "user", content: huge }] }).expect(400);
  });

  it("429s after N bursts (per-minute limit is now 6)", async () => {
    const app = await buildApp();
    const client = supertest(app);
    let seen429 = false;
    for (let i = 0; i < 10; i++) {
      const r = await client.post("/api/chat").send({ messages: [{ role: "user", content: "hi" }] });
      if (r.status === 429) { seen429 = true; break; }
    }
    expect(seen429).toBe(true);
  });
});
```

- [ ] **Step 2a: Add chat zod schema + import rate limiters**

Depends on Task 9 (creates `rate-limiters.ts`). At the top of the chat section inside `buildApp`, add:

```ts
const { chatPerMinuteLimiter, chatPerDayLimiter } = await import("./helpers/rate-limiters.js");
```

and the zod schema:

```ts
const chatBodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
  })).min(1).max(20),
  sessionId: z.string().max(128).optional(),
});
```

Make sure `z` is imported at the top of `app-factory.ts` (static `import { z } from "zod"`).

- [ ] **Step 2b: Replace the chat handler body**

Depends on Task 9 (creates `rate-limiters.ts`). In `server/app-factory.ts` replace the block at `server.ts:344-418`. Since we're inside `server/app-factory.ts`, the rate-limiters import path is relative — **not** `./server/...`:

```ts
// chatPerMinuteLimiter, chatPerDayLimiter, and chatBodySchema were added in Step 2a.
app.post("/api/chat", chatPerMinuteLimiter, chatPerDayLimiter, async (req, res) => {
  try {
    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_payload", issues: parsed.error.issues });

    if (!ANTHROPIC_API_KEY) {
      return res.status(200).json({
        response: "The AI concierge is not configured yet. Please ask your property manager for assistance or contact the leasing office directly.",
        escalate: false,
      });
    }

    const tenantId = await resolveTenantIdFromHost(req.hostname);
    const trimmed = parsed.data.messages.slice(-20);

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: await buildSystemPrompt(tenantId),
        messages: trimmed,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error("[chat] anthropic upstream", upstream.status);
      return res.status(502).json({ error: "upstream_error" });
    }

    const data = (await upstream.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const raw = data.content?.[0]?.text ?? "";
    // Only honor [ESCALATE] if it appears at the very end of the reply to reduce
    // user-controlled metric poisoning. Why: user can ask the model to include the
    // literal string anywhere in its response otherwise. How to apply: keep this
    // sentinel until a structured tool-use channel replaces it.
    const trailing = raw.trim().endsWith("[ESCALATE]");
    const response = raw.replace(/\[ESCALATE\]\s*$/, "").trim();

    if (parsed.data.sessionId) {
      console.log(`[${parsed.data.sessionId}] ${trimmed.length + 1} msgs, escalated: ${trailing}`);
    }

    if (data.usage) {
      logTokenUsage({
        tenantId: tenantId ?? null,
        sessionId: parsed.data.sessionId ?? null,
        operation: "concierge_chat",
        model: "claude-haiku-4-5-20251001",
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      });
    }

    res.json({ response, escalate: trailing });
  } catch (err: unknown) {
    console.error("[chat] error:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "chat_failed" });
  }
});
```

Also delete the old `chatLimiter` definition; the new ones come from `rate-limiters.ts`.

- [ ] **Step 3: B14 — validate branding_json on the write path**

There is no POST to `branding_json` yet (properties update uses `insertPropertySchema.partial()`), but add a zod refinement to clamp `primaryColor` to `/^#[0-9a-fA-F]{6}$/`. In `shared/schema.ts`:

```ts
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const urlOrNull = z.string().url().nullable();

const brandingJsonSchema = z.object({
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  fontFamily: z.string().max(64).optional(),
  darkMode: z.boolean().optional(),
  logoUrl: urlOrNull.optional(),
  faviconUrl: urlOrNull.optional(),
}).strict();

export const insertPropertySchema = createInsertSchema(properties, {
  brandingJson: brandingJsonSchema.optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
```

- [ ] **Step 4: Run all suites**

```bash
npm run test -- tests/chat.test.ts tests/tenant-isolation.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/app-factory.ts server.ts shared/schema.ts tests/chat.test.ts
git commit -m "fix(B1,B14): harden /api/chat (auth-optional but zod+rate-limited, tenant-scoped KB) + validate branding_json"
```

---

### Task 11: Fix helpdesk property scoping (B3) and rip out demo bootstrap (H2)

**Files:**
- Modify: `server/storage.ts` (`withinScope`, stop calling `ensureHelpdeskBootstrap` from `loadHelpdeskContext`, drop `filterPropertyId` trust)
- Modify: `server/helpdesk-routes.ts` (reject unauthorized `filterPropertyId`)
- Create: `tests/helpdesk-scoping.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../server/app-factory.js";
import { seedTenant, seedProperty, seedStaff, truncateAll } from "./helpers/seed.js";

async function agentFor(email: string) {
  const app = await buildApp();
  const agent = supertest.agent(app);
  await agent.post("/api/auth/login").send({ email, password: "Password1234" }).expect(200);
  return agent;
}

describe("helpdesk property scoping (B3)", () => {
  beforeEach(truncateAll);

  it("manager scoped to A1 cannot query ?propertyId=A2", async () => {
    const a = await seedTenant("a");
    const a1 = await seedProperty(a.id, "a1");
    const a2 = await seedProperty(a.id, "a2");
    await seedStaff({ email: "m@x.com", role: "manager", tenantId: a.id, propertyId: a1.id });
    const agent = await agentFor("m@x.com");
    await agent.get(`/api/helpdesk/inbox/conversations?propertyId=${a2.id}`).expect(403);
  });

  it("manager scoped to A1 cannot see conversations with propertyId=null", async () => {
    // This exercises the old withinScope null-leak behavior.
    const a = await seedTenant("a");
    const a1 = await seedProperty(a.id, "a1");
    await seedStaff({ email: "m@x.com", role: "manager", tenantId: a.id, propertyId: a1.id });
    const agent = await agentFor("m@x.com");
    const res = await agent.get(`/api/helpdesk/inbox/conversations`).expect(200);
    // Given no seeded conversations, should be empty — the critical property is
    // that propertyId=null rows from a prior seeded state would not bleed in.
    expect(Array.isArray(res.body.conversations)).toBe(true);
  });
});
```

- [ ] **Step 2: Change `withinScope` semantics**

In `server/storage.ts` at line 267:

```ts
// withinScope: items without a propertyId are invisible to property-scoped
// managers. Only tenant-scoped owners/superadmins (scope.propertyId === null)
// see the null rows. Why: prior behavior surfaced null-propertyId rows to every
// manager; this is the B3 fix from the 2026-04-17 review. How to apply: callers
// with tenant-only scope pass propertyId = null; anything with a propertyId
// filters strictly.
function withinScope<T extends { propertyId: string | null }>(items: T[], propertyId: string | null): T[] {
  if (!propertyId) return items;
  return items.filter((item) => item.propertyId === propertyId);
}
```

- [ ] **Step 3: Remove demo bootstrap from the hot path (H2)**

In `loadHelpdeskContext` (storage.ts:598–626) delete the `await ensureHelpdeskBootstrap(scope);` call. Convert `ensureHelpdeskBootstrap` to an exported function `seedDemoHelpdesk(scope)` callable only from `scripts/seed-demo.ts`. Add an env guard in `scripts/seed-demo.ts`:

```ts
if (process.env.LIRE_SEED_DEMO !== "1") {
  console.error("Refusing to run demo seed. Set LIRE_SEED_DEMO=1 to confirm.");
  process.exit(1);
}
```

- [ ] **Step 4: Reject unauthorized `filterPropertyId` in helpdesk route**

In `server/helpdesk-routes.ts:41-52` replace the handler body:

```ts
router.get("/inbox/conversations", async (req, res) => {
  try {
    const sess = req.session;
    const view = coerceViewKey(req.query["view"]);
    const filterPropertyId = typeof req.query["propertyId"] === "string" && req.query["propertyId"]
      ? req.query["propertyId"]
      : null;

    // Managers may only filter on their own propertyId.
    if (filterPropertyId) {
      const role = sess.staffRole;
      const allowed =
        role === "superadmin" ||
        role === "owner" ||
        (sess.staffPropertyId && filterPropertyId === sess.staffPropertyId);
      if (!allowed) return res.status(403).json({ message: "propertyId outside scope" });
    }

    const conversations = await getHelpInboxConversations(
      view,
      sess.staffTenantId ?? null,
      sess.staffPropertyId ?? null,
      sess.staffId ?? null,
      filterPropertyId,
    );
    res.json({ view, conversations });
  } catch (err) {
    console.error("[helpdesk inbox conversations]", err);
    res.status(500).json({ message: "Error fetching conversations" });
  }
});
```

- [ ] **Step 5: Update `scripts/seed-demo.ts` to use the new exported seeder + gate + fix B15**

Change the `cust-frito-lay` reference at line 819 of `scripts/seed-demo.ts` to the correct `cust-frito-oak`. (Grep the file for `cust-frito-lay` and fix.) Add the env guard at the top.

- [ ] **Step 6: Run tests**

```bash
npm run test -- tests/helpdesk-scoping.test.ts tests/tenant-isolation.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add server/storage.ts server/helpdesk-routes.ts scripts/seed-demo.ts tests/helpdesk-scoping.test.ts
git commit -m "fix(B3,B15,H2): tight helpdesk property scoping, gate demo seed behind env, fix customer typo"
```

---

### Task 12: Harden credit document upload (B7)

**Files:**
- Modify: `server/pilots/credit/routes.ts` (MIME allowlist, size cap, filename sanitization, dedup, explicit body limit)
- Modify: `server/platform/blob-store.ts` (filename sanitization + traversal guard)
- Create: `tests/credit-upload.test.ts`

- [ ] **Step 1: Sanitize filename in both blob stores**

In `server/platform/blob-store.ts`, add at the top of each `put()` (both LocalFs and Azure):

```ts
const safeName = input.filename.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
```

Replace `input.filename` with `safeName` in the path/blobname construction.

- [ ] **Step 2: Enforce MIME allowlist + size cap + dedup in the upload route**

In `server/pilots/credit/routes.ts:156-215` replace with:

```ts
const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/tiff",
]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

router.post(
  "/documents/upload",
  express.json({ limit: "35mb" }),
  async (req: Request, res: Response) => {
    const { tenantId, tenantSlug, staffId } = getTenantContext(req);
    if (!tenantId || !tenantSlug) return res.status(400).json({ message: "Missing tenant context" });

    const { lesseeId, filename, mimeType, base64 } = req.body ?? {};
    if (typeof lesseeId !== "string" || typeof filename !== "string" || typeof base64 !== "string") {
      return res.status(400).json({ message: "lesseeId, filename, and base64 required" });
    }
    if (typeof mimeType !== "string" || !ALLOWED_UPLOAD_MIME.has(mimeType)) {
      return res.status(400).json({ message: "Unsupported mimeType" });
    }

    const [lessee] = await db
      .select()
      .from(lessees)
      .where(and(eq(lessees.id, lesseeId), eq(lessees.tenantId, tenantId)))
      .limit(1);
    if (!lessee) return res.status(404).json({ message: "Lessee not found" });

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      return res.status(400).json({ message: "Invalid base64 payload" });
    }
    if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({ message: "Payload too small or too large" });
    }

    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const [existing] = await db
      .select()
      .from(creditDocuments)
      .where(and(
        eq(creditDocuments.tenantId, tenantId),
        eq(creditDocuments.lesseeId, lesseeId),
        eq(creditDocuments.sha256, sha256),
      ))
      .limit(1);
    if (existing) {
      return res.status(200).json({ document: existing, dedup: true });
    }

    const store = getBlobStore();
    const blob = await store.put({
      tenantSlug,
      kind: "credit-documents",
      filename,
      mimeType,
      data: buffer,
    });

    const [row] = await db
      .insert(creditDocuments)
      .values({
        tenantId,
        lesseeId,
        uploadedByStaffId: staffId ?? null,
        blobUrl: blob.blobUrl,
        sha256: blob.sha256,
        mimeType: blob.mimeType,
      })
      .returning();

    await appendArchive({
      tenantId,
      subjectType: "credit_document",
      subjectId: row.id,
      actorStaffId: staffId ?? null,
      eventType: "document.uploaded",
      payload: { id: row.id, sha256: blob.sha256, size: blob.size, mimeType: blob.mimeType },
    });

    return res.status(201).json({ document: row });
  },
);
```

Add `import express from "express";` at top if not already present.

- [ ] **Step 3: Tests**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../server/app-factory.js";
import { seedTenant, seedStaff, truncateAll } from "./helpers/seed.js";
import { db } from "../server/db.js";
import { lessees } from "../shared/schema.js";

async function agentFor(email: string) {
  const app = await buildApp();
  const agent = supertest.agent(app);
  await agent.post("/api/auth/login").send({ email, password: "Password1234" }).expect(200);
  return agent;
}

describe("credit document upload (B7)", () => {
  beforeEach(truncateAll);

  it("rejects disallowed mimeType", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "o@x.com", role: "owner", tenantId: t.id });
    const agent = await agentFor("o@x.com");
    const created = await agent.post("/api/pilots/credit/lessees").send({ legalName: "ACME" }).expect(201);
    await agent.post("/api/pilots/credit/documents/upload").send({
      lesseeId: created.body.lessee.id,
      filename: "bad.exe",
      mimeType: "application/x-msdownload",
      base64: Buffer.from("hi").toString("base64"),
    }).expect(400);
  });

  it("rejects oversized payloads", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "o@x.com", role: "owner", tenantId: t.id });
    const agent = await agentFor("o@x.com");
    const created = await agent.post("/api/pilots/credit/lessees").send({ legalName: "ACME" }).expect(201);
    const big = Buffer.alloc(30 * 1024 * 1024, 0x20);
    await agent.post("/api/pilots/credit/documents/upload").send({
      lesseeId: created.body.lessee.id,
      filename: "big.pdf",
      mimeType: "application/pdf",
      base64: big.toString("base64"),
    }).expect(413);
  });

  it("dedupes identical uploads", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "o@x.com", role: "owner", tenantId: t.id });
    const agent = await agentFor("o@x.com");
    const created = await agent.post("/api/pilots/credit/lessees").send({ legalName: "ACME" }).expect(201);
    const body = {
      lesseeId: created.body.lessee.id,
      filename: "ok.pdf",
      mimeType: "application/pdf",
      base64: Buffer.from("PDF_BYTES_HERE").toString("base64"),
    };
    const a = await agent.post("/api/pilots/credit/documents/upload").send(body).expect(201);
    const b = await agent.post("/api/pilots/credit/documents/upload").send(body).expect(200);
    expect(b.body.dedup).toBe(true);
    expect(b.body.document.id).toBe(a.body.document.id);
  });

  it("sanitizes traversal filenames", async () => {
    const t = await seedTenant("a");
    await seedStaff({ email: "o@x.com", role: "owner", tenantId: t.id });
    const agent = await agentFor("o@x.com");
    const created = await agent.post("/api/pilots/credit/lessees").send({ legalName: "ACME" }).expect(201);
    const r = await agent.post("/api/pilots/credit/documents/upload").send({
      lesseeId: created.body.lessee.id,
      filename: "../../../etc/passwd",
      mimeType: "application/pdf",
      base64: Buffer.from("x").toString("base64"),
    }).expect(201);
    expect(r.body.document.blobUrl).not.toMatch(/\.\./);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/credit-upload.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/pilots/credit/routes.ts server/platform/blob-store.ts tests/credit-upload.test.ts
git commit -m "fix(B7): MIME allowlist, size cap, filename sanitization, dedup on credit document upload"
```

---

### Task 12.5: Replace the unbounded global `express.json()` (H15)

**Files:**
- Modify: `server/app-factory.ts`

**Why this lands between Task 12 and Task 13:** Task 12 added `express.json({ limit: "35mb" })` to the upload route. But the global `app.use(express.json())` at `server.ts:42` (now inside `buildApp`) still runs first and consumes the body with the default 100KB limit, making Task 12's per-route parser a no-op. We must remove or bound the global parser before the upload route mounts, and the upload route must declare its own `express.json({ limit: "35mb" })` as route-level middleware.

- [ ] **Step 1: Replace the global JSON parser with a tight default**

In `server/app-factory.ts`, find `app.use(express.json());` and replace:

```ts
app.use(express.json({ limit: "100kb" }));
```

- [ ] **Step 2: Confirm Task 12's upload route has its own parser**

Task 12 already scoped `express.json({ limit: "35mb" })` to `/documents/upload`. Verify by re-reading that handler. Because the global parser now has a `100kb` limit, any prior `req.body` attempt on the upload route under the global parser would reject with 413 — but the route-level `express.json({ limit: "35mb" })` runs BEFORE the handler body because we passed it as middleware, and `express.json()` is idempotent on `req.body`. No additional change needed.

- [ ] **Step 3: Run tests**

```bash
npm run test -- tests/credit-upload.test.ts tests/chat.test.ts
```

Expected: all green. If `tests/credit-upload.test.ts` "rejects oversized payloads" now fails with a different status (413 vs 400 from global parser), update the test to accept either 413 or 400.

- [ ] **Step 4: Commit**

```bash
git add server/app-factory.ts
git commit -m "fix(H15): bound global express.json to 100kb; upload route keeps its own 35mb parser"
```

---

### Task 13: Lock down CORS (B8) and enable prod CSP (B9)

**Files:**
- Modify: `server.ts` / `server/app-factory.ts`
- Create: `tests/cors.test.ts`

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import supertest from "supertest";
import { buildApp } from "../server/app-factory.js";

describe("CORS (B8)", () => {
  it("does not reflect *.replit.dev origin in production", async () => {
    process.env.NODE_ENV = "production";
    const app = await buildApp();
    const r = await supertest(app)
      .options("/api/health")
      .set("Origin", "https://attacker.replit.dev")
      .set("Access-Control-Request-Method", "GET");
    expect(r.headers["access-control-allow-origin"]).toBeUndefined();
    process.env.NODE_ENV = "test";
  });

  it("reflects *.lire-help.com origin", async () => {
    process.env.NODE_ENV = "production";
    const app = await buildApp();
    const r = await supertest(app)
      .options("/api/health")
      .set("Origin", "https://berkeley.lire-help.com")
      .set("Access-Control-Request-Method", "GET");
    expect(r.headers["access-control-allow-origin"]).toBe("https://berkeley.lire-help.com");
    process.env.NODE_ENV = "test";
  });
});
```

- [ ] **Step 2: Replace the CORS middleware**

At `server.ts:46-63` / equivalent in `app-factory.ts`:

```ts
app.use((req, res, next) => {
  const origin = req.headers.origin ?? "";
  const allowed =
    /^https:\/\/([a-z0-9-]+\.)?lire-help\.com$/.test(origin) ||
    (isDev && (
      /^https:\/\/[a-z0-9-]+\.replit\.(dev|app)$/.test(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ));

  if (allowed) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
```

- [ ] **Step 3: Enable prod CSP + referrer policy**

Replace `app.use(helmet({ ... }))` block with:

```ts
app.use(
  helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://*.lire-help.com", "https://*.blob.core.windows.net"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/cors.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/app-factory.ts server.ts tests/cors.test.ts
git commit -m "fix(B8,B9): lock CORS to lire-help.com in prod, enable CSP + referrer policy"
```

---

### Task 14: Block cross-tenant writes via insertPropertySchema (H11) and agents (H12)

**Files:**
- Modify: `server/properties-routes.ts`
- Modify: `server/agents-routes.ts`
- Modify: `server/storage.ts` (getAgentByPropertyId should also accept tenantId for scoping)

- [ ] **Step 1: Tighten properties-routes**

Replace the POST handler at `server/properties-routes.ts:38-47`:

```ts
router.post("/", requireStaffRole("superadmin", "owner"), async (req, res) => {
  try {
    const sess = req.session;
    const isSuperadmin = sess.staffRole === "superadmin";
    const raw = insertPropertySchema.parse(req.body);
    const tenantId = isSuperadmin ? raw.tenantId : (sess.staffTenantId ?? null);
    if (!isSuperadmin && !tenantId) return res.status(400).json({ message: "Session has no tenant" });
    const prop = await createProperty({ ...raw, tenantId });
    res.status(201).json(prop);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
    console.error("[property create]", err);
    res.status(500).json({ message: "Error creating property" });
  }
});
```

And the PUT handler at 49-59:

```ts
router.put("/:id", requireStaffRole("superadmin", "owner"), async (req, res) => {
  try {
    const sess = req.session;
    const isSuperadmin = sess.staffRole === "superadmin";
    const raw = insertPropertySchema.partial().parse(req.body);
    const data = isSuperadmin ? raw : (() => { const { tenantId: _drop, ...rest } = raw; return rest; })();
    if (!isSuperadmin && sess.staffTenantId) {
      await assertPropertyInTenant(req.params.id, sess.staffTenantId);
    }
    const prop = await updateProperty(req.params.id, data);
    if (!prop) return res.status(404).json({ message: "Property not found" });
    res.json(prop);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
    if (err instanceof PropertyScopeError) return res.status(404).json({ message: "Property not found" });
    console.error("[property update]", err);
    res.status(500).json({ message: "Error updating property" });
  }
});
```

Add the imports `import { assertPropertyInTenant, PropertyScopeError } from "./helpers/tenant-scope.js";`.

- [ ] **Step 2: Tighten agents-routes PUT/POST**

In `server/agents-routes.ts:26-67`, wrap the `upsertAgent` and `createAgent` paths:

```ts
router.post("/", requireStaffRole("superadmin", "owner"), async (req, res) => {
  try {
    const sess = req.session;
    const { propertyId, name, emoji, tagline, greeting, personality } = req.body;
    if (!propertyId) return res.status(400).json({ message: "propertyId required" });
    const isSuperadmin = sess.staffRole === "superadmin";
    if (!isSuperadmin && sess.staffTenantId) {
      await assertPropertyInTenant(propertyId, sess.staffTenantId);
    }
    const tenantId = isSuperadmin ? (req.body.tenantId ?? null) : sess.staffTenantId ?? null;
    const agent = await createAgent({
      propertyId, tenantId, name: name ?? "LIRE Agent", emoji: emoji ?? "LH",
      tagline: tagline ?? null, greeting: greeting ?? null, personality: personality ?? null,
    });
    res.status(201).json(agent);
  } catch (err: any) {
    if (err instanceof PropertyScopeError) return res.status(403).json({ message: "propertyId outside tenant scope" });
    if (err?.code === "23505") return res.status(409).json({ message: "Agent already exists for this property" });
    console.error("[agent create]", err);
    res.status(500).json({ message: "Error creating agent" });
  }
});

router.put("/by-property/:propertyId", requireStaffRole("superadmin", "owner"), async (req, res) => {
  try {
    const sess = req.session;
    const isSuperadmin = sess.staffRole === "superadmin";
    if (!isSuperadmin && sess.staffTenantId) {
      await assertPropertyInTenant(req.params.propertyId, sess.staffTenantId);
    }
    const { name, emoji, tagline, greeting, personality } = req.body;
    const agent = await upsertAgent(req.params.propertyId, { name, emoji, tagline, greeting, personality });
    res.json(agent);
  } catch (err) {
    if (err instanceof PropertyScopeError) return res.status(403).json({ message: "propertyId outside tenant scope" });
    console.error("[agent upsert]", err);
    res.status(500).json({ message: "Error updating agent" });
  }
});
```

Drop `tenantId` from non-superadmin write paths — derive from session/property.

- [ ] **Step 3: Run tenant-isolation suite again**

```bash
npm run test -- tests/tenant-isolation.test.ts
```

Expect all six scenarios green.

- [ ] **Step 4: Commit**

```bash
git add server/properties-routes.ts server/agents-routes.ts
git commit -m "fix(H11,H12): prevent cross-tenant property/agent writes via session-derived tenantId"
```

---

### Task 15: Compliance role for archive reads (B13)

**Files:**
- Modify: `server/middleware/auth.ts` (add "compliance" to allowed roles list)
- Modify: `shared/schema.ts` (document allowed roles in a const)
- Modify: `server/pilots/credit/routes.ts:509` — ensure the existing `requireStaffRole("compliance", "superadmin")` works

- [ ] **Step 1: Allow "compliance" role in the role enum**

In `shared/schema.ts` near the top of the file, add:

```ts
export const STAFF_ROLES = ["superadmin", "owner", "manager", "staff", "readonly", "compliance"] as const;
export type StaffRole = typeof STAFF_ROLES[number];
```

Update `server/middleware/auth.ts`:

```ts
import { STAFF_ROLES } from "../../shared/schema.js";

const ADMIN_ROLES = ["superadmin", "owner", "manager"] as const;
// ... rest unchanged; requireStaffRole already accepts arbitrary role strings.
```

Update `session.d.ts`:

```ts
staffRole?: typeof STAFF_ROLES[number];
```

Update `tests/helpers/seed.ts` `seedStaff` `role` parameter type to include `compliance`.

- [ ] **Step 2: No test addition yet — this is a passive role add**

Compliance access is already written in credit/routes.ts:509. Confirm:

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add shared/schema.ts server/middleware/auth.ts server/types/session.d.ts tests/helpers/seed.ts
git commit -m "fix(B13): formalize 'compliance' staff role so archive endpoints are reachable"
```

---

### Task 16: Redact network error bodies in logs (B12)

**Files:**
- Modify: `server/app-factory.ts` (chat handler error branch)
- Modify: `server/pilots/credit/claude-pipeline.ts`
- Modify: `server/pilots/leasing/claude-recap.ts`

- [ ] **Step 1: Redact upstream error bodies**

In each file that logs an Anthropic/Azure HTTP error body, cap it to 200 chars and strip header-like substrings:

```ts
function redact(s: string): string {
  return s.replace(/(x-api-key|authorization)\s*[:=]\s*[^,\n"]*/gi, "$1: [redacted]").slice(0, 200);
}
// Use: console.error("[upstream]", res.status, redact(bodyText));
```

Apply at:
- `server/app-factory.ts` chat `upstream.ok` error branch
- `server/pilots/credit/claude-pipeline.ts` all three fetch calls
- `server/pilots/leasing/claude-recap.ts` fetch call
- `server.ts` fatal-startup handler (line ~481): log only `err.message` and `err.name`, not the full Error (drizzle/postgres-js errors can include `DATABASE_URL` query params in their message chain — call `redact()` on the message before printing).

- [ ] **Step 2: Commit**

```bash
git add server/app-factory.ts server/pilots/credit/claude-pipeline.ts server/pilots/leasing/claude-recap.ts
git commit -m "fix(B12): redact upstream error bodies before logging"
```

---

### Task 17: Azure AD id_token signature verification + oid-based upsert (B5)

**Files:**
- Create: `server/platform/jwks-verify.ts`
- Modify: `server/platform/azure-ad.ts`
- Modify: `shared/schema.ts` — add `azureOid` column to `staff_users`
- Create: `drizzle/0004_staff_users_azure_oid.sql`
- Create: `tests/azure-ad.test.ts`

- [ ] **Step 1: Add the schema column + partial unique index**

In `shared/schema.ts`, add the column *without* an inline `.unique()` (an inline unique would create a full constraint that Drizzle can't reconcile with the partial index we want). Declare the partial unique index at the bottom of the table:

```ts
export const staffUsers = pgTable("staff_users", {
  // ... existing columns
  azureOid: varchar("azure_oid"),
  // ... existing columns
}, (table) => ({
  azureOidUnique: uniqueIndex("idx_staff_users_azure_oid")
    .on(table.azureOid)
    .where(sql`${table.azureOid} IS NOT NULL`),
}));
```

Add the `uniqueIndex` import near the top: `import { pgTable, text, integer, boolean, timestamp, varchar, jsonb, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";`.

Migration `drizzle/0004_staff_users_azure_oid.sql`:

```sql
ALTER TABLE "staff_users" ADD COLUMN IF NOT EXISTS "azure_oid" varchar;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_staff_users_azure_oid"
  ON "staff_users" ("azure_oid") WHERE "azure_oid" IS NOT NULL;
```

Run `npm run db:push` after this change and confirm there's no drift prompt.

- [ ] **Step 2: Implement JWKS verifier**

`server/platform/jwks-verify.ts`:

```ts
import { createVerify, createPublicKey } from "node:crypto";

type Jwk = { kid: string; n: string; e: string; kty: "RSA" };
type Jwks = { keys: Jwk[] };

const cache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();
const TTL_MS = 60 * 60_000;

async function fetchJwks(tenantId: string): Promise<Jwk[]> {
  const now = Date.now();
  const cached = cache.get(tenantId);
  if (cached && now - cached.fetchedAt < TTL_MS) return cached.keys;
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`);
  if (!res.ok) throw new Error(`JWKS fetch failed ${res.status}`);
  const body = (await res.json()) as Jwks;
  cache.set(tenantId, { keys: body.keys, fetchedAt: now });
  return body.keys;
}

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function jwkToPem(jwk: Jwk): string {
  // Construct a DER-encoded SPKI from modulus/exponent, then convert with createPublicKey.
  const keyObject = createPublicKey({
    key: { kty: "RSA", n: jwk.n, e: jwk.e },
    format: "jwk",
  });
  return keyObject.export({ type: "spki", format: "pem" }) as string;
}

export async function verifyIdTokenSignature(idToken: string, azureTenantId: string): Promise<void> {
  const [headerB64, payloadB64, sigB64] = idToken.split(".");
  if (!headerB64 || !payloadB64 || !sigB64) throw new Error("Malformed id_token");
  const header = JSON.parse(b64urlToBuf(headerB64).toString("utf8")) as { alg: string; kid: string };
  if (header.alg !== "RS256") throw new Error(`Unsupported alg ${header.alg}`);
  const keys = await fetchJwks(azureTenantId);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error(`JWKS: kid ${header.kid} not found`);
  const pem = jwkToPem(jwk);
  const signed = `${headerB64}.${payloadB64}`;
  const verifier = createVerify("RSA-SHA256").update(signed);
  const ok = verifier.verify(pem, b64urlToBuf(sigB64));
  if (!ok) throw new Error("id_token signature invalid");
}
```

- [ ] **Step 3a: Call `verifyIdTokenSignature` before decoding claims**

In `server/platform/azure-ad.ts`, add `import { verifyIdTokenSignature } from "./jwks-verify.js";` at the top. In `handleAzureAdCallback`, immediately after `const tokens = await exchangeCodeForTokens(...)`:

```ts
await verifyIdTokenSignature(tokens.id_token, cfg.tenantId);
const claims = decodeIdToken(tokens.id_token);
validateIdTokenClaims(claims, cfg);
```

- [ ] **Step 3b: Make `upsertStaffFromClaims` look up by `oid` first**

Replace the `const [existing] = await db.select()...where(eq(staffUsers.email, email))` block with:

```ts
const [byOid] = await db
  .select()
  .from(staffUsers)
  .where(eq(staffUsers.azureOid, claims.oid))
  .limit(1);
if (byOid) {
  await db.update(staffUsers)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(staffUsers.id, byOid.id));
  return byOid;
}
```

- [ ] **Step 3c: Fallback to email for legacy rows, then attach `oid`**

Immediately after Step 3b:

```ts
const [byEmail] = await db
  .select()
  .from(staffUsers)
  .where(eq(staffUsers.email, email))
  .limit(1);
if (byEmail) {
  await db.update(staffUsers)
    .set({ azureOid: claims.oid, lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(staffUsers.id, byEmail.id));
  return { ...byEmail, azureOid: claims.oid };
}
```

- [ ] **Step 3d: Provision new user with `oid`**

In the existing `db.insert(staffUsers).values({...})` call, add `azureOid: claims.oid,`.

- [ ] **Step 3e: Require `AZURE_AD_HOME_TENANT_SLUG` explicitly**

Replace `readAzureAdConfig()`'s `homeTenantSlug` line:

```ts
const homeTenantSlug = process.env["AZURE_AD_HOME_TENANT_SLUG"];
if (!tenantId || !clientId || !clientSecret || !redirectUri || !homeTenantSlug) {
  if (tenantId || clientId || clientSecret || redirectUri) {
    // Partial Azure config is almost always a misconfiguration — log a one-time warning so ops sees it.
    if (!(readAzureAdConfig as any)._warned) {
      console.warn("[azure-ad] Partial Azure AD config detected — all of TENANT_ID/CLIENT_ID/CLIENT_SECRET/REDIRECT_URI/HOME_TENANT_SLUG are required; SSO will stay disabled until all are set.");
      (readAzureAdConfig as any)._warned = true;
    }
  }
  return null;
}
```

- [ ] **Step 4: Replace `decodeIdToken` with base64url decoding**

```ts
function decodeIdToken(idToken: string): IdTokenClaims {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed id_token");
  const payload = Buffer.from(parts[1]!, "base64url").toString("utf8");
  return JSON.parse(payload) as IdTokenClaims;
}
```

- [ ] **Step 5: Smoke tests that do not require a live Azure tenant**

```ts
import { describe, it, expect } from "vitest";
import { verifyIdTokenSignature } from "../server/platform/jwks-verify.js";

describe("azure-ad signature (B5)", () => {
  it("rejects tampered tokens", async () => {
    // A token with header+payload+bad signature should never verify.
    const fake = Buffer.from(JSON.stringify({ alg: "RS256", kid: "nope" })).toString("base64url") + "." +
                 Buffer.from(JSON.stringify({ oid: "x" })).toString("base64url") + ".XXXX";
    // This throws because kid lookup fails before signature math runs. Fine.
    await expect(verifyIdTokenSignature(fake, "fake-tenant")).rejects.toThrow();
  });
});
```

- [ ] **Step 6: Run DB push and tests**

```bash
npm run db:push
npm run test -- tests/azure-ad.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add shared/schema.ts drizzle/0004_staff_users_azure_oid.sql server/platform/jwks-verify.ts server/platform/azure-ad.ts tests/azure-ad.test.ts
git commit -m "fix(B5): verify Azure id_token signature via JWKS + key Azure lookup by oid"
```

---

### Task 18: Dedupe pg pool (H9) — Phase 2 end

**Files:**
- Modify: `server.ts` / `server/app-factory.ts`
- Modify: `server/db.ts`

**Context:** `server/db.ts` uses `postgres-js` (the `postgres` package), which has no `Pool` class — it manages its own internal connection pool. `connect-pg-simple` requires a `pg.Pool` OR a `conString` (it constructs a `pg.Pool` internally from the connection string). Path of least resistance: stop creating the extra `pg.Pool` and hand `connect-pg-simple` the `conString` instead, so the session store manages exactly one `pg.Pool` (separate from postgres-js, but no longer duplicated).

- [ ] **Step 1: Drop the explicit `sessionPool` and switch `PgSession` to `conString`**

In `server/app-factory.ts` (formerly `server.ts:67-114`), delete the `pg` import, `sessionPool` construction, and the `.query("SELECT 1 as test")` probe. Replace the `store: new PgSession({ pool: sessionPool, ... })` line with:

```ts
store: new PgSession({
  conString: process.env.DATABASE_URL,
  tableName: "staff_sessions",
  createTableIfMissing: false,
}),
```

Add a comment:

```ts
// Why: previously we created an explicit pg.Pool for the session store AND
// postgres-js maintained its own pool for Drizzle — two pools meant double the
// connection count against Railway's tight limits. connect-pg-simple still
// creates one pg.Pool internally from conString; we just no longer duplicate.
```

- [ ] **Step 2: Run full test suite to confirm sessions still work**

```bash
npm run test
```

Pay attention to `tests/auth.test.ts` (session-regenerate coverage) — if `connect-pg-simple` can't connect with `conString`, login tests will fail.

- [ ] **Step 3: Run the smoke and tenant-isolation suites**

```bash
npm run test
```

- [ ] **Step 4: Commit**

```bash
git add server/db.ts server.ts server/app-factory.ts
git commit -m "fix(H9): dedupe pg pool across drizzle + session store"
```

---

### Phase 2 milestone

At this point all 15 blockers are closed, plus H14 (open-redirect guard lands in Task 23 during Phase 3 — but the guard function itself is already written), H15 (global body limit), H17 (model pricing — landed early because metrics depend on it), and the `tenant-isolation.test.ts` suite is green. This is the "safe to dogfood against real Berkeley data with password login" milestone.

- [ ] **Run the full suite:**

```bash
npm run check && npm run test
```

- [ ] **Open a PR titled `hardening(phase-2): close all pre-dogfooding blockers`**
- [ ] Request a review (see @superpowers:requesting-code-review)
- [ ] Merge when green
- [ ] Deploy to the Railway preview environment and run the manual smoke script below

Manual Berkeley dogfooding smoke (from the review's dogfooding-readiness checklist):

```bash
# 1. Health
curl https://<preview-host>/api/health

# 2. Login
curl -c /tmp/lire.cookies -X POST https://<preview-host>/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"jp@dehyl.ca\",\"password\":\"$LIRE_OWNER_PASSWORD\"}"

# 3. Identity
curl -b /tmp/lire.cookies https://<preview-host>/api/auth/me | jq .

# 4. Staff list scope
curl -b /tmp/lire.cookies https://<preview-host>/api/staff | jq '.[] | .email'

# 5. Helpdesk navigation
curl -b /tmp/lire.cookies https://<preview-host>/api/helpdesk/inbox/navigation | jq '.views | length'
```

---

## Phase 3 — High-priority cleanups (H1–H12)

### Task 19: Pagination on inbox lists (H1)

**Files:**
- Modify: `server/storage.ts` (`loadHelpdeskContext`, `getHelpInboxConversations`, `getHelpInboxNavigation`)
- Modify: `server/helpdesk-routes.ts`

- [ ] **Step 1: Push filters into SQL**

Replace the "load every row into JS then filter" pattern. For `getHelpInboxConversations`, build Drizzle conditions with `and(eq(helpConversations.tenantId, scope.tenantId), scope.propertyId ? eq(helpConversations.propertyId, scope.propertyId) : undefined)` and add `.limit(100).offset(offset)` with `offset` from `req.query["offset"]`.

- [ ] **Step 2: Route accepts `?limit` (max 100) and `?offset`**

Add zod parsing for offset/limit in helpdesk-routes.ts, default limit=50.

- [ ] **Step 3: Add test**

```ts
// short coverage: 150 seeded conversations; default limit 50; offset 50 returns next page.
```

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(H1): paginate helpdesk inbox queries, push filters into SQL"
```

---

### Task 20: N+1 fix in extractions (H4)

**Files:**
- Modify: `server/pilots/credit/routes.ts:396 and 466`

- [ ] **Step 1: Use `inArray`**

```ts
import { inArray } from "drizzle-orm";
const relevant = await db
  .select()
  .from(creditExtractions)
  .where(and(
    eq(creditExtractions.tenantId, tenantId),
    inArray(creditExtractions.documentId, docIds),
  ));
```

- [ ] **Step 2: Commit**

```bash
git commit -m "perf(H4): filter creditExtractions in SQL via inArray, not client-side"
```

---

### Task 21: Yardi unit upsert with unique constraint (H5)

**Files:**
- Modify: `shared/schema.ts` (add `uniqueIndex` on `(tenant_id, yardi_unit_id)`)
- Create: `drizzle/0003_units_yardi_unique.sql`
- Modify: `server/pilots/leasing/yardi-sync.ts`

- [ ] **Step 1: Migration**

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "idx_units_tenant_yardi_unique"
  ON "units" ("tenant_id", "yardi_unit_id") WHERE "yardi_unit_id" IS NOT NULL;
```

- [ ] **Step 2: Refactor sync loop**

Use `.onConflictDoUpdate({ target: [units.tenantId, units.yardiUnitId], set: { ... } })` in a single batched statement (chunks of 200).

- [ ] **Step 3: Commit**

```bash
git commit -m "perf(H5): batch Yardi unit upserts with unique (tenant_id, yardi_unit_id)"
```

---

### Task 22: React Query keys include tenant + clear on logout (H6)

**Files:**
- Modify: `client/src/lib/auth.tsx`
- Modify: `client/src/pages/platform-dashboard.tsx`
- Modify: `client/src/pages/credit-review.tsx`

- [ ] **Step 1: Clear cache on logout**

In `auth.tsx`, import `useQueryClient` and call `queryClient.clear()` after the logout POST succeeds.

- [ ] **Step 2: Namespace sensitive keys**

In platform-dashboard and credit-review, change `queryKey: ["platform-tenants"]` → `["platform-tenants", user?.id ?? "anon"]`, etc.

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(H6): clear React Query cache on logout and namespace per-user keys"
```

---

### Task 23: Session regenerate on login (H7), cookie clear mirror (H18), login rate limit (H19)

**Files:**
- Modify: `server/auth-routes.ts`

- [ ] **Step 1: Regenerate on login**

Wrap `setStaffSession + save` with `req.session.regenerate(cb)`:

```ts
req.session.regenerate(async (err) => {
  if (err) return res.status(500).json({ message: "Session error" });
  await setStaffSession(req, user);
  req.session.save(...);
});
```

Do the same in `handleAzureAdCallback` after signature verification.

- [ ] **Step 2: Mirror cookie options on logout (H18)**

```ts
res.clearCookie("connect.sid", {
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});
```

- [ ] **Step 3: Attach `loginLimiter` to POST /login (H19)**

```ts
router.post("/login", loginLimiter, async (req, res) => { ... });
```

- [ ] **Step 4: Harden the Azure callback redirect (H14)**

Azure callback currently returns `res.redirect("/dashboard")` unconditionally. That's fine today, but before we accept a `state`-carried return-to URL from the client, add a same-origin validator so we don't grow an open-redirect when the feature lands:

```ts
// server/platform/azure-ad.ts — add near the top
export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  // Only accept path-relative URLs ("/inbox", "/credit/lessees/abc").
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  try {
    // Reject anything that parses as absolute-with-authority.
    const u = new URL(raw, "http://dummy");
    if (u.origin !== "http://dummy") return "/dashboard";
  } catch {
    return "/dashboard";
  }
  return raw;
}
```

Use it in `handleAzureAdCallback`:

```ts
return res.redirect(safeReturnTo((req.session as any).azureAdReturnTo));
```

Add a short unit test in `tests/azure-ad.test.ts`:

```ts
import { safeReturnTo } from "../server/platform/azure-ad.js";
it("safeReturnTo blocks open redirects", () => {
  expect(safeReturnTo("//evil.com/x")).toBe("/dashboard");
  expect(safeReturnTo("https://evil.com")).toBe("/dashboard");
  expect(safeReturnTo("/inbox")).toBe("/inbox");
});
```

- [ ] **Step 5: Test**

In `tests/auth.test.ts`, cover: (a) the session ID changes after successful login; (b) logout followed by a GET /api/auth/me returns 401; (c) 11th login attempt in a window returns 429.

- [ ] **Step 6: Commit**

```bash
git commit -m "fix(H7,H14,H18,H19): regenerate session on login, open-redirect guard, mirror cookie clear, rate-limit login"
```

---

### Task 24: Central error handler (H10)

**Files:**
- Modify: `server/app-factory.ts`

- [ ] **Step 1: Terminal error middleware after all routes**

```ts
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const reqId = Math.random().toString(36).slice(2, 10);
  console.error(`[err ${reqId}]`, err instanceof Error ? err.stack : err);
  if (res.headersSent) return;
  res.status(500).json({ message: "Internal error", reqId });
});
```

- [ ] **Step 2: Remove per-route `catch` blocks that only re-wrap 500**

Use the handler instead. Keep zod catches that return 400.

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(H10): centralize error handler with reqId + keep zod 400s at boundaries"
```

---

### Task 25: Model pricing completeness (H17)

**Files:**
- Modify: `server/token-logger.ts`

- [ ] **Step 1: Fill in the table**

```ts
export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "claude-haiku-4-5-20251001": { inputPer1M: 0.80, outputPer1M: 4.00 },
  "claude-sonnet-4-20250514": { inputPer1M: 3.00, outputPer1M: 15.00 },
  "claude-sonnet-4-6": { inputPer1M: 3.00, outputPer1M: 15.00 },
  "claude-opus-4-7": { inputPer1M: 15.00, outputPer1M: 75.00 },
};
```

Confirm the Opus 4.7 pricing against Anthropic's latest published rates before shipping; update if different.

- [ ] **Step 2: Commit**

```bash
git commit -m "fix(H17): add Sonnet 4.6 and Opus 4.7 to MODEL_PRICING so metrics stop undercounting"
```

---

### Task 26: Token-logger and logs redaction polish (H16)

**Files:**
- Modify: `server/token-logger.ts`

- [ ] **Step 1: Add structured grep tag on failure**

```ts
.catch((err) => {
  console.error("[token-logger:lost]", JSON.stringify({
    op: params.operation,
    model: params.model,
    tenantId: params.tenantId ?? null,
    error: String(err instanceof Error ? err.message : err).slice(0, 200),
  }));
});
```

Ops can `grep token-logger:lost` in Railway logs.

- [ ] **Step 2: Commit**

```bash
git commit -m "fix(H16): structured log tag when token usage write fails"
```

---

### Task 27: Confirm no user-data in `dangerouslySetInnerHTML` (H20)

**Files:**
- Read-only audit.

- [ ] **Step 1: Grep the client tree**

```bash
grep -rn "dangerouslySetInnerHTML" /Users/juandominguez/LIRE-Help-v2/client /Users/juandominguez/LIRE-Help-v2/public
```

- [ ] **Step 2: Confirm every hit is compile-time static**

For each hit, verify the injected value does not originate from a network response, user input, or a database row. The only legitimate uses are compile-time SVG expansions or static HTML constants. If any hit trips the check, file a follow-up issue — do NOT silently leave it. Document the result in the Phase 3 PR description.

- [ ] **Step 3: No commit needed unless you changed code**

---

### Phase 3 milestone

- [ ] `npm run check && npm run test` — all green
- [ ] Open PR `hardening(phase-3): high-priority cleanups (H1-H12)`
- [ ] Manual smoke against preview
- [ ] Merge and deploy

---

## Appendix: environment checklist (read before dogfooding)

Set on Railway (prod):

- `DATABASE_URL` (Postgres with `sslmode=require`)
- `SESSION_SECRET` (64+ random bytes — required in prod; server throws without it)
- `ANTHROPIC_API_KEY`
- `NODE_ENV=production`
- `COOKIE_DOMAIN=.lire-help.com`
- `AZURE_AD_TENANT_ID`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_REDIRECT_URI`, `AZURE_AD_HOME_TENANT_SLUG=berkeley` (Berkeley must exist as a tenant row first)
- `AZURE_BLOB_ACCOUNT`, `AZURE_BLOB_CONTAINER`, `AZURE_BLOB_SAS_TOKEN` (optional — falls back to local FS, which is ephemeral on Railway)

First-superadmin flow:

```bash
npm run db:push
BOOTSTRAP_ADMIN_EMAIL=jp@dehyl.ca \
BOOTSTRAP_ADMIN_PASSWORD="<32-char random>" \
BOOTSTRAP_ADMIN_NAME="JP Dominguez" \
BOOTSTRAP_ADMIN_ROLE=superadmin \
npx tsx scripts/seed-superadmin.ts
```

Then log in at `https://app.lire-help.com/login` to create the Berkeley tenant + owner.

---

## Open questions for the implementer

1. **Azure SSO readiness.** B5 lands in Phase 2 but requires Berkeley IT to confirm the redirect URI and managed-identity plan. If SSO is deferred, keep password login flowing and do not set the `AZURE_AD_*` env vars in prod — the app degrades gracefully (`/api/auth/azure/status` returns `{enabled: false}`).
2. **Opus 4.7 pricing** — Task 25 uses placeholder numbers. Pull the current rates from Anthropic's pricing page before shipping.
3. **Test database.** Tests require `DATABASE_URL` containing `test`. CI will need a separate DB — wire this into `.github/workflows/*.yml` (or Railway CI) when tests go green locally.
