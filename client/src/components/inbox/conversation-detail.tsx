import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare, Sparkles } from "lucide-react";
import { helpdeskApi } from "../../lib/helpdesk";
import type { ConversationDetail, ConversationRow, ConversationStatus, PriorityLevel } from "./types";
import {
  Badge,
  Button,
  EmptyState,
  PriorityBadge,
  Select,
  SlaBadge,
  StatusBadge,
  Textarea,
} from "../ui";

interface ConversationDetailProps {
  conversation: ConversationRow | undefined;
  detail: ConversationDetail | undefined;
  detailLoading?: boolean;
  onMutated?: () => Promise<void> | void;
}

const timelineKinds = {
  customer: { eyebrow: "Tenant", barColor: "" },
  teammate: { eyebrow: "Teammate", barColor: "" },
  internal_note: { eyebrow: "Internal note", barColor: "var(--accent-press)" },
  system: { eyebrow: "System", barColor: "" },
} as const;

const statuses: ConversationStatus[] = ["open", "pending", "waiting_on_customer", "resolved"];
const priorities: PriorityLevel[] = ["low", "medium", "high", "urgent"];
const snoozePresets = [
  { value: "1h", label: "In 1 hour" },
  { value: "4h", label: "In 4 hours" },
  { value: "tomorrow", label: "Tomorrow morning" },
  { value: "next_week", label: "Next week" },
] as const;

type SnoozePresetValue = (typeof snoozePresets)[number]["value"];

function buildSnoozeTimestamp(preset: SnoozePresetValue): string {
  const now = new Date();
  switch (preset) {
    case "1h": {
      const next = new Date(now);
      next.setHours(next.getHours() + 1);
      return next.toISOString();
    }
    case "4h": {
      const next = new Date(now);
      next.setHours(next.getHours() + 4);
      return next.toISOString();
    }
    case "tomorrow": {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      return next.toISOString();
    }
    case "next_week": {
      const next = new Date(now);
      next.setDate(next.getDate() + 7);
      next.setHours(9, 0, 0, 0);
      return next.toISOString();
    }
  }
}

export function ConversationDetailPane({
  conversation,
  detail,
  detailLoading = false,
  onMutated,
}: ConversationDetailProps) {
  const [note, setNote] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyStatus, setReplyStatus] = useState<ConversationStatus>("waiting_on_customer");
  const [composerMode, setComposerMode] = useState<"reply" | "note">("note");
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiEscalate, setAiEscalate] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [selectedSnoozePreset, setSelectedSnoozePreset] = useState("");
  const activeConversationIdRef = useRef<string | null>(null);
  const availableAssignees = detail?.availableAssignees ?? [];
  const availableTags = detail?.availableTags ?? [];
  const attachedTagOptions = useMemo(
    () => availableTags.filter((tag) => detail?.ticket.tags.includes(tag.name)),
    [availableTags, detail?.ticket.tags],
  );
  const attachableTags = useMemo(
    () => availableTags.filter((tag) => !detail?.ticket.tags.includes(tag.name)),
    [availableTags, detail?.ticket.tags],
  );
  const busyLabel = useMemo(() => {
    if (!detail) return null;
    return detail.ticket.assignee ? `Assigned to ${detail.ticket.assignee}` : "No owner yet";
  }, [detail]);

  const conversationId = conversation?.id ?? null;
  useEffect(() => {
    activeConversationIdRef.current = conversationId;
    setNote("");
    setReplyBody("");
    setReplyStatus("waiting_on_customer");
    setComposerMode(detail?.composerMode === "reply" ? "reply" : "note");
    setAiDraft(null);
    setAiError(null);
    setAiLoading(false);
    setAiEscalate(false);
    setSelectedTagId("");
    setSelectedSnoozePreset("");
  }, [conversationId, detail?.composerMode]);

  useEffect(() => {
    setSelectedTagId((current) => {
      if (current && attachableTags.some((tag) => tag.id === current)) return current;
      return attachableTags[0]?.id ?? "";
    });
  }, [attachableTags]);

  const regenerateDraft = async () => {
    if (!conversation || !detail || aiLoading) return;
    const requestId = conversation.id;
    setAiLoading(true);
    setAiError(null);
    try {
      const tenant = detail.customer?.name || "A tenant";
      const company = detail.customer?.company ? ` from ${detail.customer.company}` : "";
      const ask = conversation.preview || conversation.subject || "requesting assistance";
      const userMsg = `I'm ${tenant}${company}. ${ask}`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMsg }],
          sessionId: `inbox-${requestId}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (activeConversationIdRef.current !== requestId) return;
      if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
      setAiDraft(((data.response as string) || "").trim() || null);
      setAiEscalate(!!data.escalate);
    } catch (err) {
      if (activeConversationIdRef.current !== requestId) return;
      setAiError(err instanceof Error ? err.message : "Draft request failed.");
    } finally {
      if (activeConversationIdRef.current === requestId) setAiLoading(false);
    }
  };

  const assigneeMutation = useMutation({
    mutationFn: (assigneeStaffId: string | null) => helpdeskApi.updateAssignee(conversation!.id, assigneeStaffId),
    onSuccess: async () => {
      await onMutated?.();
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: ConversationStatus) => helpdeskApi.updateStatus(conversation!.id, status),
    onSuccess: async () => {
      await onMutated?.();
    },
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: PriorityLevel) => helpdeskApi.updatePriority(conversation!.id, priority),
    onSuccess: async () => {
      await onMutated?.();
    },
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => helpdeskApi.addInternalNote(conversation!.id, body),
    onSuccess: async () => {
      setNote("");
      setComposerMode("note");
      await onMutated?.();
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ body, status }: { body: string; status: ConversationStatus }) =>
      helpdeskApi.replyToConversation(conversation!.id, body, status),
    onSuccess: async () => {
      setReplyBody("");
      setReplyStatus("waiting_on_customer");
      setComposerMode("reply");
      await onMutated?.();
    },
  });

  const addTagMutation = useMutation({
    mutationFn: (tagId: string) => helpdeskApi.addTag(conversation!.id, tagId),
    onSuccess: async () => {
      setSelectedTagId("");
      await onMutated?.();
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => helpdeskApi.removeTag(conversation!.id, tagId),
    onSuccess: async () => {
      await onMutated?.();
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: (snoozedUntil: string | null) => helpdeskApi.updateSnooze(conversation!.id, snoozedUntil),
    onSuccess: async () => {
      setSelectedSnoozePreset("");
      await onMutated?.();
    },
  });

  if (detailLoading && conversation) {
    return (
      <EmptyState
        tone="muted"
        title="Loading conversation"
        description="Pulling message history, ticket state, and customer context from the helpdesk API."
      />
    );
  }

  if (!conversation || !detail) {
    return (
      <EmptyState
        tone="muted"
        icon={MessageSquare}
        title="Select a conversation"
        description="Pick a ticket to see its timeline, ticket state, and next actions."
      />
    );
  }

  const mutationError =
    assigneeMutation.error
      ?? statusMutation.error
      ?? priorityMutation.error
      ?? addTagMutation.error
      ?? removeTagMutation.error
      ?? snoozeMutation.error
      ?? replyMutation.error
      ?? noteMutation.error;
  const isBusy =
    assigneeMutation.isPending
      || statusMutation.isPending
      || priorityMutation.isPending
      || addTagMutation.isPending
      || removeTagMutation.isPending
      || snoozeMutation.isPending
      || replyMutation.isPending
      || noteMutation.isPending;

  return (
    <section className="grid h-full min-h-0 flex-1 min-w-0 grid-cols-1 bg-bg 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-h-0 min-w-0 flex-col border-r border-border bg-surface">
        {/* Slim header */}
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-body text-[14px] font-semibold text-fg">{detail.title}</div>
            <div className="truncate font-body text-[12px] text-fg-muted">{detail.summary}</div>
          </div>
          <PriorityBadge priority={detail.ticket.priority} />
          {detail.ticket.slaState !== "healthy" ? <SlaBadge sla={detail.ticket.slaState} /> : null}
          <StatusBadge status={detail.ticket.status} />
        </div>

        {/* Timeline */}
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
          {detail.timeline.length > 0 ? (
            detail.timeline.map((item) => {
              const kind = timelineKinds[item.type];
              const isInternal = item.type === "internal_note";
              return (
                <article
                  key={item.id}
                  className={[
                    "rounded-sm border px-3.5 py-3",
                    isInternal ? "border-[rgba(255,77,0,0.25)] bg-[rgba(255,77,0,0.06)]" : "border-border bg-surface",
                  ].join(" ")}
                  style={kind.barColor ? { borderLeft: `3px solid ${kind.barColor}` } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="eyebrow"
                      style={{ color: isInternal ? "var(--accent-press)" : "var(--fg-muted)" }}
                    >
                      {kind.eyebrow}
                    </span>
                    <span className="text-fg-subtle">·</span>
                    <span className="font-body text-[12px] font-medium text-fg">{item.author}</span>
                    <span className="flex-1" />
                    <span className="font-mono text-[10px] text-fg-subtle">{item.createdAtLabel}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap font-body text-[13.5px] leading-[1.6] text-fg">
                    {item.body}
                  </p>
                </article>
              );
            })
          ) : (
            <div className="rounded-sm border border-dashed border-border bg-surface-2 p-5 font-body text-[13px] text-fg-muted">
              No message history yet. Add an internal note to capture next steps.
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-surface px-5 py-3">
          <div className="flex items-center gap-1.5">
            {(["reply", "note"] as const).map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant={composerMode === mode ? "dark" : "ghost"}
                onClick={() => setComposerMode(mode)}
              >
                {mode === "reply" ? "Reply" : "Internal note"}
              </Button>
            ))}
          </div>
          {composerMode === "reply" ? (
            <div className="mt-2 rounded-sm border border-border bg-surface-2">
              <Textarea
                compact
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                placeholder="Reply to the tenant…"
                disabled={replyMutation.isPending || !detail.mailbox.canReply}
                className="min-h-24 border-0 bg-transparent focus:bg-transparent"
                style={{ borderColor: "transparent" }}
              />
              <div className="flex flex-col gap-2 border-t border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <span className="font-body text-[11px] text-fg-muted">After sending</span>
                  <Select
                    compact
                    value={replyStatus}
                    onChange={(event) => setReplyStatus(event.target.value as ConversationStatus)}
                    disabled={replyMutation.isPending || !detail.mailbox.canReply}
                    className="w-full sm:w-[220px]"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <p className="font-body text-[11px] text-fg-muted">
                    Recorded in-app only. No outbound email is sent in this phase.
                  </p>
                  <Button
                    size="sm"
                    variant="dark"
                    loading={replyMutation.isPending}
                    disabled={!replyBody.trim() || replyMutation.isPending || !detail.mailbox.canReply}
                    onClick={() => replyMutation.mutate({ body: replyBody, status: replyStatus })}
                  >
                    {replyMutation.isPending ? "Sending…" : "Send reply"}
                  </Button>
                </div>
              </div>
              {!detail.mailbox.canReply ? (
                <p className="border-t border-border px-3 py-2 font-body text-[11px] text-fg-muted">
                  Replies are disabled for deleted conversations.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 rounded-sm border border-[rgba(255,77,0,0.4)] bg-[rgba(255,77,0,0.04)]">
              <Textarea
                compact
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add context for the next operator, manager, or specialist…"
                className="min-h-24 border-0 bg-transparent focus:bg-transparent"
                style={{ borderColor: "transparent" }}
              />
              <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5">
                <p className="font-body text-[11px] text-fg-muted">
                  Internal notes stay in the operator timeline and don't send to the tenant.
                </p>
                <Button
                  size="sm"
                  variant="dark"
                  loading={noteMutation.isPending}
                  disabled={!note.trim() || noteMutation.isPending}
                  onClick={() => noteMutation.mutate(note)}
                >
                  {noteMutation.isPending ? "Saving…" : "Add note"}
                </Button>
              </div>
            </div>
          )}
          {mutationError instanceof Error ? (
            <p className="mt-2 font-body text-[12px] text-error">{mutationError.message}</p>
          ) : null}
        </div>
      </div>

      {/* Right rail */}
      <aside className="min-h-0 overflow-y-auto bg-bg px-4 py-4 space-y-3">
        <section className="rounded-sm bg-[#111111] p-3.5 text-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <div className="eyebrow text-[#FAFAFA]">Suggested next step</div>
            <span className="flex-1" />
            {aiDraft ? <Badge tone="success" size="sm">LIVE · CLAUDE</Badge> : null}
            {aiEscalate ? <Badge tone="warning" size="sm">ESCALATE</Badge> : null}
          </div>
          <div className="mt-2.5 font-body text-[12px] leading-[1.5] text-[rgba(255,255,255,0.72)]">
            {aiEscalate
              ? "Concierge flagged this for human escalation. Review draft before sending."
              : aiDraft
              ? "Drafted live from the platform knowledge base."
              : "Generate a reply using the property knowledge base and this conversation's context."}
          </div>
          {(aiDraft || aiLoading) ? (
            <div
              className="mt-2.5 whitespace-pre-wrap rounded-xs border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] px-3 py-2.5 font-body text-[13px] leading-[1.5]"
            >
              {aiLoading ? "Drafting from the live knowledge base…" : aiDraft}
            </div>
          ) : null}
          {aiError ? (
            <div className="mt-2 rounded-xs border border-[rgba(220,38,38,0.45)] bg-[rgba(220,38,38,0.18)] px-2.5 py-1.5 font-body text-[11px] text-[#FEE2E2]">
              {aiError}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (aiDraft) setReplyBody(aiDraft);
                setReplyStatus("waiting_on_customer");
                setComposerMode("reply");
              }}
              disabled={aiLoading || !aiDraft}
            >
              Use draft
            </Button>
            <button
              type="button"
              onClick={regenerateDraft}
              disabled={aiLoading}
              className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-[rgba(255,255,255,0.15)] bg-transparent px-2.5 font-body text-[12px] font-medium text-[#FAFAFA] transition-colors ease-ds duration-fast hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-40"
            >
              <Sparkles className="h-3 w-3" />
              {aiLoading ? "Drafting…" : aiDraft ? "Regenerate" : "Draft with Claude"}
            </button>
          </div>
        </section>

        <section className="rounded-sm border border-border bg-surface p-3.5">
          <p className="eyebrow">Triage</p>
          <div className="mt-2.5 space-y-2.5">
            <div>
              <p className="mb-1 font-body text-[11px] uppercase tracking-eyebrow text-fg-subtle">Assignee</p>
              <Select
                compact
                value={availableAssignees.find((item) => item.name === detail.ticket.assignee)?.id ?? ""}
                onChange={(event) => assigneeMutation.mutate(event.target.value || null)}
                disabled={isBusy}
              >
                <option value="">Unassigned</option>
                {availableAssignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name} · {assignee.role}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <p className="mb-1 font-body text-[11px] uppercase tracking-eyebrow text-fg-subtle">Status</p>
              <Select
                compact
                value={detail.ticket.status}
                onChange={(event) => statusMutation.mutate(event.target.value as ConversationStatus)}
                disabled={isBusy}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <p className="mb-1 font-body text-[11px] uppercase tracking-eyebrow text-fg-subtle">Priority</p>
              <Select
                compact
                value={detail.ticket.priority}
                onChange={(event) => priorityMutation.mutate(event.target.value as PriorityLevel)}
                disabled={isBusy}
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </Select>
            </div>

            <div className="rounded-xs bg-surface-2 px-2.5 py-1.5 font-body text-[11px] text-fg-muted">{busyLabel}</div>
          </div>
        </section>

        <section className="rounded-sm border border-border bg-surface p-3.5">
          <p className="eyebrow">Snooze</p>
          <div className="mt-2.5 space-y-2.5">
            <div className="rounded-xs bg-surface-2 px-2.5 py-1.5 font-body text-[11px] text-fg-muted">
              {detail.mailbox.snoozedUntilLabel
                ? `Snoozed until ${detail.mailbox.snoozedUntilLabel}`
                : "Visible in active queues now"}
            </div>
            <div className="flex items-center gap-2">
              <Select
                compact
                value={selectedSnoozePreset}
                onChange={(event) => setSelectedSnoozePreset(event.target.value)}
                disabled={isBusy}
                className="min-w-0 flex-1"
              >
                <option value="">Choose a snooze preset…</option>
                {snoozePresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                loading={snoozeMutation.isPending && Boolean(selectedSnoozePreset)}
                disabled={!selectedSnoozePreset || isBusy}
                onClick={() => snoozeMutation.mutate(buildSnoozeTimestamp(selectedSnoozePreset as SnoozePresetValue))}
              >
                Snooze
              </Button>
            </div>
            {detail.mailbox.snoozedUntil ? (
              <Button
                size="sm"
                variant="ghost"
                loading={snoozeMutation.isPending && !selectedSnoozePreset}
                disabled={isBusy}
                onClick={() => snoozeMutation.mutate(null)}
                className="w-full justify-center"
              >
                Remove snooze
              </Button>
            ) : null}
          </div>
        </section>

        <section className="rounded-sm border border-border bg-surface p-3.5">
          <p className="eyebrow">Tenant</p>
          <h3 className="mt-1.5 font-body text-[13px] font-semibold text-fg">{detail.customer.name}</h3>
          <p className="font-body text-[12px] text-fg-muted">{detail.customer.company}</p>
          <div className="mt-2.5 grid gap-1.5 font-body text-[12px] text-fg-muted">
            <Row label="Tier" value={detail.customer.tier} />
            <Row label="Health" value={detail.customer.health.replaceAll("_", " ")} />
            <Row label="Last seen" value={detail.customer.lastSeenLabel} />
          </div>
        </section>

        <section className="rounded-sm border border-border bg-surface p-3.5">
          <p className="eyebrow">Tags</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {attachedTagOptions.length > 0 ? (
              attachedTagOptions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => removeTagMutation.mutate(tag.id)}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 rounded-xs border border-border px-1.5 py-[2px] font-body text-[10px] font-semibold uppercase tracking-eyebrow text-fg transition-colors ease-ds duration-fast hover:bg-surface-2 disabled:opacity-40"
                  title={`Remove ${tag.name}`}
                >
                  <span>{tag.name}</span>
                  <span className="text-fg-subtle">×</span>
                </button>
              ))
            ) : (
              <span className="font-body text-[12px] text-fg-muted">No tags yet</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Select
              compact
              value={selectedTagId}
              onChange={(event) => setSelectedTagId(event.target.value)}
              disabled={isBusy || attachableTags.length === 0}
              className="min-w-0 flex-1"
            >
              {attachableTags.length === 0 ? (
                <option value="">All available tags are attached</option>
              ) : null}
              {attachableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="secondary"
              loading={addTagMutation.isPending}
              disabled={!selectedTagId || isBusy || attachableTags.length === 0}
              onClick={() => addTagMutation.mutate(selectedTagId)}
            >
              Add tag
            </Button>
          </div>
          <p className="mt-2 font-body text-[11px] text-fg-muted">
            Attach existing scoped tags or click a chip to remove it.
          </p>
        </section>

        <section className="rounded-sm border border-border bg-surface p-3.5">
          <p className="eyebrow">Suggested next actions</p>
          <div className="mt-2.5 space-y-2">
            {detail.suggestedActions.length > 0 ? (
              detail.suggestedActions.map((action) => (
                <div key={action.id} className="rounded-xs bg-surface-2 px-3 py-2.5">
                  <p className="font-body text-[13px] font-medium text-fg">{action.label}</p>
                  <p className="mt-1 font-body text-[12px] leading-[1.45] text-fg-muted">{action.detail}</p>
                </div>
              ))
            ) : (
              <p className="font-body text-[12px] text-fg-muted">No suggested actions yet.</p>
            )}
          </div>
        </section>
      </aside>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-body text-[10px] uppercase tracking-eyebrow text-fg-subtle w-16">{label}</span>
      <span className="flex-1 truncate font-body text-[12px] text-fg">{value}</span>
    </div>
  );
}
