import { randomBytes } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db.js";
import { invitations, staffUsers, tenants } from "../shared/schema.js";
import {
  STAFF_ROLES,
  canInviteAnyone,
  canInviteRole,
  invitableRolesFor,
  type StaffRole,
} from "../shared/roles.js";
import { requireStaff } from "./middleware/auth.js";
import { assertPropertyInTenant, PropertyScopeError } from "./helpers/tenant-scope.js";

const router = Router();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSession(req: Request) {
  const sess = req.session as any;
  return {
    staffId: sess?.staffId as string | undefined,
    role: sess?.staffRole as StaffRole | undefined,
    tenantId: sess?.staffTenantId as string | null | undefined,
  };
}

// Only roles that can invite at least one other role may touch this surface.
function requireInviter(req: Request, res: Response, next: NextFunction) {
  const { role } = getSession(req);
  if (!role || !canInviteAnyone(role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  return next();
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function isExpired(invite: { expiresAt: Date; claimedAt: Date | null; revokedAt: Date | null }) {
  return Boolean(invite.revokedAt) || Boolean(invite.claimedAt) || invite.expiresAt.getTime() < Date.now();
}

function publicSafe(invite: typeof invitations.$inferSelect) {
  // Never expose the raw token or the inviter id over the lookup endpoint —
  // the token is the bearer credential and the inviter id is internal.
  return {
    email: invite.email,
    role: invite.role,
    tenantId: invite.tenantId,
    propertyId: invite.propertyId,
    expiresAt: invite.expiresAt,
    claimed: Boolean(invite.claimedAt),
    revoked: Boolean(invite.revokedAt),
  };
}

const createBody = z.object({
  email: z.string().email().max(254).transform((v) => v.toLowerCase().trim()),
  role: z.enum(STAFF_ROLES),
  propertyId: z.string().uuid().nullish(),
  tenantId: z.string().uuid().optional(),
});

// ─── List invitations ────────────────────────────────────────────────────────
router.get("/", requireStaff, requireInviter, async (req, res) => {
  try {
    const { role, tenantId } = getSession(req);
    const isSuperadmin = role === "superadmin";
    const rows = isSuperadmin
      ? await db.select().from(invitations).orderBy(desc(invitations.createdAt))
      : tenantId
        ? await db
            .select()
            .from(invitations)
            .where(eq(invitations.tenantId, tenantId))
            .orderBy(desc(invitations.createdAt))
        : [];
    res.json(
      rows.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        tenantId: row.tenantId,
        propertyId: row.propertyId,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        claimedAt: row.claimedAt,
        revokedAt: row.revokedAt,
        invitedByStaffId: row.invitedByStaffId,
      })),
    );
  } catch (err) {
    console.error("[invitations list]", err);
    res.status(500).json({ message: "Error fetching invitations" });
  }
});

// ─── Create invitation ───────────────────────────────────────────────────────
router.post("/", requireStaff, requireInviter, async (req, res) => {
  try {
    const session = getSession(req);
    if (!session.role || !session.staffId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
    }

    if (!canInviteRole(session.role, parsed.data.role)) {
      return res.status(403).json({
        message: `Cannot invite role '${parsed.data.role}'`,
        allowed: invitableRolesFor(session.role),
      });
    }

    const isSuperadmin = session.role === "superadmin";
    const tenantId = isSuperadmin
      ? (parsed.data.tenantId ?? session.tenantId ?? null)
      : (session.tenantId ?? null);
    if (!isSuperadmin && !tenantId) {
      return res.status(400).json({ message: "Session has no tenant" });
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

    // Block invites to addresses that already have an active account in scope.
    // We don't reveal whether an out-of-scope email exists.
    const existing = await db
      .select({ id: staffUsers.id, isActive: staffUsers.isActive })
      .from(staffUsers)
      .where(eq(staffUsers.email, parsed.data.email))
      .limit(1);
    if (existing[0]?.isActive) {
      return res.status(409).json({ message: "A user with that email already exists" });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const [created] = await db.insert(invitations).values({
      email: parsed.data.email,
      role: parsed.data.role,
      tenantId,
      propertyId: parsed.data.propertyId ?? null,
      token,
      invitedByStaffId: session.staffId,
      expiresAt,
    }).returning();

    res.status(201).json({
      id: created.id,
      email: created.email,
      role: created.role,
      tenantId: created.tenantId,
      propertyId: created.propertyId,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
      // Returned exactly once at creation time so the inviter can copy the
      // signup link out-of-band. Never exposed by GET endpoints afterwards.
      token: created.token,
    });
  } catch (err) {
    console.error("[invitations create]", err);
    res.status(500).json({ message: "Error creating invitation" });
  }
});

// ─── Revoke invitation ───────────────────────────────────────────────────────
router.delete("/:id", requireStaff, requireInviter, async (req, res) => {
  try {
    const { role, tenantId } = getSession(req);
    if (!role) return res.status(401).json({ message: "Authentication required" });

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) return res.status(400).json({ message: "id required" });

    const isSuperadmin = role === "superadmin";
    const where = isSuperadmin
      ? eq(invitations.id, id)
      : tenantId
        ? and(eq(invitations.id, id), eq(invitations.tenantId, tenantId))
        : eq(invitations.id, "__never__");

    const [row] = await db
      .update(invitations)
      .set({ revokedAt: new Date() })
      .where(and(where, isNull(invitations.claimedAt), isNull(invitations.revokedAt)))
      .returning();
    if (!row) return res.status(404).json({ message: "Invitation not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[invitations revoke]", err);
    res.status(500).json({ message: "Error revoking invitation" });
  }
});

// ─── Public lookup (no auth) ─────────────────────────────────────────────────
// The signup page calls this to render the recipient's email + role + tenant
// name before they choose a password. Returns 404 for unknown/expired tokens
// so we don't leak which tokens exist.
router.get("/lookup/:token", async (req, res) => {
  try {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    if (!token) return res.status(404).json({ message: "Invitation not found" });

    const [row] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
    if (!row || isExpired(row)) return res.status(404).json({ message: "Invitation not found or expired" });

    let tenantName: string | null = null;
    if (row.tenantId) {
      const [t] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, row.tenantId)).limit(1);
      tenantName = t?.name ?? null;
    }

    res.json({ ...publicSafe(row), tenantName });
  } catch (err) {
    console.error("[invitations lookup]", err);
    res.status(500).json({ message: "Lookup error" });
  }
});

export default router;
