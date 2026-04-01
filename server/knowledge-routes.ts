import { Router } from "express";
import { requireAdmin } from "./middleware/auth.js";
import { getPlatformKnowledge, createPlatformKnowledge, updatePlatformKnowledge, deletePlatformKnowledge, reorderPlatformKnowledge } from "./storage.js";

const router = Router();

router.get("/platform", requireAdmin, async (_req, res) => {
  try {
    res.json(await getPlatformKnowledge());
  } catch (err) {
    res.status(500).json({ message: "Error fetching knowledge base" });
  }
});

router.post("/platform", requireAdmin, async (req, res) => {
  try {
    const { section, title, content } = req.body;
    if (!section || !title || !content) return res.status(400).json({ message: "section, title, and content required" });
    const entry = await createPlatformKnowledge({ section, title, content });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: "Error creating entry" });
  }
});

router.put("/platform/:id", requireAdmin, async (req, res) => {
  try {
    const { section, title, content } = req.body;
    const entry = await updatePlatformKnowledge(req.params["id"] as string, { section, title, content });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: "Error updating entry" });
  }
});

router.delete("/platform/:id", requireAdmin, async (req, res) => {
  try {
    await deletePlatformKnowledge(req.params["id"] as string);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Error deleting entry" });
  }
});

router.patch("/platform/:id/reorder", requireAdmin, async (req, res) => {
  try {
    const { direction } = req.body as { direction: "up" | "down" };
    const entries = await reorderPlatformKnowledge(req.params["id"] as string, direction);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: "Error reordering" });
  }
});

export default router;
