import { Router } from "express";
import { requireAdmin } from "./middleware/auth.js";
import { upsertPlatformSession, getPlatformSessions, getPlatformSession, updatePlatformSessionTags } from "./storage.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { sessionId, messages, escalated = false } = req.body as {
      sessionId: string;
      messages: { role: string; content: string }[];
      escalated?: boolean;
    };
    if (!sessionId || !Array.isArray(messages))
      return res.status(400).json({ message: "sessionId and messages required" });
    const session = await upsertPlatformSession(sessionId, messages, escalated);
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
