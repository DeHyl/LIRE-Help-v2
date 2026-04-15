import { Router } from "express";
import { DEFAULT_INBOX_VIEW_KEY, inboxViewKeys } from "../shared/helpdesk.js";
import { requireStaff } from "./middleware/auth.js";
import {
  getHelpConversationDetail,
  getHelpInboxConversations,
  getHelpInboxNavigation,
} from "./storage.js";
import type { InboxViewKey } from "../shared/helpdesk.js";

const router = Router();

function coerceViewKey(raw: unknown): InboxViewKey {
  if (typeof raw === "string" && inboxViewKeys.includes(raw as InboxViewKey)) {
    return raw as InboxViewKey;
  }
  return DEFAULT_INBOX_VIEW_KEY;
}

router.use(requireStaff);

router.get("/inbox/navigation", async (req, res) => {
  try {
    const sess = req.session as any;
    const views = await getHelpInboxNavigation(sess?.staffTenantId ?? null, sess?.staffPropertyId ?? null);
    res.json({ views, defaultViewKey: DEFAULT_INBOX_VIEW_KEY });
  } catch (err) {
    console.error("[helpdesk inbox navigation]", err);
    res.status(500).json({ message: "Error fetching inbox navigation" });
  }
});

router.get("/inbox/conversations", async (req, res) => {
  try {
    const sess = req.session as any;
    const view = coerceViewKey(req.query["view"]);
    const conversations = await getHelpInboxConversations(view, sess?.staffTenantId ?? null, sess?.staffPropertyId ?? null);
    res.json({ view, conversations });
  } catch (err) {
    console.error("[helpdesk inbox conversations]", err);
    res.status(500).json({ message: "Error fetching conversations" });
  }
});

router.get("/inbox/conversations/:conversationId", async (req, res) => {
  try {
    const sess = req.session as any;
    const conversationId = req.params["conversationId"] as string;
    const detail = await getHelpConversationDetail(conversationId, sess?.staffTenantId ?? null, sess?.staffPropertyId ?? null);
    if (!detail) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    return res.json(detail);
  } catch (err) {
    console.error("[helpdesk conversation detail]", err);
    return res.status(500).json({ message: "Error fetching conversation detail" });
  }
});

export default router;
