import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db.js";
import { staffUsers } from "../shared/schema.js";
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
    const sess = req.session as any;
    const isSuperadmin = sess.staffRole === "superadmin";
    const tenantId = (sess.staffTenantId as string | undefined) ?? null;
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
    const sess = req.session as any;
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });

    const isSuperadmin = sess.staffRole === "superadmin";
    const tenantId = isSuperadmin
      ? (parsed.data.tenantId ?? null)
      : ((sess.staffTenantId as string | undefined) ?? null);
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
    const sess = req.session as any;
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

    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!userId) return res.status(400).json({ message: "User id is required" });
    const where = isSuperadmin
      ? eq(staffUsers.id, userId)
      : and(eq(staffUsers.id, userId), eq(staffUsers.tenantId, sess.staffTenantId));

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
    const sess = req.session as any;
    const isSuperadmin = sess.staffRole === "superadmin";
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!userId) return res.status(400).json({ message: "User id is required" });
    const where = isSuperadmin
      ? eq(staffUsers.id, userId)
      : and(eq(staffUsers.id, userId), eq(staffUsers.tenantId, sess.staffTenantId));
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
