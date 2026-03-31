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
  InboxConversation,
  ConversationDetail,
  CustomerProfileSummary,
  CustomerProfileDetail,
  Opportunity,
  FrontdeskAnalytics,
  FollowUpTask,
  OperationsOverview,
  TrainingOverview,
  TrainingKnowledgeSource,
  WaitlistEntry,
} from "@/types";
import { getPublicApiUrl } from "@/lib/api-url";

import { createClient } from "@/utils/supabase/client";

async function getToken(): Promise<string | null> {
  try {
    if (globalThis.window === undefined) return null;
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      return storedToken;
    }

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
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

    getOperations(): Promise<OperationsOverview> {
      return request("/frontdesk/operations");
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
        deposit_status?: "not_required" | "pending" | "paid" | "waived";
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
