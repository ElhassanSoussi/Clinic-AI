export interface Clinic {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  greeting_message: string;
  fallback_message: string;
  business_hours: Record<string, string>;
  services: string[];
  faq: FaqEntry[];
  google_sheet_id?: string;
  google_sheet_tab?: string;
  notifications_enabled?: boolean;
  notification_email?: string;
  availability_enabled?: boolean;
  availability_sheet_tab?: string;
  reminder_enabled?: boolean;
  reminder_lead_hours?: number;
  onboarding_completed?: boolean;
  onboarding_step?: number;
  assistant_name?: string;
  primary_color?: string;
  logo_url?: string;
  is_live?: boolean;
  plan?: string;
  subscription_status?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  trial_ends_at?: string;
  monthly_lead_limit?: number;
  monthly_leads_used?: number;
  leads_reset_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface User {
  id: string;
  clinic_id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "staff";
  created_at: string;
  updated_at: string;
}

export type LeadStatus = "new" | "contacted" | "booked" | "closed";

export interface Lead {
  id: string;
  clinic_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  reason_for_visit: string;
  preferred_datetime_text: string;
  status: LeadStatus;
  appointment_status?: "request_open" | "confirmed" | "cancel_requested" | "reschedule_requested" | "cancelled" | "completed" | "no_show";
  appointment_starts_at?: string | null;
  appointment_ends_at?: string | null;
  reminder_status?: "not_ready" | "ready" | "scheduled" | "sent";
  reminder_scheduled_for?: string | null;
  reminder_note?: string;
  deposit_required?: boolean;
  deposit_amount_cents?: number | null;
  deposit_status?: "not_required" | "pending" | "paid" | "waived";
  source: string;
  notes: string;
  slot_row_index?: number;
  slot_source?: "availability" | "manual";
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  clinic_id: string;
  session_id: string;
  lead_id: string | null;
  last_intent: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface InboxConversation {
  id: string;
  session_id: string;
  customer_key?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  channel: string;
  lead_id?: string | null;
  lead_status?: string | null;
  derived_status: "open" | "needs_follow_up" | "booked" | "handled";
  last_intent?: string | null;
  summary?: string | null;
  last_message_preview: string;
  last_message_role?: string | null;
  last_message_at?: string | null;
  conversation_started_at?: string | null;
  updated_at?: string | null;
  requires_attention: boolean;
  unlinked: boolean;
}

export interface ConversationDetail {
  conversation: InboxConversation;
  messages: ConversationMessage[];
  lead: Lead | null;
}

export interface CustomerProfileSummary {
  key: string;
  name: string;
  phone: string;
  email: string;
  conversation_count: number;
  lead_count: number;
  booked_count: number;
  open_request_count: number;
  last_interaction_at?: string | null;
  latest_note: string;
}

export interface CustomerConversationSummary {
  id: string;
  derived_status: "open" | "needs_follow_up" | "booked" | "handled";
  last_message_preview: string;
  last_message_at?: string | null;
  updated_at?: string | null;
  lead_id?: string | null;
}

export interface CustomerProfileDetail extends CustomerProfileSummary {
  recent_conversations: CustomerConversationSummary[];
  recent_requests: Lead[];
}

export interface Opportunity {
  id: string;
  type: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  customer_key?: string | null;
  customer_name: string;
  occurred_at?: string | null;
  conversation_id?: string | null;
  lead_id?: string | null;
  derived_status?: string | null;
  follow_up_task_id?: string | null;
  follow_up_task_status?: "open" | "snoozed" | "completed" | null;
}

export interface AnalyticsHourBucket {
  hour: number;
  label: string;
  count: number;
}

export interface FrontdeskAnalytics {
  conversations_total: number;
  leads_created: number;
  booked_requests: number;
  unresolved_count: number;
  follow_up_needed_count: number;
  lead_capture_rate: number;
  ai_resolution_estimate: number;
  ai_resolution_estimate_label: string;
  busiest_contact_hours: AnalyticsHourBucket[];
}

export interface FollowUpTask {
  id: string;
  source_key: string;
  task_type: string;
  status: "open" | "snoozed" | "completed";
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  customer_key?: string | null;
  customer_name: string;
  lead_id?: string | null;
  conversation_id?: string | null;
  due_at?: string | null;
  note: string;
  last_action_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OperationsLead {
  lead_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  reason_for_visit: string;
  preferred_datetime_text: string;
  lead_status: LeadStatus;
  appointment_status: "request_open" | "confirmed" | "cancel_requested" | "reschedule_requested" | "cancelled" | "completed" | "no_show";
  appointment_starts_at?: string | null;
  appointment_ends_at?: string | null;
  reminder_status: "not_ready" | "ready" | "scheduled" | "sent";
  reminder_scheduled_for?: string | null;
  reminder_preview?: string | null;
  reminder_ready: boolean;
  deposit_required: boolean;
  deposit_amount_cents?: number | null;
  deposit_status: "not_required" | "pending" | "paid" | "waived";
  updated_at?: string | null;
}

export interface WaitlistEntry {
  id: string;
  lead_id?: string | null;
  customer_key?: string | null;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  service_requested: string;
  preferred_times: string;
  notes: string;
  status: "waiting" | "contacted" | "booked" | "closed";
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DepositSummary {
  required_count: number;
  pending_count: number;
  configured_count: number;
  note: string;
}

export interface OperationsOverview {
  reminder_enabled: boolean;
  reminder_lead_hours: number;
  reminder_candidates: OperationsLead[];
  action_required_requests: OperationsLead[];
  waitlist_entries: WaitlistEntry[];
  deposit_summary: DepositSummary;
}

export interface TrainingKnowledgeSource {
  id: string;
  source_type: string;
  title: string;
  content: string;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TrainingReadinessItem {
  key: string;
  label: string;
  configured: boolean;
  detail: string;
}

export interface TrainingOverview {
  clinic_name: string;
  assistant_name: string;
  knowledge_score: number;
  knowledge_status: string;
  readiness_items: TrainingReadinessItem[];
  knowledge_gaps: string[];
  custom_sources: TrainingKnowledgeSource[];
}

export interface AuthResponse {
  access_token: string;
  user_id: string;
  email: string;
  full_name: string;
  clinic_id: string;
  clinic_slug: string;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
  intent: string | null;
  lead_created: boolean;
  lead_id: string | null;
}

export interface BillingStatus {
  plan: string;
  plan_name: string;
  subscription_status: string;
  monthly_lead_limit: number;
  monthly_leads_used: number;
  trial_ends_at?: string;
  has_stripe_subscription: boolean;
}

export interface PlanInfo {
  id: string;
  name: string;
  description: string;
  monthly_lead_limit: number;
  monthly_price_cents: number;
  features: string[];
}

export interface SheetsValidation {
  connected: boolean;
  sheet_title?: string;
  tab_found: boolean;
  availability_tab_found: boolean;
  availability_headers_ok: boolean;
  row_count?: number;
  error?: string;
}

export interface ActivityEvent {
  type: "lead_created" | "lead_status_changed" | "conversation_started";
  title: string;
  detail: string;
  timestamp: string;
  resource_id: string;
}
