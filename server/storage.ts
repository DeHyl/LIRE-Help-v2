import { db } from "./db.js";
import { tenants, properties, agents, platformKnowledge, platformSessions } from "../shared/schema.js";
import { DEFAULT_INBOX_VIEW_KEY, helpdeskMockData } from "../shared/helpdesk.js";
import { eq, desc } from "drizzle-orm";
import type {
  Tenant,
  InsertTenant,
  Property,
  InsertProperty,
  Agent,
  InsertAgent,
  PlatformKnowledgeEntry,
  PlatformSession,
} from "../shared/schema.js";
import type {
  ConversationDetail,
  ConversationRow,
  InboxViewDefinition,
  InboxViewKey,
} from "../shared/helpdesk.js";

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

// ─── Platform Knowledge ─────────────────────────────────────────────────────

export async function getPlatformKnowledge(): Promise<PlatformKnowledgeEntry[]> {
  return db.select().from(platformKnowledge).orderBy(platformKnowledge.sortOrder);
}

export async function createPlatformKnowledge(data: { section: string; title: string; content: string }): Promise<PlatformKnowledgeEntry> {
  const entries = await getPlatformKnowledge();
  const maxOrder = entries.length > 0 ? Math.max(...entries.map(e => e.sortOrder)) : -1;
  const [row] = await db.insert(platformKnowledge).values({ ...data, sortOrder: maxOrder + 1 }).returning();
  return row!;
}

export async function updatePlatformKnowledge(id: string, data: Partial<{ section: string; title: string; content: string }>): Promise<PlatformKnowledgeEntry | null> {
  const [row] = await db.update(platformKnowledge).set({ ...data, updatedAt: new Date() }).where(eq(platformKnowledge.id, id)).returning();
  return row ?? null;
}

export async function deletePlatformKnowledge(id: string): Promise<void> {
  await db.delete(platformKnowledge).where(eq(platformKnowledge.id, id));
}

export async function reorderPlatformKnowledge(id: string, direction: "up" | "down"): Promise<PlatformKnowledgeEntry[]> {
  const entries = await getPlatformKnowledge();
  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return entries;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= entries.length) return entries;
  // Swap sort orders
  const a = entries[idx]!;
  const b = entries[swapIdx]!;
  await db.update(platformKnowledge).set({ sortOrder: b.sortOrder }).where(eq(platformKnowledge.id, a.id));
  await db.update(platformKnowledge).set({ sortOrder: a.sortOrder }).where(eq(platformKnowledge.id, b.id));
  return getPlatformKnowledge();
}

// ─── Platform Sessions ──────────────────────────────────────────────────────

export async function upsertPlatformSession(sessionId: string, messages: { role: string; content: string }[], escalated: boolean): Promise<PlatformSession> {
  const [existing] = await db.select().from(platformSessions).where(eq(platformSessions.sessionId, sessionId));
  if (existing) {
    const [row] = await db.update(platformSessions).set({
      messages,
      messageCount: messages.length,
      escalatedToWa: escalated || existing.escalatedToWa,
      lastMessageAt: new Date(),
    }).where(eq(platformSessions.id, existing.id)).returning();
    return row!;
  }
  const [row] = await db.insert(platformSessions).values({
    sessionId,
    messages,
    messageCount: messages.length,
    escalatedToWa: escalated,
  }).returning();
  return row!;
}

export async function getPlatformSessions(limit = 100): Promise<PlatformSession[]> {
  return db.select().from(platformSessions).orderBy(desc(platformSessions.lastMessageAt)).limit(limit);
}

export async function getPlatformSession(id: string): Promise<PlatformSession | null> {
  const [row] = await db.select().from(platformSessions).where(eq(platformSessions.id, id));
  return row ?? null;
}

export async function updatePlatformSessionTags(id: string, tags: string[]): Promise<PlatformSession | null> {
  const [row] = await db.update(platformSessions).set({ tags }).where(eq(platformSessions.id, id)).returning();
  return row ?? null;
}

// ─── Help Inbox Scaffolding / Adapter Fallback ──────────────────────────────

function matchesInboxView(conversation: ConversationRow, viewKey: InboxViewKey): boolean {
  switch (viewKey) {
    case "assigned":
      return conversation.assignmentState === "assigned";
    case "unassigned":
      return conversation.assignmentState === "unassigned";
    case "awaiting_reply":
      return conversation.status === "open" || conversation.status === "pending";
    case "sla_at_risk":
      return conversation.slaState === "at_risk" || conversation.slaState === "breached";
    case "closed_recently":
      return conversation.status === "resolved";
    case "support":
      return conversation.inboxLabel === "Support";
    case "escalations":
      return conversation.inboxLabel === "Escalations";
    case "billing":
      return conversation.inboxLabel === "Billing";
    case "vip":
      return conversation.inboxLabel === "VIP";
    case "high_priority":
      return conversation.priority === "high" || conversation.priority === "urgent";
    case "bugs":
      return conversation.tags.includes("bug");
    case "renewals":
      return conversation.tags.includes("renewal") || conversation.tags.includes("pricing");
    case "all":
    default:
      return true;
  }
}

function getScaffoldConversations(_tenantId?: string | null, _propertyId?: string | null): ConversationRow[] {
  return helpdeskMockData.conversations;
}

export async function getHelpInboxNavigation(tenantId?: string | null, propertyId?: string | null): Promise<InboxViewDefinition[]> {
  const conversations = getScaffoldConversations(tenantId, propertyId);
  return helpdeskMockData.views.map((view) => ({
    ...view,
    count: conversations.filter((conversation) => matchesInboxView(conversation, view.key)).length,
  }));
}

export async function getHelpInboxConversations(
  viewKey: InboxViewKey = DEFAULT_INBOX_VIEW_KEY,
  tenantId?: string | null,
  propertyId?: string | null,
): Promise<ConversationRow[]> {
  const conversations = getScaffoldConversations(tenantId, propertyId);
  return conversations.filter((conversation) => matchesInboxView(conversation, viewKey));
}

export async function getHelpConversationDetail(
  conversationId: string,
  tenantId?: string | null,
  propertyId?: string | null,
): Promise<ConversationDetail | null> {
  const conversations = getScaffoldConversations(tenantId, propertyId);
  const exists = conversations.some((conversation) => conversation.id === conversationId);
  if (!exists) return null;
  return helpdeskMockData.details[conversationId] ?? null;
}
