/**
 * Typed wrappers for Clinic AI FastAPI. All paths are relative to /api base.
 */
import { ApiError, apiFetch, apiJson, parseApiErrorMessage, type ApiFetchOptions } from "../api";
import type {
  ActivityEvent,
  AppointmentRecord,
  BillingPlan,
  BillingStatus,
  ChannelReadiness,
  Clinic,
  ClinicUpdatePayload,
  ConversationDetail,
  CustomerDetail,
  CustomerSummary,
  FrontdeskAnalytics,
  InboxConversation,
  LeadRow,
  LeadUpdatePayload,
  MessageRow,
  OperationsOverview,
  Opportunity,
  SystemReadiness,
  TrainingKnowledgeSource,
  TrainingOverview,
} from "./types";

const auth = (token: string): ApiFetchOptions => ({ accessToken: token });

export async function fetchClinicMe(token: string): Promise<Clinic> {
  return apiJson<Clinic>("/clinics/me", auth(token));
}

export async function updateClinicMe(token: string, body: ClinicUpdatePayload): Promise<Clinic> {
  return apiJson<Clinic>("/clinics/me", {
    ...auth(token),
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function goLiveClinic(token: string): Promise<{ success: boolean; is_live: boolean }> {
  return apiJson("/clinics/me/go-live", { ...auth(token), method: "POST" });
}

export async function testNotificationEmail(token: string): Promise<{
  success: boolean;
  email?: string | null;
  error?: string | null;
}> {
  return apiJson("/clinics/me/test-notification", { ...auth(token), method: "POST" });
}

export async function updateAuthProfile(token: string, body: { full_name?: string }): Promise<{ message: string }> {
  return apiJson("/auth/profile", {
    ...auth(token),
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function changePassword(
  token: string,
  body: { current_password: string; new_password: string },
): Promise<{ message: string }> {
  return apiJson("/auth/change-password", {
    ...auth(token),
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchBillingStatus(token: string): Promise<BillingStatus> {
  return apiJson<BillingStatus>("/billing/status", auth(token));
}

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  return apiJson<BillingPlan[]>("/billing/plans");
}

export async function createBillingCheckout(
  token: string,
  body: { plan_id: string; success_url: string; cancel_url: string },
): Promise<{ checkout_url: string }> {
  return apiJson("/billing/checkout", {
    ...auth(token),
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createBillingPortal(token: string, return_url: string): Promise<{ portal_url: string }> {
  return apiJson("/billing/portal", {
    ...auth(token),
    method: "POST",
    body: JSON.stringify({ return_url }),
  });
}

export async function fetchFrontdeskInbox(token: string, limit = 100): Promise<InboxConversation[]> {
  return apiJson<InboxConversation[]>(`/frontdesk/conversations?limit=${limit}`, auth(token));
}

export async function fetchConversationDetail(token: string, conversationId: string): Promise<ConversationDetail> {
  return apiJson<ConversationDetail>(
    `/frontdesk/conversations/${encodeURIComponent(conversationId)}`,
    auth(token),
  );
}

export async function updateThreadControl(
  token: string,
  threadId: string,
  body: { manual_takeover: boolean },
): Promise<Record<string, unknown>> {
  return apiJson(`/frontdesk/conversations/${encodeURIComponent(threadId)}/thread-control`, {
    ...auth(token),
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function updateThreadWorkflow(
  token: string,
  threadId: string,
  body: {
    status: string;
    appointment_starts_at?: string | null;
    appointment_ends_at?: string | null;
    reason_for_visit?: string | null;
    preferred_datetime_text?: string | null;
    note?: string | null;
  },
): Promise<LeadRow> {
  return apiJson<LeadRow>(`/frontdesk/conversations/${encodeURIComponent(threadId)}/workflow`, {
    ...auth(token),
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function updateFollowUpTask(
  token: string,
  taskId: string,
  body: { status?: string; due_at?: string | null; note?: string | null; lead_status?: string | null },
): Promise<Record<string, unknown>> {
  return apiJson(`/frontdesk/follow-ups/${encodeURIComponent(taskId)}`, {
    ...auth(token),
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchLeads(token: string): Promise<LeadRow[]> {
  return apiJson<LeadRow[]>("/leads", auth(token));
}

export async function fetchLead(token: string, leadId: string): Promise<LeadRow> {
  return apiJson<LeadRow>(`/leads/${encodeURIComponent(leadId)}`, auth(token));
}

export async function updateLead(token: string, leadId: string, body: LeadUpdatePayload): Promise<LeadRow> {
  return apiJson<LeadRow>(`/leads/${encodeURIComponent(leadId)}`, {
    ...auth(token),
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchLeadConversation(
  token: string,
  leadId: string,
): Promise<{ conversation: Record<string, unknown> | null; messages: MessageRow[] }> {
  return apiJson(`/leads/${encodeURIComponent(leadId)}/conversation`, auth(token));
}

export async function fetchActivity(token: string, limit = 50): Promise<ActivityEvent[]> {
  return apiJson<ActivityEvent[]>(`/activity?limit=${limit}`, auth(token));
}

export async function fetchFrontdeskAnalytics(token: string): Promise<FrontdeskAnalytics> {
  return apiJson<FrontdeskAnalytics>("/frontdesk/analytics", auth(token));
}

export async function fetchSystemReadiness(token: string): Promise<SystemReadiness> {
  return apiJson<SystemReadiness>("/frontdesk/system-readiness", auth(token));
}

export async function fetchCustomers(token: string): Promise<CustomerSummary[]> {
  return apiJson<CustomerSummary[]>("/frontdesk/customers", auth(token));
}

export async function fetchCustomerDetail(token: string, customerKey: string): Promise<CustomerDetail> {
  return apiJson<CustomerDetail>(
    `/frontdesk/customers/${encodeURIComponent(customerKey)}`,
    auth(token),
  );
}

export async function fetchOpportunities(token: string): Promise<Opportunity[]> {
  return apiJson<Opportunity[]>("/frontdesk/opportunities", auth(token));
}

export async function fetchOperations(token: string): Promise<OperationsOverview> {
  return apiJson<OperationsOverview>("/frontdesk/operations", auth(token));
}

export async function fetchAppointments(token: string, view = "all"): Promise<AppointmentRecord[]> {
  return apiJson<AppointmentRecord[]>(
    `/frontdesk/appointments?view=${encodeURIComponent(view)}`,
    auth(token),
  );
}

export async function updateAppointment(
  token: string,
  leadId: string,
  body: Record<string, unknown>,
): Promise<LeadRow> {
  return apiJson<LeadRow>(`/frontdesk/appointments/${encodeURIComponent(leadId)}`, {
    ...auth(token),
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchTrainingOverview(token: string): Promise<TrainingOverview> {
  return apiJson<TrainingOverview>("/frontdesk/training", auth(token));
}

export async function createTrainingSource(token: string, title: string, content: string): Promise<TrainingKnowledgeSource> {
  return apiJson("/frontdesk/training/sources", {
    ...auth(token),
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
}

export async function updateTrainingSource(
  token: string,
  sourceId: string,
  body: { title?: string; content?: string },
): Promise<TrainingKnowledgeSource> {
  return apiJson(`/frontdesk/training/sources/${encodeURIComponent(sourceId)}`, {
    ...auth(token),
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteTrainingSource(token: string, sourceId: string): Promise<void> {
  await apiJson(`/frontdesk/training/sources/${encodeURIComponent(sourceId)}`, {
    ...auth(token),
    method: "DELETE",
  });
}

export async function deleteTrainingDocument(token: string, documentId: string): Promise<void> {
  await apiJson(`/frontdesk/training/documents/${encodeURIComponent(documentId)}`, {
    ...auth(token),
    method: "DELETE",
  });
}

export async function uploadTrainingDocument(token: string, file: File): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch("/frontdesk/training/documents", {
    ...auth(token),
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new ApiError(await parseApiErrorMessage(res), res.status);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function fetchChannels(token: string): Promise<ChannelReadiness[]> {
  return apiJson<ChannelReadiness[]>("/frontdesk/channels", auth(token));
}

export async function updateChannel(
  token: string,
  channel: string,
  body: Record<string, unknown>,
): Promise<ChannelReadiness> {
  return apiJson<ChannelReadiness>(`/frontdesk/channels/${encodeURIComponent(channel)}`, {
    ...auth(token),
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

