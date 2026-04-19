import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireStaff } from "./middleware/auth.js";
import { upsertPlatformSession, getPlatformSessions, getPlatformSession, updatePlatformSessionTags } from "./storage.js";
import { platformSessionsWriteLimiter } from "./helpers/rate-limiters.js";

const router = Router();

const upsertBody = z.object({
  sessionId: z.string().min(1).max(128),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(8000),
  })).max(200),
  escalated: z.boolean().optional(),
});

router.post("/", requireStaff, platformSessionsWriteLimiter, async (req, res) => {
  try {
    const parsed = upsertBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
    }
    const session = await upsertPlatformSession(parsed.data.sessionId, parsed.data.messages, parsed.data.escalated ?? false);
    res.json({ ok: true, id: session.id });
  } catch (err) {
    console.error("[platform-sessions POST]", err);
    res.status(500).json({ message: "Error saving session" });
  }
});

router.get("/", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await getPlatformSessions(limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sessions" });
  }
});

router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const session = await getPlatformSession(req.params["id"] as string);
    if (!session) return res.status(404).json({ message: "Not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: "Error fetching session" });
  }
});

router.patch("/:id/tags", requireAdmin, async (req, res) => {
  try {
    const { tags } = req.body as { tags: string[] };
    if (!Array.isArray(tags)) return res.status(400).json({ message: "tags must be an array" });
    const row = await updatePlatformSessionTags(req.params["id"] as string, tags);
    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: "Error updating tags" });
  }
});

export default router;
