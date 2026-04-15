import { api } from "./api";
import type { ConversationDetail, ConversationRow, InboxViewDefinition, InboxViewKey } from "../components/inbox/types";

export interface InboxNavigationResponse {
  views: InboxViewDefinition[];
  defaultViewKey: InboxViewKey;
}

export interface InboxConversationListResponse {
  view: InboxViewKey;
  conversations: ConversationRow[];
}

export const helpdeskApi = {
  getNavigation: () => api.get<InboxNavigationResponse>("/api/helpdesk/inbox/navigation"),
  getConversations: (view: InboxViewKey) => api.get<InboxConversationListResponse>(`/api/helpdesk/inbox/conversations?view=${view}`),
  getConversationDetail: (conversationId: string) => api.get<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}`),
};
