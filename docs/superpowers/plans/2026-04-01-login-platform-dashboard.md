# LIRE Help — Login + Platform Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Host Help (capitan-dd) login page and platform admin dashboard to LIRE Help, rebranded with industrial blue (#2563EB) theme.

**Architecture:** Convert LIRE Help from a simple Express + static landing page into a full-stack app (Vite + React client alongside the existing Express server). The React SPA handles `/login` and `/dashboard` routes. The existing landing page stays at `/`. Same multi-tenant pattern: `app.lire-help.com/dashboard` = platform admin, `<tenant>.lire-help.com/dashboard` = tenant.

**Tech Stack:** React 18 + Vite + TailwindCSS + TanStack React Query + Wouter (client) | Express + Drizzle ORM + PostgreSQL + express-session + bcrypt (server) | TypeScript throughout.

**Source reference:** `D:\Artificial INTELLIGENCE\Claude Code\capitan-dd` — the platform engine.  
**Target:** `D:\Artificial INTELLIGENCE\Claude Code\Lire-Help`

---

## File Structure

### New files to create:

```
Lire-Help/
├── client/
│   ├── index.html                    # SPA entry point
│   ├── src/
│   │   ├── main.tsx                  # React root + QueryClient
│   │   ├── App.tsx                   # Routes (login, dashboard)
│   │   ├── index.css                 # Tailwind + LIRE theme vars
│   │   ├── lib/
│   │   │   ├── auth.tsx              # AuthProvider + useAuth hook
│   │   │   └── api.ts               # API fetch helper
│   │   └── pages/
│   │       ├── login.tsx             # Login page (LIRE branded)
│   │       └── platform-dashboard.tsx # Tenants + properties + agents view
├── server/
│   │   ├── db.ts                     # Drizzle + postgres connection
│   │   ├── auth-routes.ts            # login/logout/me
│   │   ├── properties-routes.ts      # tenants + properties CRUD
│   │   ├── agents-routes.ts          # agents CRUD
│   │   ├── staff-routes.ts           # staff users CRUD
│   │   ├── knowledge-routes.ts       # platform KB CRUD + import from URL
│   │   ├── platform-sessions-routes.ts # landing page chat session tracking
│   │   ├── storage.ts               # DB query functions
│   │   ├── middleware/
│   │   │   └── auth.ts              # requireStaff, requireAdmin, requireStaffRole
│   │   └── helpers/
│   │       └── authHelpers.ts        # hashPassword, verifyPassword, setStaffSession, safeUser
├── shared/
│   │   └── schema.ts                 # Drizzle tables: tenants, properties, agents, staffUsers
├── vite.config.ts                    # Vite config for client SPA
├── tsconfig.json                     # TypeScript config
├── tailwind.config.ts                # Tailwind + LIRE theme
├── postcss.config.js                 # PostCSS for Tailwind
├── drizzle.config.ts                 # Drizzle Kit config for migrations
```

### Files to modify:

```
├── server.js                         # Add session middleware, mount auth/properties/agents/staff routes, serve SPA
├── package.json                      # Add all dependencies (React, Vite, Drizzle, etc.)
├── railway.toml                      # Update build + start commands
```

---

## Task 1: Package.json + TypeScript + Build Config

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `postcss.config.js`
- Create: `tailwind.config.ts`
- Create: `drizzle.config.ts`
- Modify: `railway.toml`

- [ ] **Step 1: Update package.json with all dependencies**

```json
{
  "name": "lire-help",
  "version": "1.0.0",
  "type": "module",
  "description": "LIRE Help — AI tenant operations for light industrial real estate",
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx --env-file=.env server.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build --config vite.config.ts",
    "build:server": "esbuild server.ts --bundle --platform=node --target=node20 --outfile=dist/index.cjs --format=cjs --external:vite --external:@vitejs/plugin-react --external:esbuild --external:dotenv --external:bcrypt",
    "start": "node dist/index.cjs",
    "db:push": "drizzle-kit push",
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2",
    "@tanstack/react-query": "^5.60.5",
    "bcrypt": "^6.0.0",
    "connect-pg-simple": "^10.0.0",
    "cross-env": "^7.0.3",
    "drizzle-orm": "^0.39.3",
    "drizzle-zod": "^0.7.0",
    "express": "^4.21.2",
    "express-session": "^1.19.0",
    "helmet": "^8.1.0",
    "lucide-react": "^0.469.0",
    "postgres": "^3.4.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "wouter": "^3.3.5",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^5.0.0",
    "@types/express-session": "^1.18.2",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vite": "^7.3.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "paths": {
      "@/*": ["./client/src/*"]
    }
  },
  "include": ["client/src", "server", "shared"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, "client"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  base: "/app/",
  build: {
    outDir: path.resolve(__dirname, "dist/admin"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./client/src/**/*.{ts,tsx}",
    "./client/index.html",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Create drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 7: Update railway.toml**

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "node dist/index.cjs"
restartPolicyType = "on_failure"
```

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json vite.config.ts postcss.config.js tailwind.config.ts drizzle.config.ts railway.toml
git commit -m "feat: add full-stack build config (Vite + Tailwind + Drizzle + TypeScript)"
```

---

## Task 2: Database Schema + Connection

**Files:**
- Create: `shared/schema.ts`
- Create: `server/db.ts`

- [ ] **Step 1: Create shared/schema.ts**

Port from capitan-dd but strip hospitality-specific fields. Keep only: tenants, properties (industrial-adapted), agents, staffUsers.

```typescript
import {
  pgTable, text, boolean, timestamp, varchar, jsonb, doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Tenants ─────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("starter"),
  billingEmail: text("billing_email"),
  phone: text("phone"),
  country: text("country").default("US"),
  timezone: text("timezone").default("America/Los_Angeles"),
  isActive: boolean("is_active").default(true).notNull(),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

// ─── Properties ──────────────────────────────────────────────────────────────

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  location: text("location"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  // Agent branding
  agentName: text("agent_name"),
  agentEmoji: text("agent_emoji"),
  agentTagline: text("agent_tagline"),
  agentGreeting: text("agent_greeting"),
  agentPersonality: text("agent_personality"),
  brandingJson: jsonb("branding_json").$type<{
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    darkMode?: boolean;
    logoUrl?: string | null;
    faviconUrl?: string | null;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true, createdAt: true, updatedAt: true });
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

// ─── Agents ──────────────────────────────────────────────────────────────────

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull().unique(),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull().default("LIRE Agent"),
  emoji: text("emoji").notNull().default("LH"),
  tagline: text("tagline"),
  greeting: text("greeting"),
  personality: text("personality"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true, updatedAt: true });
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

// ─── Staff Users ─────────────────────────────────────────────────────────────

export const staffUsers = pgTable("staff_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("readonly"),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  propertyId: varchar("property_id").references(() => properties.id),
  isActive: boolean("is_active").default(true).notNull(),
  whatsappNumber: text("whatsapp_number"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type StaffUser = typeof staffUsers.$inferSelect;

// ─── Platform Knowledge Base ─────────────────────────────────────────────────
// KB entries for the LIRE Help landing page chatbot (sales agent)

export const platformKnowledge = pgTable("platform_knowledge", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  section: text("section").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PlatformKnowledgeEntry = typeof platformKnowledge.$inferSelect;

// ─── Platform Sessions ───────────────────────────────────────────────────────
// Conversations from the LIRE Help landing page chat widget

export const platformSessions = pgTable("platform_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  messages: jsonb("messages").$type<{ role: string; content: string }[]>().default([]),
  messageCount: integer("message_count").default(0).notNull(),
  escalatedToWa: boolean("escalated_to_wa").default(false).notNull(),
  isAnalyzed: boolean("is_analyzed").default(false).notNull(),
  summary: text("summary"),
  tipoConsulta: text("tipo_consulta"),
  intencion: text("intencion"),
  tags: jsonb("tags").$type<string[]>().default([]),
  isLead: boolean("is_lead").default(false).notNull(),
  propertyType: text("property_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});

export type PlatformSession = typeof platformSessions.$inferSelect;
```

Note: also add `import { integer } from "drizzle-orm/pg-core"` to the imports at the top.

- [ ] **Step 2: Create server/db.ts**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(queryClient, { schema });
```

- [ ] **Step 3: Commit**

```bash
git add shared/schema.ts server/db.ts
git commit -m "feat: add Drizzle schema (tenants, properties, agents, staff_users) and DB connection"
```

---

## Task 3: Server Auth Layer

**Files:**
- Create: `server/helpers/authHelpers.ts`
- Create: `server/middleware/auth.ts`
- Create: `server/auth-routes.ts`

- [ ] **Step 1: Create server/helpers/authHelpers.ts**

```typescript
import bcrypt from "bcrypt";
import type { Request } from "express";
import type { StaffUser } from "../../shared/schema.js";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function setStaffSession(req: Request, user: StaffUser): void {
  (req.session as any).staffId = user.id;
  (req.session as any).staffRole = user.role;
  (req.session as any).staffTenantId = user.tenantId ?? null;
}

export function safeUser(user: StaffUser): Omit<StaffUser, "passwordHash"> {
  const { passwordHash: _ph, ...safe } = user;
  return safe;
}
```

- [ ] **Step 2: Create server/middleware/auth.ts**

```typescript
import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const sess = req.session as any;
  if (sess?.staffId) return next();
  res.status(403).json({ message: "Forbidden" });
}

export function requireStaffRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sess = req.session as any;
    if (!sess?.staffId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(sess.staffRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  const sess = req.session as any;
  if (!sess?.staffId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
```

- [ ] **Step 3: Create server/auth-routes.ts**

```typescript
import { Router } from "express";
import { db } from "./db.js";
import { staffUsers } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { verifyPassword, setStaffSession, safeUser } from "./helpers/authHelpers.js";
import { requireStaff } from "./middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.email, email.toLowerCase().trim()));
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await db.update(staffUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(staffUsers.id, user.id));

    setStaffSession(req, user);
    req.session.save((err) => {
      if (err) {
        console.error("[auth] session save error:", err);
        return res.status(500).json({ message: "Session error" });
      }
      return res.json({ user: safeUser(user) });
    });
  } catch (err) {
    console.error("[auth] login error:", err);
    return res.status(500).json({ message: "Login error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    const isDev = process.env.NODE_ENV !== "production";
    res.clearCookie("connect.sid", {
      domain: isDev ? undefined : (process.env.COOKIE_DOMAIN ?? ".lire-help.com"),
    });
    res.json({ ok: true });
  });
});

router.get("/me", requireStaff, async (req, res) => {
  try {
    const sess = req.session as any;
    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.id, sess.staffId));
    if (!user) return res.status(401).json({ message: "Invalid session" });
    return res.json({ user: safeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Session error" });
  }
});

export default router;
```

- [ ] **Step 4: Commit**

```bash
git add server/helpers/authHelpers.ts server/middleware/auth.ts server/auth-routes.ts
git commit -m "feat: add auth layer (login/logout/me + session middleware + bcrypt)"
```

---

## Task 4: Server Storage + Routes (Properties, Agents, Staff, Knowledge, Platform Sessions)

**Files:**
- Create: `server/storage.ts`
- Create: `server/properties-routes.ts`
- Create: `server/agents-routes.ts`
- Create: `server/staff-routes.ts`
- Create: `server/knowledge-routes.ts`
- Create: `server/platform-sessions-routes.ts`

- [ ] **Step 1: Create server/storage.ts**

```typescript
import { db } from "./db.js";
import { tenants, properties, agents, staffUsers } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import type { Tenant, InsertTenant, Property, InsertProperty, Agent, InsertAgent } from "../shared/schema.js";

// ─── Tenants ─────────────────────────────────────────────────────────────────

export async function getTenants(): Promise<Tenant[]> {
  return db.select().from(tenants).orderBy(tenants.name);
}

export async function createTenant(data: InsertTenant): Promise<Tenant> {
  const [row] = await db.insert(tenants).values(data).returning();
  return row!;
}

// ─── Properties ──────────────────────────────────────────────────────────────

export async function getProperties(tenantId?: string | null): Promise<Property[]> {
  if (tenantId) {
    return db.select().from(properties)
      .where(eq(properties.tenantId, tenantId))
      .orderBy(properties.name);
  }
  return db.select().from(properties).orderBy(properties.name);
}

export async function createProperty(data: InsertProperty): Promise<Property> {
  const [row] = await db.insert(properties).values(data).returning();
  return row!;
}

export async function updateProperty(id: string, data: Partial<InsertProperty>): Promise<Property | null> {
  const [row] = await db.update(properties).set({ ...data, updatedAt: new Date() }).where(eq(properties.id, id)).returning();
  return row ?? null;
}

// ─── Agents ──────────────────────────────────────────────────────────────────

export async function getAllAgents(): Promise<Agent[]> {
  return db.select().from(agents);
}

export async function getAgentByPropertyId(propertyId: string): Promise<Agent | null> {
  const [row] = await db.select().from(agents).where(eq(agents.propertyId, propertyId));
  return row ?? null;
}

export async function createAgent(data: InsertAgent): Promise<Agent> {
  const [row] = await db.insert(agents).values(data).returning();
  return row!;
}

export async function updateAgent(agentId: string, data: Partial<InsertAgent>): Promise<Agent | null> {
  const [row] = await db.update(agents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .returning();
  return row ?? null;
}

export async function upsertAgent(propertyId: string, data: Partial<InsertAgent>): Promise<Agent> {
  const existing = await getAgentByPropertyId(propertyId);
  if (existing) {
    const [row] = await db.update(agents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agents.propertyId, propertyId))
      .returning();
    return row!;
  }
  const [row] = await db.insert(agents).values({ propertyId, ...data } as InsertAgent).returning();
  return row!;
}
```

- [ ] **Step 2: Create server/properties-routes.ts**

Port from capitan-dd `server/properties-routes.ts` but only the tenants + properties CRUD (no rates, units, sites, or AI costs).

```typescript
import { Router } from "express";
import { requireAdmin, requireStaffRole } from "./middleware/auth.js";
import { getTenants, createTenant, getProperties, createProperty, updateProperty } from "./storage.js";
import { insertPropertySchema, insertTenantSchema } from "../shared/schema.js";
import { z } from "zod";

const router = Router();

router.get("/", requireAdmin, async (req, res) => {
  try {
    const tenantId = (req.session as any)?.staffTenantId ?? null;
    const data = await getProperties(tenantId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching properties" });
  }
});

router.get("/tenants", requireAdmin, async (_req, res) => {
  try {
    res.json(await getTenants());
  } catch {
    res.status(500).json({ message: "Error fetching tenants" });
  }
});

router.post("/tenants", requireAdmin, async (req, res) => {
  try {
    const data = insertTenantSchema.parse(req.body);
    const tenant = await createTenant(data);
    res.status(201).json(tenant);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
    res.status(500).json({ message: "Error creating tenant" });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const data = insertPropertySchema.parse(req.body);
    const prop = await createProperty(data);
    res.status(201).json(prop);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
    res.status(500).json({ message: "Error creating property" });
  }
});

router.put("/:id", requireStaffRole("superadmin", "owner"), async (req, res) => {
  try {
    const data = insertPropertySchema.partial().parse(req.body);
    const prop = await updateProperty(req.params["id"] as string, data);
    if (!prop) return res.status(404).json({ message: "Property not found" });
    res.json(prop);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
    res.status(500).json({ message: "Error updating property" });
  }
});

export default router;
```

- [ ] **Step 3: Create server/agents-routes.ts**

Port from capitan-dd `server/agents-routes.ts` — direct copy with LIRE defaults.

```typescript
import { Router } from "express";
import type { Request, Response } from "express";
import { requireAdmin, requireStaffRole } from "./middleware/auth.js";
import { getAllAgents, getAgentByPropertyId, createAgent, updateAgent, upsertAgent } from "./storage.js";

const router = Router();

router.get("/", requireStaffRole("superadmin"), async (_req: Request, res: Response) => {
  try {
    res.json(await getAllAgents());
  } catch (err) {
    res.status(500).json({ message: "Error fetching agents" });
  }
});

router.get("/by-property/:propertyId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const agent = await getAgentByPropertyId(req.params["propertyId"] as string);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ message: "Error fetching agent" });
  }
});

router.post("/", requireStaffRole("superadmin", "owner"), async (req: Request, res: Response) => {
  try {
    const { propertyId, tenantId, name, emoji, tagline, greeting, personality } = req.body;
    if (!propertyId) return res.status(400).json({ message: "propertyId required" });
    const agent = await createAgent({
      propertyId,
      tenantId: tenantId ?? null,
      name: name ?? "LIRE Agent",
      emoji: emoji ?? "LH",
      tagline: tagline ?? null,
      greeting: greeting ?? null,
      personality: personality ?? null,
    });
    res.status(201).json(agent);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ message: "Agent already exists for this property" });
    res.status(500).json({ message: "Error creating agent" });
  }
});

router.put("/by-property/:propertyId", requireStaffRole("superadmin", "owner"), async (req: Request, res: Response) => {
  try {
    const { name, emoji, tagline, greeting, personality, tenantId } = req.body;
    const agent = await upsertAgent(req.params["propertyId"] as string, {
      name, emoji, tagline, greeting, personality, tenantId: tenantId ?? undefined,
    });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ message: "Error updating agent" });
  }
});

router.put("/:id", requireStaffRole("superadmin", "owner"), async (req: Request, res: Response) => {
  try {
    const { name, emoji, tagline, greeting, personality, isActive } = req.body;
    const agent = await updateAgent(req.params["id"] as string, { name, emoji, tagline, greeting, personality, isActive });
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ message: "Error updating agent" });
  }
});

export default router;
```

- [ ] **Step 4: Create server/staff-routes.ts**

Port from capitan-dd `server/staff-routes.ts` — direct copy.

```typescript
import { Router } from "express";
import { db } from "./db.js";
import { staffUsers } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { hashPassword, safeUser } from "./helpers/authHelpers.js";
import { requireStaff, requireStaffRole } from "./middleware/auth.js";

const router = Router();

router.get("/", requireStaff, async (req, res) => {
  try {
    const sess = req.session as any;
    const isSuperadmin = sess.staffRole === "superadmin";
    const tenantId = sess.staffTenantId as string | undefined;
    const rows = isSuperadmin
      ? await db.select().from(staffUsers).orderBy(staffUsers.createdAt)
      : tenantId
        ? await db.select().from(staffUsers).where(eq(staffUsers.tenantId, tenantId)).orderBy(staffUsers.createdAt)
        : [];
    res.json(rows.map(safeUser));
  } catch (err) {
    res.status(500).json({ message: "Error fetching staff" });
  }
});

router.post("/", requireStaff, async (req, res) => {
  try {
    const sess = req.session as any;
    const isSuperadmin = sess.staffRole === "superadmin";
    const isOwner = sess.staffRole === "owner";
    if (!isSuperadmin && !isOwner) return res.status(403).json({ message: "Insufficient permissions" });

    let { email, password, name, role, tenantId, propertyId, whatsappNumber } = req.body;
    if (!email || !password || !name) return res.status(400).json({ message: "email, password and name required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    if (!isSuperadmin) {
      tenantId = sess.staffTenantId;
      if (!["manager", "staff", "readonly"].includes(role ?? "")) role = "staff";
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db.insert(staffUsers).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      role: role ?? "readonly",
      tenantId: tenantId ?? null,
      propertyId: propertyId ?? null,
      whatsappNumber: whatsappNumber ?? null,
    }).returning();
    res.status(201).json(safeUser(created));
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ message: "User with that email already exists" });
    res.status(500).json({ message: "Error creating user" });
  }
});

router.patch("/:id", requireStaff, async (req, res) => {
  try {
    const sess = req.session as any;
    const isSuperadmin = sess.staffRole === "superadmin";
    const isOwner = sess.staffRole === "owner";
    if (!isSuperadmin && !isOwner) return res.status(403).json({ message: "Insufficient permissions" });

    const { name, role, tenantId, propertyId, isActive, password, whatsappNumber } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (isActive !== undefined) updates.isActive = isActive;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (isSuperadmin) {
      if (role !== undefined) updates.role = role;
      if (tenantId !== undefined) updates.tenantId = tenantId;
      if (propertyId !== undefined) updates.propertyId = propertyId;
    } else if (isOwner && role !== undefined) {
      if (!["manager", "staff", "readonly"].includes(role)) return res.status(403).json({ message: "Cannot assign that role" });
      updates.role = role;
    }
    if (password) {
      if (password.length < 8) return res.status(400).json({ message: "Minimum 8 characters" });
      updates.passwordHash = await hashPassword(password);
    }

    const where = isSuperadmin
      ? eq(staffUsers.id, req.params.id!)
      : and(eq(staffUsers.id, req.params.id!), eq(staffUsers.tenantId, sess.staffTenantId));
    const [updated] = await db.update(staffUsers).set(updates).where(where).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(safeUser(updated));
  } catch (err) {
    res.status(500).json({ message: "Error updating user" });
  }
});

router.delete("/:id", requireStaff, async (req, res) => {
  try {
    const sess = req.session as any;
    const isSuperadmin = sess.staffRole === "superadmin";
    const isOwner = sess.staffRole === "owner";
    if (!isSuperadmin && !isOwner) return res.status(403).json({ message: "Insufficient permissions" });

    const where = isSuperadmin
      ? eq(staffUsers.id, req.params.id!)
      : and(eq(staffUsers.id, req.params.id!), eq(staffUsers.tenantId, sess.staffTenantId));
    const [updated] = await db.update(staffUsers).set({ isActive: false, updatedAt: new Date() }).where(where).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Error deactivating user" });
  }
});

export default router;
```

- [ ] **Step 5: Create server/knowledge-routes.ts**

Port platform KB routes from capitan-dd `server/knowledge-routes.ts`. Only the platform-level KB endpoints:
- `GET /api/knowledge/platform` — list all platform KB entries
- `POST /api/knowledge/platform` — create entry
- `PUT /api/knowledge/platform/:id` — update entry
- `DELETE /api/knowledge/platform/:id` — delete entry
- `PATCH /api/knowledge/platform/:id/reorder` — reorder entry
- `POST /api/knowledge/platform/import-url` — import content from URL

These manage the knowledge base that powers the LIRE Help landing page chatbot.

- [ ] **Step 6: Create server/platform-sessions-routes.ts**

Port from capitan-dd `server/platform-sessions-routes.ts`. Tracks conversations from the landing page chat widget:
- `POST /api/platform-sessions` — upsert session (called by chat endpoint after each turn)
- `GET /api/platform-sessions` — list all sessions (admin)
- `GET /api/platform-sessions/:id` — get single session (admin)
- `PATCH /api/platform-sessions/:id/tags` — update tags (admin)

- [ ] **Step 7: Commit**

```bash
git add server/storage.ts server/properties-routes.ts server/agents-routes.ts server/staff-routes.ts server/knowledge-routes.ts server/platform-sessions-routes.ts
git commit -m "feat: add server routes (tenants, properties, agents, staff, knowledge, platform sessions)"
```

---

## Task 5: Rewrite server.js → server.ts (Full Express Setup)

**Files:**
- Rename/rewrite: `server.js` → `server.ts`

This is the biggest change. The new server.ts must:
1. Keep the existing `/api/chat` endpoint (concierge)
2. Add session middleware (express-session + PostgreSQL store)
3. Mount auth, properties, agents, staff routes
4. Add `/api/public/brand` endpoint (LIRE branded)
5. Serve the Vite SPA at `/login`, `/dashboard` routes
6. Keep serving the landing page at `/`

- [ ] **Step 1: Create server.ts** (replaces server.js)

The full file is too long to inline — port from `capitan-dd/server/index.ts` with these key changes:

1. **Session cookie domain:** `.lire-help.com` (not `.host-help.com`)
2. **CORS origins:** `*.lire-help.com` (not `*.host-help.com`)
3. **Brand endpoint defaults:** name="LIRE Help", agentEmoji="LH", primaryColor="#0F2942"
4. **SPA serving:** `/app/` static + fallback for `/login`, `/dashboard`
5. **Landing page:** existing `public/index.html` stays at `/`
6. **Chat endpoint:** keep existing `/api/chat` as-is
7. **No table auto-creation needed** — use `drizzle-kit push` instead
8. **Dev mode:** use Vite middleware for HMR

Key sections to include:
- Express + helmet + JSON parser
- Session middleware (connect-pg-simple)
- CORS for `*.lire-help.com`
- Mount: `/api/auth` → authRouter, `/api/properties` → propertiesRouter, `/api/agents` → agentsRouter, `/api/staff` → staffRouter
- `/api/public/brand` — returns LIRE Help branding
- `/api/chat` — existing concierge endpoint
- `/api/health` — health check
- Static serving: Vite dev middleware or dist/admin + public

- [ ] **Step 2: Delete server.js**

- [ ] **Step 3: Commit**

```bash
git add server.ts && git rm server.js
git commit -m "feat: rewrite server.js → server.ts with auth, sessions, route mounting, SPA serving"
```

---

## Task 6: React Client — SPA Shell

**Files:**
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/index.css`
- Create: `client/src/lib/auth.tsx`
- Create: `client/src/lib/api.ts`

- [ ] **Step 1: Create client/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LIRE Help — Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create client/src/index.css**

Same as capitan-dd's `index.css` but replace the `hosthelp-theme` with a `lire-theme` using LIRE's steel blue (#2563EB) as primary:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 217 91% 60%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 217 91% 60%;
    --radius: 0.5rem;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

- [ ] **Step 3: Create client/src/lib/api.ts**

```typescript
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
```

- [ ] **Step 4: Create client/src/lib/auth.tsx**

Direct port from capitan-dd `client/src/lib/auth.tsx`. No changes needed.

- [ ] **Step 5: Create client/src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] **Step 6: Create client/src/App.tsx**

```tsx
import { Route, Switch, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./lib/auth";
import PlatformDashboard from "./pages/platform-dashboard";
import LoginPage from "./pages/login";

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>;

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/dashboard" /> : <LoginPage />}
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={PlatformDashboard} />
      </Route>
      <Route>
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add client/
git commit -m "feat: add React SPA shell (login + routing + auth context + Tailwind)"
```

---

## Task 7: Login Page (LIRE Branded)

**Files:**
- Create: `client/src/pages/login.tsx`

- [ ] **Step 1: Create login.tsx**

Port from capitan-dd but rebrand: LIRE blue (#0F2942 background), "LIRE Help" title, industrial building SVG icon instead of emoji, blue button (#2563EB).

```tsx
import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface PropertyBrand {
  name: string;
  agentName: string;
  logoUrl?: string;
  primaryColor?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState<PropertyBrand | null>(null);

  useEffect(() => {
    fetch(`/api/public/brand?host=${encodeURIComponent(window.location.hostname)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: PropertyBrand | null) => { if (data) setBrand(data); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: brand?.primaryColor ?? "#0F2942" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-24 h-24 rounded-2xl bg-[#0F2942]/8 flex items-center justify-center shadow-inner">
              <svg style={{ width: 56, height: 56, stroke: "#2563EB", fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }} viewBox="0 0 24 24">
                <path d="M3 21V9l5-4v16H3zm6 0V7l6-5v19H9zm8 0V5l4-3v19h-4z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{brand?.name ?? "LIRE Help"}</h1>
          <p className="text-sm text-gray-500 mt-1">Administration Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                placeholder="********"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/login.tsx
git commit -m "feat: add LIRE Help login page (blue industrial theme)"
```

---

## Task 8: Platform Dashboard (Tenants + LIRE Help Tabs)

**Files:**
- Create: `client/src/pages/platform-dashboard.tsx`

- [ ] **Step 1: Create platform-dashboard.tsx**

Port from capitan-dd's `platform-dashboard.tsx` with two tabs, same as Host Help:

**Tab 1: Tenants** — list tenants/properties/agents
**Tab 2: LIRE Help** — KB panel (chatbot knowledge base) + sessions panel (landing page chat conversations)

Key differences from capitan-dd:
- Header: "LIRE Help" + blue theme (SVG icon, not logo image)
- Second tab labeled "LIRE Help" (not "Host Help")
- All `host-help.com` references → `lire-help.com`
- CreateOwnerModal: `<slug>.lire-help.com` in description
- KB panel: "LIRE Help Agent — Knowledge Base" title, manages what the landing page chatbot knows
- Sessions panel: tracks conversations from the landing page chat widget

Components to include (all in the same file, matching capitan-dd pattern):
1. `PlatformSessionsPanel` — lists chat sessions with intent/type filters, expandable rows, tag editor
2. `PlatformKbPanel` — CRUD for knowledge base entries (create, edit, delete, reorder, import from URL)
3. `CreateOwnerModal` — create owner account for a tenant
4. `PlatformDashboard` (default export) — header, tab nav, main content

Data fetching:
- Tenants: `GET /api/properties/tenants`
- Properties: `GET /api/properties`
- Agents: `GET /api/agents`
- KB entries: `GET /api/knowledge/platform`
- Sessions: `GET /api/platform-sessions` (auto-refresh 30s)

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/platform-dashboard.tsx
git commit -m "feat: add LIRE Help platform dashboard (tenants + KB + sessions)"
```

---

## Task 9: Install, Build, Test Locally

- [ ] **Step 1: Install dependencies**

```bash
cd D:\Artificial\ INTELLIGENCE\Claude\ Code\Lire-Help
npm install
```

- [ ] **Step 2: Set up environment variables**

Create `.env` with:
```
DATABASE_URL=postgresql://...  (LIRE Help PostgreSQL instance)
SESSION_SECRET=lire-help-session-secret-change-me
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=development
COOKIE_DOMAIN=.lire-help.com
```

- [ ] **Step 3: Push schema to DB**

```bash
npx drizzle-kit push
```

- [ ] **Step 4: Create superadmin user** (seed script or manual SQL)

```bash
node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('your-password', 12).then(h => console.log(h));
" | ... insert into staff_users
```

(Or create a one-time seed script.)

- [ ] **Step 5: Run dev server**

```bash
npm run dev
```

Verify:
- Landing page at `http://localhost:3000`
- Login at `http://localhost:3000/login`
- Dashboard at `http://localhost:3000/dashboard` (after login)
- Chat demo still works at landing page

- [ ] **Step 6: Build for production**

```bash
npm run build
```

- [ ] **Step 7: Commit everything**

```bash
git add .
git commit -m "feat: LIRE Help login + platform dashboard — full-stack port complete"
```

---

## Task 10: Deploy to Railway

- [ ] **Step 1: Verify Railway environment variables are set**

Required on Railway:
- `DATABASE_URL`
- `SESSION_SECRET`
- `ANTHROPIC_API_KEY`
- `NODE_ENV=production`
- `COOKIE_DOMAIN=.lire-help.com`

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```

Railway auto-deploys from main. Verify:
- `https://lire-help.com` → landing page
- `https://app.lire-help.com/login` → login page
- `https://app.lire-help.com/dashboard` → platform dashboard (empty tenants, ready for Berkeley)

- [ ] **Step 3: Create superadmin user in production DB**

---

*Plan complete. 10 tasks, ~45 steps.*
