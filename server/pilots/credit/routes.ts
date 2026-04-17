import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../../db.js";
import {
  archiveLog,
  creditApprovals,
  creditChecklistRuns,
  creditDocuments,
  creditExtractions,
  creditMemos,
  insertCreditApprovalSchema,
  insertCreditChecklistRunSchema,
  insertCreditDocumentSchema,
  insertCreditMemoSchema,
  insertLesseeSchema,
  lessees,
} from "../../../shared/schema.js";
import { requireStaff, requireStaffRole } from "../../middleware/auth.js";
import { loadTenantYaml } from "../tenant-config.js";

type ChecklistRubric = {
  version: string;
  rules: Array<{ id: string; category: string; description: string }>;
};

const router = Router();
router.use(requireStaff);

function getTenantContext(req: Request) {
  const sess = req.session as any;
  return {
    tenantId: sess?.staffTenantId as string | null | undefined,
    tenantSlug: sess?.staffTenantSlug as string | null | undefined,
    staffId: sess?.staffId as string | null | undefined,
  };
}

async function appendArchive(params: {
  tenantId: string;
  subjectType: string;
  subjectId: string;
  actorStaffId: string | null;
  eventType: string;
  payload: unknown;
}) {
  const serialized = JSON.stringify(params.payload ?? {});
  const payloadSha256 = createHash("sha256").update(serialized).digest("hex");
  await db.insert(archiveLog).values({
    tenantId: params.tenantId,
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    actorStaffId: params.actorStaffId,
    eventType: params.eventType,
    payloadJson: params.payload as any,
    payloadSha256,
  });
}

router.get("/rubric", async (req: Request, res: Response) => {
  const { tenantSlug } = getTenantContext(req);
  if (!tenantSlug) return res.status(400).json({ message: "Missing tenant context" });
  try {
    const rubric = await loadTenantYaml<ChecklistRubric>(tenantSlug, "credit-checklist.yaml");
    return res.json(rubric);
  } catch (err) {
    console.error("[credit rubric]", err);
    return res.status(404).json({ message: "Rubric not found for tenant" });
  }
});

router.get("/lessees", async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
  const rows = await db.select().from(lessees).where(eq(lessees.tenantId, tenantId)).orderBy(desc(lessees.updatedAt));
  return res.json({ lessees: rows });
});

router.post("/lessees", async (req: Request, res: Response) => {
  const { tenantId, staffId } = getTenantContext(req);
  if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
  const parsed = insertLesseeSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) return res.status(400).json({ message: "Invalid lessee payload", issues: parsed.error.issues });
  const [row] = await db.insert(lessees).values(parsed.data).returning();
  await appendArchive({
    tenantId,
    subjectType: "lessee",
    subjectId: row.id,
    actorStaffId: staffId ?? null,
    eventType: "lessee.created",
    payload: row,
  });
  return res.status(201).json({ lessee: row });
});

router.post("/documents", async (req: Request, res: Response) => {
  const { tenantId, staffId } = getTenantContext(req);
  if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
  const parsed = insertCreditDocumentSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) return res.status(400).json({ message: "Invalid document payload", issues: parsed.error.issues });
  const [row] = await db.insert(creditDocuments).values(parsed.data).returning();
  await appendArchive({
    tenantId,
    subjectType: "credit_document",
    subjectId: row.id,
    actorStaffId: staffId ?? null,
    eventType: "document.uploaded",
    payload: { id: row.id, sha256: row.sha256, classification: row.classification },
  });
  return res.status(201).json({ document: row });
});

router.get("/lessees/:lesseeId/extractions", async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
  const lesseeId = req.params["lesseeId"] as string;
  const [lessee] = await db
    .select()
    .from(lessees)
    .where(and(eq(lessees.id, lesseeId), eq(lessees.tenantId, tenantId)))
    .limit(1);
  if (!lessee) return res.status(404).json({ message: "Lessee not found" });

  const docs = await db
    .select()
    .from(creditDocuments)
    .where(eq(creditDocuments.lesseeId, lesseeId));

  const docIds = docs.map((d: { id: string }) => d.id);
  if (docIds.length === 0) return res.json({ extractions: [] });

  const extractions = await db
    .select()
    .from(creditExtractions)
    .where(eq(creditExtractions.tenantId, tenantId));

  return res.json({
    extractions: extractions.filter((e: { documentId: string }) => docIds.includes(e.documentId)),
  });
});

router.post("/checklist-runs", async (req: Request, res: Response) => {
  const { tenantId, staffId } = getTenantContext(req);
  if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
  const parsed = insertCreditChecklistRunSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) return res.status(400).json({ message: "Invalid checklist run payload", issues: parsed.error.issues });
  const [row] = await db.insert(creditChecklistRuns).values(parsed.data).returning();
  await appendArchive({
    tenantId,
    subjectType: "credit_checklist_run",
    subjectId: row.id,
    actorStaffId: staffId ?? null,
    eventType: "checklist_run.started",
    payload: { id: row.id, rubricVersion: row.rubricVersion, lesseeId: row.lesseeId },
  });
  return res.status(201).json({ run: row });
});

router.post("/memos", async (req: Request, res: Response) => {
  const { tenantId, staffId } = getTenantContext(req);
  if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
  const parsed = insertCreditMemoSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) return res.status(400).json({ message: "Invalid memo payload", issues: parsed.error.issues });
  const [row] = await db.insert(creditMemos).values(parsed.data).returning();
  await appendArchive({
    tenantId,
    subjectType: "credit_memo",
    subjectId: row.id,
    actorStaffId: staffId ?? null,
    eventType: "memo.drafted",
    payload: { id: row.id, templateVersion: row.templateVersion, aiModel: row.aiModel },
  });
  return res.status(201).json({ memo: row });
});

router.post(
  "/memos/:memoId/approvals",
  requireStaffRole("analyst", "manager", "senior_reviewer", "superadmin"),
  async (req: Request, res: Response) => {
    const { tenantId, staffId } = getTenantContext(req);
    if (!tenantId || !staffId) return res.status(400).json({ message: "Missing tenant or staff context" });
    const memoId = req.params["memoId"] as string;
    const parsed = insertCreditApprovalSchema.safeParse({
      ...req.body,
      tenantId,
      memoId,
      analystStaffId: staffId,
    });
    if (!parsed.success) return res.status(400).json({ message: "Invalid approval payload", issues: parsed.error.issues });
    const [row] = await db.insert(creditApprovals).values(parsed.data).returning();
    await appendArchive({
      tenantId,
      subjectType: "credit_memo",
      subjectId: memoId,
      actorStaffId: staffId,
      eventType: `memo.${row.decision}`,
      payload: { approvalId: row.id, reason: row.reason },
    });
    return res.status(201).json({ approval: row });
  },
);

router.get("/archive", requireStaffRole("compliance", "superadmin"), async (req: Request, res: Response) => {
  const { tenantId } = getTenantContext(req);
  if (!tenantId) return res.status(400).json({ message: "Missing tenant context" });
  const subjectType = typeof req.query["subjectType"] === "string" ? req.query["subjectType"] : null;
  const subjectId = typeof req.query["subjectId"] === "string" ? req.query["subjectId"] : null;

  const base = subjectType && subjectId
    ? and(eq(archiveLog.tenantId, tenantId), eq(archiveLog.subjectType, subjectType), eq(archiveLog.subjectId, subjectId))
    : eq(archiveLog.tenantId, tenantId);

  const rows = await db.select().from(archiveLog).where(base).orderBy(desc(archiveLog.createdAt)).limit(500);
  return res.json({ entries: rows });
});

export default router;
