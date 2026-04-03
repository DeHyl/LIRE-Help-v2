# LIRE-Help Metrics Module — Design Spec

**Date:** 2026-04-03
**Status:** Draft
**Author:** Alejandro / Claude
**Stack:** Express/Node + React/Vite + Drizzle ORM + PostgreSQL (Railway)

---

## 1. Overview

Add full observability to LIRE-Help: track every token spent on the Anthropic API,
aggregate conversation and cost metrics, and surface them in a new "Metrics" tab on
the Platform Admin dashboard. Also add a dark/light theme toggle to the dashboard.

### Goals

- **Cost visibility** — know exactly what each tenant and each chat costs in USD.
- **Conversation analytics** — total sessions, leads, escalation rate, message depth.
- **Budget guardrails** — per-tenant monthly budget with visual usage bar.
- **Zero external chart deps** — pure CSS bar charts, no chart.js / recharts.
- **Non-blocking logging** — token tracking must never slow down chat responses.

### Deliverables

| # | Deliverable               | Files touched                                               |
|---|---------------------------|-------------------------------------------------------------|
| 1 | `token_usage` DB table    | `shared/schema.ts`, new Drizzle migration                   |
| 2 | `monthlyBudgetUsd` column | `shared/schema.ts` (tenants table), migration               |
| 3 | Token logging helper      | `server/token-logger.ts` (new)                              |
| 4 | Chat endpoint integration | `server.ts` (/api/chat)                                     |
| 5 | Storage functions         | `server/storage.ts`                                         |
| 6 | Metrics API endpoint      | `server/metrics-routes.ts` (new)                            |
| 7 | Route registration        | `server.ts` (import + app.use)                              |
| 8 | Metrics tab UI            | `client/src/pages/platform-dashboard.tsx`                    |
| 9 | Dark/light toggle         | `client/src/pages/platform-dashboard.tsx`                    |

---

## 2. Data Model

### 2.1 New table: `token_usage`

```ts
// shared/schema.ts

export const tokenUsage = pgTable("token_usage", {
  id:           varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId:     varchar("tenant_id").references(() => tenants.id),       // nullable (platform-level chats)
  propertyId:   varchar("property_id").references(() => properties.id),  // nullable
  sessionId:    text("session_id"),                                      // links to platform_sessions.session_id
  operation:    text("operation").notNull(),                              // "concierge_chat", "kb_query", etc.
  model:        text("model").notNull(),                                 // "claude-haiku-4-5-20251001"
  inputTokens:  integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd:      text("cost_usd").notNull().default("0"),                 // string to avoid float precision
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});
```

**Why `text` for `costUsd`?** Floating-point arithmetic in JS/Postgres `numeric` can
introduce rounding artifacts. Storing as a string like `"0.004200"` and parsing with
`parseFloat()` only at aggregation time keeps individual records exact. This matches
the Host-Help pattern.

**Indexes (in migration SQL):**

```sql
CREATE INDEX idx_token_usage_created   ON token_usage (created_at);
CREATE INDEX idx_token_usage_tenant    ON token_usage (tenant_id, created_at);
CREATE INDEX idx_token_usage_session   ON token_usage (session_id);
```

### 2.2 Schema addition: `tenants.monthlyBudgetUsd`

```ts
// Add to existing tenants table definition:
monthlyBudgetUsd: text("monthly_budget_usd"),  // nullable, e.g. "50.00"
```

### 2.3 Types

```ts
export type TokenUsage       = typeof tokenUsage.$inferSelect;
export type InsertTokenUsage = typeof tokenUsage.$inferInsert;
```

---

## 3. Pricing Constants

```ts
// server/token-logger.ts

export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "claude-haiku-4-5-20251001":  { inputPer1M: 0.80,  outputPer1M: 4.00  },
  "claude-sonnet-4-20250514":   { inputPer1M: 3.00,  outputPer1M: 15.00 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): string {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["claude-haiku-4-5-20251001"]!;
  const cost =
    (inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputTokens / 1_000_000) * pricing.outputPer1M;
  return cost.toFixed(6);   // e.g. "0.004200"
}
```

---

## 4. Token Logging (Non-blocking)

### 4.1 Helper: `server/token-logger.ts`

```ts
import { db } from "./db.js";
import { tokenUsage } from "../shared/schema.js";
import { calculateCost } from "./token-logger.js";  // self-reference for pricing

interface LogTokenParams {
  tenantId?:   string | null;
  propertyId?: string | null;
  sessionId?:  string | null;
  operation:   string;
  model:       string;
  inputTokens: number;
  outputTokens: number;
}

export function logTokenUsage(params: LogTokenParams): void {
  // Fire-and-forget — never awaited, never blocks the response
  const costUsd = calculateCost(params.model, params.inputTokens, params.outputTokens);

  db.insert(tokenUsage)
    .values({
      tenantId:     params.tenantId ?? null,
      propertyId:   params.propertyId ?? null,
      sessionId:    params.sessionId ?? null,
      operation:    params.operation,
      model:        params.model,
      inputTokens:  params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd,
    })
    .then(() => {
      // silent success
    })
    .catch((err) => {
      console.error("[token-logger] Failed to log token usage:", err);
    });
}
```

### 4.2 Integration with `/api/chat`

Current chat endpoint (server.ts ~L300-352) makes a raw `fetch` to the Anthropic API.
The response JSON already contains `usage.input_tokens` and `usage.output_tokens`.

**Changes to `/api/chat`:**

```
BEFORE (L335-346):
  const data = (await upstream.json()) as {
    content?: Array<{ text?: string }>;
  };
  const raw = data.content?.[0]?.text ?? "";
  ...
  res.json({ response, escalate });

AFTER:
  const data = (await upstream.json()) as {
    content?: Array<{ text?: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };
  const raw = data.content?.[0]?.text ?? "";
  ...

  // Non-blocking token logging (fire-and-forget)
  if (data.usage) {
    logTokenUsage({
      sessionId:    sessionId ?? null,
      operation:    "concierge_chat",
      model:        "claude-haiku-4-5-20251001",
      inputTokens:  data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    });
  }

  res.json({ response, escalate });
```

Key points:
- `logTokenUsage()` is called **after** building the response but **before** `res.json()`,
  however it is not `await`ed, so the response is not delayed.
- `tenantId` and `propertyId` are `null` for the platform concierge chat. When tenant-
  scoped chat is added later, those values will be passed through.

---

## 5. Data Flow Diagram

```
                          CHAT REQUEST FLOW
 ============================================================

  Browser                  Express Server             Anthropic API
  --------                 --------------             -------------
     |                          |                          |
     |  POST /api/chat          |                          |
     |  { messages, sessionId } |                          |
     |------------------------->|                          |
     |                          |                          |
     |                          |  POST /v1/messages       |
     |                          |  { model, messages }     |
     |                          |------------------------->|
     |                          |                          |
     |                          |  200 OK                  |
     |                          |  { content, usage: {     |
     |                          |    input_tokens,         |
     |                          |    output_tokens } }     |
     |                          |<-------------------------|
     |                          |                          |
     |                          |--+                       |
     |                          |  | logTokenUsage()       |
     |                          |  | (fire-and-forget)     |
     |                          |  |                       |
     |  200 OK                  |<-+                       |
     |  { response, escalate }  |                          |
     |<-------------------------|     +----------+         |
     |                          |     |          |         |
     |                          |     | token_   |         |
     |                          |     | usage    |         |
     |                          |     | table    |         |
     |                          |     +----------+         |
     |                          |          |               |
     |                          |          |               |
                                           |
                                           v
                          METRICS QUERY FLOW
 ============================================================

  Browser                  Express Server             PostgreSQL
  --------                 --------------             ----------
     |                          |                          |
     |  GET /api/admin/metrics  |                          |
     |  ?days=7                 |                          |
     |------------------------->|                          |
     |                          |  requireAdmin()          |
     |                          |  middleware check         |
     |                          |                          |
     |                          |  SELECT aggregates       |
     |                          |  FROM token_usage        |
     |                          |  WHERE created_at >=     |
     |                          |    NOW() - interval      |
     |                          |------------------------->|
     |                          |                          |
     |                          |  SELECT conversation     |
     |                          |  stats FROM              |
     |                          |  platform_sessions       |
     |                          |  WHERE created_at >=     |
     |                          |    NOW() - interval      |
     |                          |------------------------->|
     |                          |                          |
     |                          |<-------------------------|
     |  200 OK                  |                          |
     |  { conversations,        |                          |
     |    tokens, perTenant,    |                          |
     |    projection }          |                          |
     |<-------------------------|                          |
     |                          |                          |
     |  Render MetricsTab       |                          |
     |  (stat cards, CSS bars,  |                          |
     |   per-tenant table)      |                          |
     |                          |                          |


                       DASHBOARD TAB STRUCTURE
 ============================================================

  +-------------------------------------------------------+
  | LIRE Help              Platform Admin   [sun/moon] email|
  +-------------------------------------------------------+
  | [Tenants]  [LIRE Help]  [Metrics]                     |
  +-------------------------------------------------------+
  |                                                       |
  |  +------------+ +----------+ +----------+ +---------+ |
  |  | Convos:    | | Leads:   | | Cost:    | | Avg Msg:| |
  |  |    147     | |   23     | |  $4.82   | |   6.3   | |
  |  +------------+ +----------+ +----------+ +---------+ |
  |                                                       |
  |  COST BREAKDOWN              DAILY TREND (30d)        |
  |  +---------------------+    +--------------------+    |
  |  | Haiku  ████████ 92% |    | ▐                  |    |
  |  | Sonnet ██       8%  |    | ▐▐                 |    |
  |  +---------------------+    | ▐▐▐                |    |
  |  Est. $14.20/month          | ▐▐▐▐▐▐             |    |
  |                             +--------------------+    |
  |                                                       |
  |  PER-TENANT USAGE                                     |
  |  +-----------------------------------------------+   |
  |  | Tenant       | Convos | Tokens | Cost | Escal. |   |
  |  |-----------------------------------------------|   |
  |  | Oakland GW   |    89  |  340K  | $2.80|  12%  |   |
  |  | [budget bar: ████████░░ 80% of $5.00]         |   |
  |  |-----------------------------------------------|   |
  |  | Demo Tenant  |    58  |  210K  | $2.02|   5%  |   |
  |  | [budget bar: ██░░░░░░░░ 20% of $10.00]        |   |
  |  +-----------------------------------------------+   |
  |                                                       |
  |  [7 days] [30 days]                                   |
  +-------------------------------------------------------+
```

---

## 6. Metrics API

### 6.1 Route file: `server/metrics-routes.ts`

```
GET /api/admin/metrics?days=7|30
```

**Auth:** `requireAdmin` middleware (from `server/middleware/auth.ts`).

**Query param:** `days` — integer, defaults to `7`. Only `7` and `30` are supported;
anything else falls back to `7`.

### 6.2 Response shape

```ts
interface MetricsResponse {
  conversations: {
    total: number;
    leads: number;
    escalationRate: number;          // 0.0 - 1.0 (e.g. 0.12 = 12%)
    avgMessages: number;             // average messageCount per session
    dailyTrend: Array<{
      date: string;                  // "2026-04-01"
      count: number;
    }>;
  };
  tokens: {
    totalInput: number;
    totalOutput: number;
    totalCostUsd: string;            // "4.820000"
    byModel: Array<{
      model: string;
      input: number;
      output: number;
      cost: string;
    }>;
    dailyCost: Array<{
      date: string;                  // "2026-04-01"
      cost: string;
    }>;
  };
  perTenant: Array<{
    tenantId: string | null;
    name: string;
    conversations: number;
    tokens: number;                  // input + output
    cost: string;
    escalationRate: number;
    monthlyBudgetUsd: string | null;
  }>;
  projection: {
    monthlyEstimate: string;         // extrapolated from last 7 days
  };
}
```

### 6.3 Query strategy

Run three queries in parallel using `Promise.all`:

1. **Conversation stats** — query `platform_sessions` where `created_at >= cutoff`:
   - `COUNT(*)` as total
   - `SUM(CASE WHEN is_lead THEN 1 ELSE 0 END)` as leads
   - `SUM(CASE WHEN escalated_to_wa THEN 1 ELSE 0 END)` as escalated
   - `AVG(message_count)` as avgMessages
   - Group by `DATE(created_at)` for dailyTrend

2. **Token stats** — query `token_usage` where `created_at >= cutoff`:
   - `SUM(input_tokens)`, `SUM(output_tokens)`, `SUM(cost_usd::numeric)` total
   - Group by `model` for byModel breakdown
   - Group by `DATE(created_at)` for dailyCost

3. **Per-tenant stats** — join `token_usage` with `tenants`:
   - Group by `tenant_id`
   - Include `tenants.name` and `tenants.monthly_budget_usd`

**Projection formula:**

```
dailyAvgCost = totalCostUsd / days
monthlyEstimate = dailyAvgCost * 30
```

Use `days = min(actualDaysWithData, requestedDays)` to avoid division by zero for
new deployments.

### 6.4 Storage functions (added to `server/storage.ts`)

```ts
// ─── Token Usage ────────────────────────────────────────────────────────────

export async function insertTokenUsage(data: InsertTokenUsage): Promise<TokenUsage> {
  const [row] = await db.insert(tokenUsage).values(data).returning();
  return row!;
}

export async function getTokenUsageAggregates(since: Date): Promise<{
  totalInput: number;
  totalOutput: number;
  totalCostUsd: string;
  byModel: Array<{ model: string; input: number; output: number; cost: string }>;
  dailyCost: Array<{ date: string; cost: string }>;
}> {
  // Implementation uses raw SQL via db.execute() for aggregation efficiency
  // ...
}

export async function getConversationAggregates(since: Date): Promise<{
  total: number;
  leads: number;
  escalated: number;
  avgMessages: number;
  dailyTrend: Array<{ date: string; count: number }>;
}> {
  // ...
}

export async function getPerTenantMetrics(since: Date): Promise<Array<{
  tenantId: string | null;
  name: string;
  conversations: number;
  tokens: number;
  cost: string;
  escalationRate: number;
  monthlyBudgetUsd: string | null;
}>> {
  // ...
}
```

---

## 7. Dashboard UI — Metrics Tab

### 7.1 Tab registration

Add `"metrics"` to the `activeTab` union type and the tab nav array in
`platform-dashboard.tsx`:

```ts
const [activeTab, setActiveTab] = useState<"tenants" | "lire-help" | "metrics">("tenants");
```

New tab in the nav:

```ts
{ id: "metrics" as const, label: "Metrics", icon: <TrendingUp className="h-3.5 w-3.5" /> },
```

`TrendingUp` is already imported from lucide-react in the current file.

### 7.2 Component: `MetricsTab`

A single component rendered when `activeTab === "metrics"`. Uses `useQuery` to fetch
`/api/admin/metrics?days={period}`.

**State:**

```ts
const [period, setPeriod] = useState<7 | 30>(7);
```

### 7.3 Stat cards (top row)

Four cards in a `grid grid-cols-4 gap-4` layout, same style as the existing Tenants
tab stat cards:

| Card               | Value source                         | Format         |
|--------------------|--------------------------------------|----------------|
| Total Conversations| `conversations.total`                | integer        |
| Leads Captured     | `conversations.leads`                | integer        |
| Token Cost (USD)   | `tokens.totalCostUsd`                | `$X.XX`        |
| Avg Messages/Convo | `conversations.avgMessages`          | `X.X`          |

### 7.4 Cost breakdown section

Two horizontal bars showing Haiku vs Sonnet usage percentage.

**Implementation (pure CSS):**

```tsx
{tokens.byModel.map(m => {
  const pct = totalCost > 0
    ? (parseFloat(m.cost) / totalCost * 100).toFixed(1)
    : "0";
  return (
    <div key={m.model} className="flex items-center gap-3">
      <span className="text-xs w-20 truncate">{m.model.includes("haiku") ? "Haiku" : "Sonnet"}</span>
      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
        <div
          className="h-full bg-primary rounded"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
    </div>
  );
})}
```

Below the bars, show the monthly projection:

```
Est. $XX.XX/month (based on last 7 days)
```

### 7.5 Daily trend chart (CSS bar chart)

A row of vertical bars, one per day, for the last N days. Pure CSS, no libraries.

```tsx
<div className="flex items-end gap-px h-32">
  {conversations.dailyTrend.map(d => {
    const maxCount = Math.max(...conversations.dailyTrend.map(x => x.count), 1);
    const heightPct = (d.count / maxCount) * 100;
    return (
      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
        <span className="text-[9px] text-muted-foreground">{d.count || ""}</span>
        <div
          className="w-full bg-primary/80 rounded-t min-h-[2px]"
          style={{ height: `${heightPct}%` }}
          title={`${d.date}: ${d.count} conversations`}
        />
      </div>
    );
  })}
</div>
```

X-axis labels show abbreviated dates (e.g., "Apr 1") every 5th bar.

### 7.6 Per-tenant table

A styled table with columns: Tenant | Conversations | Tokens | Cost | Escalation Rate.

Below each row, if `monthlyBudgetUsd` is set, render a budget usage bar:

```tsx
{item.monthlyBudgetUsd && (
  <div className="mt-1.5 flex items-center gap-2">
    <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
      <div
        className={`h-full rounded ${usagePct > 90 ? "bg-red-500" : usagePct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
        style={{ width: `${Math.min(usagePct, 100)}%` }}
      />
    </div>
    <span className="text-[10px] text-muted-foreground">
      {usagePct.toFixed(0)}% of ${item.monthlyBudgetUsd}
    </span>
  </div>
)}
```

Color thresholds: green (0-70%), amber (70-90%), red (90%+).

### 7.7 Period selector

Two toggle buttons at the bottom:

```tsx
<div className="flex gap-1">
  {([7, 30] as const).map(d => (
    <button
      key={d}
      onClick={() => setPeriod(d)}
      className={`text-xs px-3 py-1.5 rounded-md font-medium ${
        period === d
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {d} days
    </button>
  ))}
</div>
```

---

## 8. Dark/Light Toggle

### 8.1 Behavior

- Toggle button in the dashboard `<header>`, right side, before the user email.
- Uses `localStorage` key `"lire-theme"` (same key as the landing page).
- On load, read `localStorage.getItem("lire-theme")`. If `"dark"`, add class `dark`
  to `<html>`. If absent, default to light.
- On toggle, flip the class and persist to `localStorage`.

### 8.2 Implementation

```tsx
import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("lire-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("lire-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
```

Place in header:

```tsx
<div className="flex-1" />
<ThemeToggle />
<span className="text-xs text-muted-foreground mr-2">{user?.email}</span>
```

### 8.3 Dark mode classes

The existing Tailwind config likely supports `darkMode: "class"`. All dashboard
components use semantic color tokens (`bg-card`, `bg-background`, `text-foreground`,
`text-muted-foreground`, `bg-muted`, `border`, `bg-primary`, etc.) which should
resolve correctly in dark mode if CSS variables are defined for both themes.

**Verify:** Confirm that `tailwind.config.ts` has `darkMode: "class"` and that the
root CSS file defines dark-mode CSS variable overrides.

---

## 9. Migration Plan

### 9.1 Drizzle migration

Generate after schema changes:

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### 9.2 SQL (for reference / manual migration)

```sql
-- New table
CREATE TABLE IF NOT EXISTS token_usage (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR REFERENCES tenants(id),
  property_id     VARCHAR REFERENCES properties(id),
  session_id      TEXT,
  operation       TEXT NOT NULL,
  model           TEXT NOT NULL,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  cost_usd        TEXT NOT NULL DEFAULT '0',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_usage_created ON token_usage (created_at);
CREATE INDEX idx_token_usage_tenant  ON token_usage (tenant_id, created_at);
CREATE INDEX idx_token_usage_session ON token_usage (session_id);

-- Alter tenants
ALTER TABLE tenants ADD COLUMN monthly_budget_usd TEXT;
```

---

## 10. File-by-File Change Summary

### `shared/schema.ts`
- Add `tokenUsage` table definition (after `platformSessions`)
- Add `monthlyBudgetUsd` field to `tenants` table
- Export `TokenUsage` and `InsertTokenUsage` types

### `server/token-logger.ts` (NEW)
- `MODEL_PRICING` constant
- `calculateCost()` function
- `logTokenUsage()` fire-and-forget function

### `server/storage.ts`
- Import `tokenUsage` from schema
- Add `insertTokenUsage()`
- Add `getTokenUsageAggregates(since)`
- Add `getConversationAggregates(since)`
- Add `getPerTenantMetrics(since)`

### `server/metrics-routes.ts` (NEW)
- `GET /api/admin/metrics` — requires admin, runs parallel queries, returns
  `MetricsResponse`

### `server.ts`
- Import and register `metricsRoutes` at `/api/admin`
- Expand Anthropic response type to include `usage`
- Import and call `logTokenUsage()` after chat response (non-blocking)

### `client/src/pages/platform-dashboard.tsx`
- Expand `activeTab` union to include `"metrics"`
- Add `"Metrics"` tab to nav bar
- Add `ThemeToggle` component, place in header
- Add `MetricsTab` component:
  - Period selector state (7 | 30)
  - `useQuery` for `/api/admin/metrics?days=`
  - 4 stat cards
  - Cost breakdown bars (pure CSS)
  - Daily trend bar chart (pure CSS)
  - Per-tenant table with budget bars
- Add `Sun`, `Moon` to lucide-react imports

---

## 11. Edge Cases and Error Handling

| Scenario                          | Handling                                                    |
|-----------------------------------|-------------------------------------------------------------|
| Anthropic API returns no `usage`  | Skip `logTokenUsage()` (already guarded by `if (data.usage)`) |
| Token log insert fails            | `console.error` only — never blocks response                |
| No data for requested period      | Return zeroes; UI shows "No data yet" message               |
| Unknown model in pricing map      | Fall back to Haiku pricing                                  |
| `monthlyBudgetUsd` is null        | Skip budget bar for that tenant                             |
| Budget exceeded (>100%)           | Clamp bar at 100%, show red, display actual percentage      |
| Division by zero in projection    | If 0 days of data, show "$0.00" estimate                    |
| Very long period (>30 days)       | Clamp to 30; only 7 and 30 are valid                        |

---

## 12. Security Considerations

- `/api/admin/metrics` is protected by `requireAdmin` middleware — only authenticated
  staff users can access it.
- Token usage data does not contain message content — only counts and costs.
- No PII is stored in `token_usage` (session IDs are opaque UUIDs).
- Budget values are admin-set and not user-modifiable through the metrics endpoint.

---

## 13. Performance Notes

- **Token logging:** fire-and-forget `INSERT` adds ~1-3ms to the server (non-blocking
  to the client). The PG connection pool handles queueing.
- **Metrics queries:** All aggregation queries use `created_at >= cutoff` which hits
  the `idx_token_usage_created` index. For the current data volume (hundreds of rows),
  these queries will return in <50ms.
- **Scaling concern:** If token_usage grows past 100K rows, consider adding a
  materialized view or daily rollup table. Not needed at current scale.
- **CSS bar chart vs chart library:** Eliminates ~150KB of bundle size (recharts).
  Pure CSS bars are sufficient for the bar-chart patterns needed here.

---

## 14. Testing Checklist

- [ ] `token_usage` table created via migration without errors
- [ ] `monthlyBudgetUsd` column added to `tenants` without errors
- [ ] Chat endpoint still responds normally (no latency regression)
- [ ] Token usage rows appear in DB after each chat message
- [ ] `costUsd` values are accurate per pricing constants
- [ ] `/api/admin/metrics?days=7` returns valid JSON with all fields
- [ ] `/api/admin/metrics?days=30` returns valid JSON with all fields
- [ ] Unauthenticated requests to `/api/admin/metrics` return 403
- [ ] Metrics tab renders stat cards with correct values
- [ ] Cost breakdown bars display correct Haiku/Sonnet split
- [ ] Daily trend chart shows bars for each day in the period
- [ ] Per-tenant table populates correctly
- [ ] Budget bar shows correct color thresholds (green/amber/red)
- [ ] Budget bar clamps at 100% when exceeded
- [ ] Period toggle (7d/30d) refreshes data
- [ ] Dark/light toggle persists across page reloads
- [ ] Dark mode applies correctly to all dashboard components
- [ ] No external chart library added to package.json

---

## 15. Future Extensions (Out of Scope)

These are not part of this spec but are natural next steps:

- **Real-time cost alerts** — Notify admin when a tenant hits 80%/100% of budget
- **Token usage per-property** — When tenant-scoped chat is live, aggregate by property
- **Export to CSV** — Download metrics as spreadsheet
- **Rate limiting** — Throttle chat requests per tenant based on budget
- **Rollup table** — Daily pre-aggregated stats for faster queries at scale
- **WebSocket live updates** — Push new conversation/token events to open dashboards
