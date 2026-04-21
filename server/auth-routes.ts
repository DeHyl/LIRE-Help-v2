import { Router } from "express";
import { z } from "zod";
import { db } from "./db.js";
import { invitations, staffUsers, type StaffUser } from "../shared/schema.js";
import { isStaffRole } from "../shared/roles.js";
import { and, eq, isNull } from "drizzle-orm";
import { hashPassword, verifyPassword, setStaffSession, safeUser } from "./helpers/authHelpers.js";
import { requireStaff } from "./middleware/auth.js";
import { buildAuthorizationUrl, handleOidcCallback } from "./platform/oidc.js";
import { readOidcProvider, readOidcProviders } from "./platform/oidc-providers.js";
import { loginLimiter } from "./helpers/rate-limiters.js";

// H7: regenerate the session id on successful authentication. Prevents session
// fixation — an attacker who managed to plant a session cookie pre-login can no
// longer ride it post-login. We regenerate first, then seed the new session
// with the staff context and save.
function regenerateAndAuthenticate(req: Parameters<typeof setStaffSession>[0], user: StaffUser): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate(async (regenErr) => {
      if (regenErr) return reject(regenErr);
      try {
        await setStaffSession(req, user);
        req.session.save((saveErr) => {
          if (saveErr) return reject(saveErr);
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

const router = Router();

router.get("/oidc/providers", (_req, res) => {
  const providers = readOidcProviders();
  res.json({
    providers: Object.values(providers).map((p) => ({ id: p.id, label: p.label })),
  });
});

router.get("/oidc/:provider/start", (req, res) => {
  const cfg = readOidcProvider(req.params.provider);
  if (!cfg) {
    res.status(404).json({ message: "Provider not configured" });
    return;
  }
  const url = buildAuthorizationUrl(cfg, req);
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ message: "Session error" });
      return;
    }
    res.redirect(url);
  });
});

router.get("/oidc/:provider/callback", async (req, res) => {
  const cfg = readOidcProvider(req.params.provider);
  if (!cfg) {
    res.status(404).send("Provider not configured");
    return;
  }
  await handleOidcCallback(req, res, cfg);
});

router.post("/login", loginLimiter, async (req, res) => {
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

    try {
      await regenerateAndAuthenticate(req, user);
    } catch (err) {
      console.error("[auth] session regenerate error:", err);
      return res.status(500).json({ message: "Session error" });
    }
    return res.json({ user: safeUser(user) });
  } catch (err) {
    console.error("[auth] login error:", err);
    return res.status(500).json({ message: "Login error" });
  }
});

// ─── Signup (invitation-only) ────────────────────────────────────────────────
//
// Trades a one-time invitation token for a staff_users row. The token carries
// the role/tenant/property scope chosen by the inviter, so the recipient
// cannot pick their own role here. The token row is marked claimed in the
// same transaction as the user insert, so two concurrent claims can't both
// win.
const signupBody = z.object({
  token: z.string().min(16).max(256),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).transform((v) => v.trim()),
  whatsappNumber: z.string().max(32).optional().nullable(),
});

router.post("/signup", async (req, res) => {
  try {
    const parsed = signupBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
    }

    const [invite] = await db.select().from(invitations).where(eq(invitations.token, parsed.data.token)).limit(1);
    if (!invite) return res.status(404).json({ message: "Invitation not found or expired" });
    if (invite.claimedAt || invite.revokedAt || invite.expiresAt.getTime() < Date.now()) {
      return res.status(404).json({ message: "Invitation not found or expired" });
    }
    if (!isStaffRole(invite.role)) {
      // Defensive: a stale invite created before a role was renamed/removed.
      return res.status(409).json({ message: "Invitation role is no longer valid" });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const result = await db.transaction(async (tx) => {
      // Re-check + lock the invitation row for the duration of the txn.
      const [claim] = await tx
        .update(invitations)
        .set({ claimedAt: new Date() })
        .where(and(
          eq(invitations.id, invite.id),
          isNull(invitations.claimedAt),
          isNull(invitations.revokedAt),
        ))
        .returning();
      if (!claim) return { conflict: true as const };

      try {
        const [created] = await tx.insert(staffUsers).values({
          email: invite.email,
          passwordHash,
          name: parsed.data.name,
          role: invite.role,
          tenantId: invite.tenantId,
          propertyId: invite.propertyId,
          whatsappNumber: parsed.data.whatsappNumber ?? null,
        }).returning();

        await tx.update(invitations)
          .set({ claimedByStaffId: created.id })
          .where(eq(invitations.id, invite.id));

        return { conflict: false as const, user: created };
      } catch (err: any) {
        if (err?.code === "23505") {
          return { conflict: false as const, duplicate: true as const };
        }
        throw err;
      }
    });

    if (result.conflict) {
      return res.status(409).json({ message: "Invitation already claimed" });
    }
    if ("duplicate" in result && result.duplicate) {
      return res.status(409).json({ message: "A user with that email already exists" });
    }

    try {
      await regenerateAndAuthenticate(req, result.user!);
    } catch (err) {
      console.error("[signup] session regenerate error:", err);
      return res.status(500).json({ message: "Session error" });
    }
    return res.status(201).json({ user: safeUser(result.user!) });
  } catch (err) {
    console.error("[signup]", err);
    return res.status(500).json({ message: "Signup error" });
  }
});

// H18: mirror the session cookie's options on clearCookie so every browser
// agrees on "that cookie". Without matching domain/path/secure/sameSite,
// some browsers retain the cookie after logout.
router.post("/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  req.session.destroy(() => {
    res.clearCookie("connect.sid", {
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
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
