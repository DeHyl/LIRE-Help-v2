import { useQuery } from "@tanstack/react-query";
import type { InboxViewDefinition, InboxViewKey } from "./types";
import { InboxSidebar } from "./inbox-sidebar";
import { ConversationList } from "./conversation-list";
import { ConversationDetailPane } from "./conversation-detail";
import { helpdeskApi } from "../../lib/helpdesk";

interface InboxShellProps {
  views: InboxViewDefinition[];
  navigationLoading: boolean;
  navigationError: string | null;
  selectedView: InboxViewKey;
  selectedConversationId: string | null;
  onSelectView: (view: InboxViewKey) => void;
  onSelectConversation: (conversationId: string) => void;
}

export function InboxShell({
  views,
  navigationLoading,
  navigationError,
  selectedView,
  selectedConversationId,
  onSelectView,
  onSelectConversation,
}: InboxShellProps) {
  const fallbackView = views.find((view) => view.key === selectedView) ?? views[0];

  const conversationsQuery = useQuery({
    queryKey: ["helpdesk", "inbox", "conversations", fallbackView?.key ?? selectedView],
    queryFn: () => helpdeskApi.getConversations(fallbackView?.key ?? selectedView),
    enabled: Boolean(fallbackView),
  });

  const conversations = conversationsQuery.data?.conversations ?? [];
  const activeConversation = conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0];

  const detailQuery = useQuery({
    queryKey: ["helpdesk", "inbox", "conversation", activeConversation?.id],
    queryFn: () => helpdeskApi.getConversationDetail(activeConversation!.id),
    enabled: Boolean(activeConversation?.id),
  });

  const loading = navigationLoading || conversationsQuery.isLoading;
  const error = navigationError
    ?? (conversationsQuery.error instanceof Error ? conversationsQuery.error.message : null)
    ?? (detailQuery.error instanceof Error ? detailQuery.error.message : null);

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[720px] min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="hidden xl:block">
        <InboxSidebar views={views} selectedView={fallbackView?.key ?? selectedView} onSelectView={onSelectView} />
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]">
        {loading ? (
          <div className="grid min-w-0 flex-1 grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="flex items-center justify-center border-r border-slate-200 bg-white p-6 text-sm text-slate-500">Loading inbox…</div>
            <div className="flex items-center justify-center bg-slate-50 p-6 text-sm text-slate-500">Loading conversation…</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center bg-slate-50 p-8 text-center xl:col-span-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Unable to load inbox</p>
              <p className="mt-1 text-sm text-slate-500">{error}</p>
            </div>
          </div>
        ) : (
          <>
            <ConversationList
              conversations={conversations}
              selectedConversationId={activeConversation?.id ?? null}
              onSelectConversation={onSelectConversation}
            />
            <ConversationDetailPane conversation={activeConversation} detail={detailQuery.data} detailLoading={detailQuery.isLoading} />
          </>
        )}
      </div>
    </div>
  );
}
