import { api } from "./api";
import type {
  ConversationDetail,
  ConversationRow,
  HelpdeskDashboardMetrics,
  InboxViewDefinition,
  InboxViewKey,
  PriorityLevel,
  ConversationStatus,
} from "../components/inbox/types";

export interface InboxNavigationResponse {
  views: InboxViewDefinition[];
  defaultViewKey: InboxViewKey;
}

export interface InboxConversationListResponse {
  view: InboxViewKey;
  conversations: ConversationRow[];
}

export const helpdeskApi = {
  getNavigation: (propertyId?: string | null) => {
    const params = new URLSearchParams();
    if (propertyId) params.set("propertyId", propertyId);
    const query = params.toString();
    return api.get<InboxNavigationResponse>(`/api/helpdesk/inbox/navigation${query ? `?${query}` : ""}`);
  },
  getConversations: (view: InboxViewKey, propertyId?: string | null) => {
    const params = new URLSearchParams({ view });
    if (propertyId) params.set("propertyId", propertyId);
    return api.get<InboxConversationListResponse>(`/api/helpdesk/inbox/conversations?${params.toString()}`);
  },
  getConversationDetail: (conversationId: string) => api.get<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}`),
  updateAssignee: (conversationId: string, assigneeStaffId: string | null) =>
    api.patch<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/assignee`, { assigneeStaffId }),
  updateStatus: (conversationId: string, status: ConversationStatus) =>
    api.patch<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/status`, { status }),
  updatePriority: (conversationId: string, priority: PriorityLevel) =>
    api.patch<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/priority`, { priority }),
  addTag: (conversationId: string, tagId: string) =>
    api.post<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/tags`, { tagId }),
  removeTag: (conversationId: string, tagId: string) =>
    api.delete<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/tags/${tagId}`),
  updateSnooze: (conversationId: string, snoozedUntil: string | null) =>
    api.patch<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/snooze`, { snoozedUntil }),
  updateArchiveState: (conversationId: string, archived: boolean) =>
    api.patch<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/archive`, { archived }),
  updateSpamState: (conversationId: string, spam: boolean) =>
    api.patch<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/spam`, { spam }),
  updateSoftDeleteState: (conversationId: string, deleted: boolean, deleteReason?: string | null) =>
    api.patch<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/soft-delete`, { deleted, deleteReason: deleteReason ?? null }),
  addInternalNote: (conversationId: string, body: string) =>
    api.post<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/notes`, { body }),
  replyToConversation: (conversationId: string, body: string, status?: ConversationStatus) =>
    api.post<ConversationDetail>(`/api/helpdesk/inbox/conversations/${conversationId}/replies`, {
      body,
      ...(status ? { status } : {}),
    }),
  getDashboardMetrics: () => api.get<HelpdeskDashboardMetrics>("/api/helpdesk/dashboard/metrics"),
  getPropertiesSummary: () => api.get<{ properties: PropertySummaryItem[] }>("/api/helpdesk/properties-summary"),
};

export interface PropertySummaryItem {
  id: string;
  name: string;
  location: string | null;
  unitCount: number;
  openTicketCount: number;
}
