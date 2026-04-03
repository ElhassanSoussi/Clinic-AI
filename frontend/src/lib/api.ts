import type {
  AuthResponse,
  Clinic,
  Lead,
  ChatResponse,
  Conversation,
  ConversationMessage,
  SheetsValidation,
  BillingStatus,
  PlanInfo,
  ActivityEvent,
  AppointmentRecord,
  AppointmentDepositRequestResult,
  InboxConversation,
  ConversationDetail,
  CustomerProfileSummary,
  CustomerProfileDetail,
  Opportunity,
  FrontdeskAnalytics,
  FollowUpTask,
  OperationsOverview,
  ReminderPreview,
  SystemReadiness,
  AutoFollowUpRunResult,
  TrainingOverview,
  TrainingKnowledgeSource,
  WaitlistEntry,
  ChannelReadiness,
  CommunicationEvent,
  CommunicationSendPassResult,
} from "@/types";
import { getPublicApiUrl } from "@/lib/api-url";

import { createClient } from "@/utils/supabase/client";

let accessTokenPromise: Promise<string | null> | null = null;

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message === "Not Found" || error.message === "Request failed: 404";
}

function normalizeAppointmentSource(source: string | undefined): AppointmentRecord["source"] {
  if (
    source === "web_chat" ||
    source === "sms" ||
    source === "whatsapp" ||
    source === "missed_call" ||
    source === "callback_request" ||
    source === "manual"
  ) {
    return source;
  }
  return "manual";
}

function appointmentNeedsAttention(lead: Lead): boolean {
  const appointmentStatus = lead.appointment_status || "request_open";
  const reminderStatus = lead.reminder_status || "not_ready";
  const depositStatus = lead.deposit_status || "not_required";
  const appointmentStartsAt = lead.appointment_starts_at ? new Date(lead.appointment_starts_at) : null;
  const now = new Date();
  if (appointmentStatus === "cancel_requested" || appointmentStatus === "reschedule_requested" || appointmentStatus === "no_show") {
    return true;
  }
  if (lead.deposit_required && !["paid", "waived", "not_required"].includes(depositStatus)) {
    return true;
  }
  if (lead.status === "booked" && appointmentStatus === "confirmed" && reminderStatus !== "sent") {
    return true;
  }
  if (lead.status === "booked" && appointmentStatus === "confirmed" && appointmentStartsAt && appointmentStartsAt < now) {
    return true;
  }
  return false;
}

function matchesAppointmentView(lead: Lead, view: string): boolean {
  const appointmentStatus = lead.appointment_status || "request_open";
  const appointmentStartsAt = lead.appointment_starts_at ? new Date(lead.appointment_starts_at) : null;
  const now = new Date();
  if (view === "upcoming") {
    return appointmentStatus === "confirmed" && appointmentStartsAt !== null && appointmentStartsAt >= now;
  }
  if (view === "attention") {
    return appointmentNeedsAttention(lead);
  }
  if (view === "past") {
    return appointmentStatus === "completed" || (appointmentStatus === "confirmed" && appointmentStartsAt !== null && appointmentStartsAt < now);
  }
  if (view === "cancelled") {
    return appointmentStatus === "cancel_requested" || appointmentStatus === "reschedule_requested" || appointmentStatus === "cancelled" || appointmentStatus === "no_show";
  }
  return true;
}

function leadToAppointmentRecord(lead: Lead): AppointmentRecord {
  const reminderReady =
    lead.reminder_status === "ready" || lead.reminder_status === "scheduled" || lead.reminder_status === "sent";
  return {
    lead_id: lead.id,
    customer_key: "",
    thread_id: null,
    patient_name: lead.patient_name,
    patient_phone: lead.patient_phone,
    patient_email: lead.patient_email,
    reason_for_visit: lead.reason_for_visit,
    preferred_datetime_text: lead.preferred_datetime_text,
    source: normalizeAppointmentSource(lead.source),
    lead_status: lead.status,
    appointment_status: lead.appointment_status || "request_open",
    appointment_starts_at: lead.appointment_starts_at || null,
    appointment_ends_at: lead.appointment_ends_at || null,
    reminder_status: lead.reminder_status || "not_ready",
    reminder_scheduled_for: lead.reminder_scheduled_for || null,
    reminder_ready: reminderReady,
    reminder_blocked_reason: reminderReady ? "" : "Detailed reminder readiness is available after the appointments API is live on the backend.",
    deposit_required: Boolean(lead.deposit_required),
    deposit_amount_cents: lead.deposit_amount_cents ?? null,
    deposit_status: lead.deposit_status || "not_required",
    deposit_requested_at: lead.deposit_requested_at || null,
    deposit_paid_at: lead.deposit_paid_at || null,
    deposit_request_delivery_status: "",
    deposit_request_delivery_reason: "",
    follow_up_open: false,
    follow_up_task_id: null,
    notes: lead.notes || "",
    updated_at: lead.updated_at || lead.created_at || null,
  };
}

async function listAppointmentsFallback(view: string): Promise<AppointmentRecord[]> {
  const leads = await api.leads.list();
  return leads
    .filter((lead) => lead.status === "booked" || (lead.appointment_status || "request_open") !== "request_open")
    .filter((lead) => matchesAppointmentView(lead, view))
    .map(leadToAppointmentRecord);
}

async function getToken(): Promise<string | null> {
  try {
    if (globalThis.window === undefined) return null;
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      return storedToken;
    }
    if (accessTokenPromise) return accessTokenPromise;

    accessTokenPromise = (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    })();

    return await accessTokenPromise;
  } catch {
    return null;
  } finally {
    accessTokenPromise = null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiUrl = getPublicApiUrl();
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401 && globalThis.window !== undefined) {
      const pathname = globalThis.location.pathname;
      const isAuthPage = pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth/");
      if (!isAuthPage) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("auth_user");
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch { /* ignore sign-out errors */ }
        globalThis.location.href = "/login";
        throw new Error("Session expired. Please log in again.");
      }
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    register(data: {
      email: string;
      password: string;
      full_name: string;
      clinic_name: string;
    }): Promise<AuthResponse> {
      return request("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    login(data: { email: string; password: string }): Promise<AuthResponse> {
      return request("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateProfile(data: { full_name?: string }): Promise<{ message: string }> {
      return request("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    changePassword(data: {
      current_password: string;
      new_password: string;
    }): Promise<{ message: string }> {
      return request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    oauthComplete(data: {
      access_token: string;
    }): Promise<AuthResponse & { is_new: boolean }> {
      return request("/auth/oauth-complete", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  clinics: {
    getMyClinic(): Promise<Clinic> {
      return request("/clinics/me");
    },

    updateMyClinic(data: Partial<Clinic>): Promise<Clinic> {
      return request("/clinics/me", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    validateSheets(data: {
      sheet_id: string;
      tab_name?: string;
      availability_tab?: string;
    }): Promise<SheetsValidation> {
      return request("/clinics/me/validate-sheets", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    testNotification(): Promise<{ success: boolean; email?: string; error?: string }> {
      return request("/clinics/me/test-notification", { method: "POST" });
    },

    getBranding(slug: string): Promise<{ name: string; assistant_name?: string; primary_color?: string; is_live?: boolean }> {
      return request(`/clinics/${encodeURIComponent(slug)}/branding`);
    },

    goLive(): Promise<{ success: boolean; is_live: boolean }> {
      return request("/clinics/me/go-live", { method: "POST" });
    },
  },

  leads: {
    list(status?: string): Promise<Lead[]> {
      const params = status ? `?status=${status}` : "";
      return request(`/leads${params}`);
    },

    get(id: string): Promise<Lead> {
      return request(`/leads/${id}`);
    },

    update(id: string, data: Partial<Lead>): Promise<Lead> {
      return request(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    getConversation(id: string): Promise<{
      conversation: Conversation | null;
      messages: ConversationMessage[];
    }> {
      return request(`/leads/${id}/conversation`);
    },

    create(data: Partial<Lead>): Promise<Lead> {
      return request("/leads", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  conversations: {
    list(): Promise<Conversation[]> {
      return request("/conversations");
    },

    getMessages(id: string): Promise<ConversationMessage[]> {
      return request(`/conversations/${id}/messages`);
    },
  },

  billing: {
    getStatus(): Promise<BillingStatus> {
      return request("/billing/status");
    },

    getPlans(): Promise<PlanInfo[]> {
      return request("/billing/plans");
    },

    createCheckout(data: {
      plan_id: string;
      success_url: string;
      cancel_url: string;
    }): Promise<{ checkout_url: string }> {
      return request("/billing/checkout", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    createPortal(data: { return_url: string }): Promise<{ portal_url: string }> {
      return request("/billing/portal", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  chat: {
    send(data: {
      clinic_slug: string;
      session_id: string;
      message: string;
    }): Promise<ChatResponse> {
      return request("/chat", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  activity: {
    list(limit = 30): Promise<ActivityEvent[]> {
      return request(`/activity?limit=${limit}`);
    },
  },

  frontdesk: {
    listConversations(limit = 100): Promise<InboxConversation[]> {
      return request(`/frontdesk/conversations?limit=${limit}`);
    },

    getConversation(id: string): Promise<ConversationDetail> {
      return request(`/frontdesk/conversations/${id}`);
    },

    updateThreadControl(
      id: string,
      data: { manual_takeover: boolean }
    ): Promise<{
      conversation_id: string;
      manual_takeover: boolean;
      ai_auto_reply_enabled: boolean;
      ai_auto_reply_ready: boolean;
    }> {
      return request(`/frontdesk/conversations/${id}/thread-control`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    convertConversationToLead(
      id: string,
      data: {
        patient_name?: string;
        patient_phone?: string;
        patient_email?: string;
        reason_for_visit?: string;
        preferred_datetime_text?: string;
        notes?: string;
      } = {}
    ): Promise<Lead> {
      return request(`/frontdesk/conversations/${id}/convert-to-lead`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateThreadWorkflow(
      id: string,
      data: {
        status: "contacted" | "booked" | "closed";
        appointment_starts_at?: string;
        appointment_ends_at?: string;
        reason_for_visit?: string;
        preferred_datetime_text?: string;
        note?: string;
      }
    ): Promise<Lead> {
      return request(`/frontdesk/conversations/${id}/workflow`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    createThreadNote(
      id: string,
      data: { note: string }
    ): Promise<CommunicationEvent> {
      return request(`/frontdesk/conversations/${id}/notes`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    listCustomers(): Promise<CustomerProfileSummary[]> {
      return request("/frontdesk/customers");
    },

    getCustomer(key: string): Promise<CustomerProfileDetail> {
      return request(`/frontdesk/customers/${key}`);
    },

    listOpportunities(): Promise<Opportunity[]> {
      return request("/frontdesk/opportunities");
    },

    listFollowUps(): Promise<FollowUpTask[]> {
      return request("/frontdesk/follow-ups");
    },

    runAutoFollowUps(): Promise<AutoFollowUpRunResult> {
      return request("/frontdesk/follow-ups/auto-run", {
        method: "POST",
      });
    },

    createFollowUp(data: {
      source_key: string;
      task_type: string;
      priority: "high" | "medium" | "low";
      title: string;
      detail?: string;
      customer_key?: string | null;
      customer_name: string;
      lead_id?: string | null;
      conversation_id?: string | null;
      due_at?: string;
      note?: string;
      status?: "open" | "snoozed" | "completed";
    }): Promise<FollowUpTask> {
      return request("/frontdesk/follow-ups", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateFollowUp(
      id: string,
      data: {
        status?: "open" | "snoozed" | "completed";
        due_at?: string;
        note?: string;
        lead_status?: "new" | "contacted" | "booked" | "closed";
      }
    ): Promise<FollowUpTask> {
      return request(`/frontdesk/follow-ups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    getAnalytics(): Promise<FrontdeskAnalytics> {
      return request("/frontdesk/analytics");
    },

    listAppointments(view = "all"): Promise<AppointmentRecord[]> {
      return request<AppointmentRecord[]>(`/frontdesk/appointments?view=${encodeURIComponent(view)}`).catch((error) => {
        if (isNotFoundError(error)) {
          return listAppointmentsFallback(view);
        }
        throw error;
      });
    },

    updateAppointment(
      leadId: string,
      data: {
        status?: "new" | "contacted" | "booked" | "closed";
        appointment_status?: "request_open" | "confirmed" | "cancel_requested" | "reschedule_requested" | "cancelled" | "completed" | "no_show";
        appointment_starts_at?: string | null;
        appointment_ends_at?: string | null;
        reason_for_visit?: string;
        preferred_datetime_text?: string;
        note?: string;
      }
    ): Promise<Lead> {
      return request<Lead>(`/frontdesk/appointments/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }).catch((error) => {
        if (isNotFoundError(error)) {
          return api.leads.update(leadId, data);
        }
        throw error;
      });
    },

    requestAppointmentDeposit(
      leadId: string,
      data: {
        amount_cents: number;
        send_sms?: boolean;
      }
    ): Promise<AppointmentDepositRequestResult> {
      return request(`/frontdesk/appointments/${leadId}/deposit-request`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    markAppointmentDepositNotRequired(leadId: string): Promise<Lead> {
      return request(`/frontdesk/appointments/${leadId}/deposit-not-required`, {
        method: "POST",
      });
    },

    getOperations(): Promise<OperationsOverview> {
      return request("/frontdesk/operations");
    },

    getReminderPreview(): Promise<ReminderPreview[]> {
      return request("/frontdesk/reminders/preview");
    },

    sendDueReminders(): Promise<CommunicationSendPassResult> {
      return request("/frontdesk/reminders/send-due", {
        method: "POST",
      });
    },

    sendReminder(leadId: string): Promise<CommunicationEvent> {
      return request(`/frontdesk/reminders/${leadId}/send`, {
        method: "POST",
      });
    },

    listChannels(): Promise<ChannelReadiness[]> {
      return request("/frontdesk/channels");
    },

    getSystemReadiness(): Promise<SystemReadiness> {
      return request("/frontdesk/system-readiness");
    },

    updateChannel(
      channel: string,
      data: {
        provider?: string;
        display_name?: string;
        contact_value?: string;
        automation_enabled?: boolean;
        notes?: string;
      }
    ): Promise<ChannelReadiness> {
      return request(`/frontdesk/channels/${channel}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    listCommunications(): Promise<CommunicationEvent[]> {
      return request("/frontdesk/communications");
    },

    createCommunicationEvent(data: {
      channel: "missed_call" | "callback_request";
      customer_name?: string;
      customer_phone?: string;
      customer_email?: string;
      summary?: string;
      content?: string;
      lead_id?: string | null;
      conversation_id?: string | null;
    }): Promise<CommunicationEvent> {
      return request("/frontdesk/communications", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateCommunicationEvent(
      id: string,
      data: {
        status?: "new" | "queued" | "attempted" | "sent" | "delivered" | "failed" | "skipped" | "completed" | "dismissed";
        summary?: string;
        content?: string;
      }
    ): Promise<CommunicationEvent> {
      return request(`/frontdesk/communications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    sendTextBack(id: string): Promise<CommunicationEvent> {
      return request(`/frontdesk/communications/${id}/send-text-back`, {
        method: "POST",
      });
    },

    sendSms(data: {
      customer_name?: string;
      customer_phone: string;
      customer_email?: string;
      body: string;
      lead_id?: string | null;
      conversation_id?: string | null;
      follow_up_task_id?: string | null;
      source_event_id?: string | null;
    }): Promise<CommunicationEvent> {
      return request("/frontdesk/communications/send-sms", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    sendSuggestedReply(
      id: string,
      data: { body?: string } = {}
    ): Promise<CommunicationEvent> {
      return request(`/frontdesk/communications/${id}/suggested-reply/send`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    discardSuggestedReply(id: string): Promise<CommunicationEvent> {
      return request(`/frontdesk/communications/${id}/suggested-reply/discard`, {
        method: "POST",
      });
    },

    updateLeadOperations(
      id: string,
      data: {
        appointment_status?: "request_open" | "confirmed" | "cancel_requested" | "reschedule_requested" | "cancelled" | "completed" | "no_show";
        appointment_starts_at?: string | null;
        appointment_ends_at?: string | null;
        reminder_status?: "not_ready" | "ready" | "scheduled" | "sent";
        reminder_note?: string;
        deposit_required?: boolean;
        deposit_amount_cents?: number | null;
        deposit_status?: "not_required" | "required" | "requested" | "paid" | "failed" | "expired" | "waived";
      }
    ): Promise<Lead> {
      return request(`/frontdesk/leads/${id}/operations`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    createWaitlistEntry(data: {
      lead_id?: string | null;
      customer_key?: string | null;
      patient_name: string;
      patient_phone?: string;
      patient_email?: string;
      service_requested?: string;
      preferred_times?: string;
      notes?: string;
    }): Promise<WaitlistEntry> {
      return request("/frontdesk/waitlist", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateWaitlistEntry(
      id: string,
      data: {
        status?: "waiting" | "contacted" | "booked" | "closed";
        notes?: string;
        service_requested?: string;
        preferred_times?: string;
      }
    ): Promise<WaitlistEntry> {
      return request(`/frontdesk/waitlist/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    getTraining(): Promise<TrainingOverview> {
      return request("/frontdesk/training");
    },

    createKnowledgeSource(data: {
      title: string;
      content: string;
    }): Promise<TrainingKnowledgeSource> {
      return request("/frontdesk/training/sources", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    updateKnowledgeSource(
      id: string,
      data: { title?: string; content?: string }
    ): Promise<TrainingKnowledgeSource> {
      return request(`/frontdesk/training/sources/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },

    deleteKnowledgeSource(id: string): Promise<{ success: boolean }> {
      return request(`/frontdesk/training/sources/${id}`, {
        method: "DELETE",
      });
    },
  },

  events: {
    track(data: {
      event_type: string;
      session_id?: string;
      metadata?: Record<string, string>;
    }): Promise<{ ok: boolean }> {
      // Fire-and-forget: swallow errors so tracking never breaks UX
      return request<{ ok: boolean }>("/events", {
        method: "POST",
        body: JSON.stringify(data),
      }).catch(() => ({ ok: false }));
    },
  },

  contact: {
    submit(data: {
      name: string;
      clinic_name?: string;
      email: string;
      phone?: string;
      message?: string;
    }): Promise<{ success: boolean; message: string }> {
      return request("/contact", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },
};
