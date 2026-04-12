/** Narrow shapes aligned with FastAPI response models (subset used by UI). */

export type Clinic = {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  greeting_message: string;
  fallback_message: string;
  business_hours: unknown;
  assistant_name?: string;
  primary_color?: string;
  is_live?: boolean;
  notifications_enabled?: boolean;
  notification_email?: string;
  reminder_enabled?: boolean;
  reminder_lead_hours?: number;
  follow_up_automation_enabled?: boolean;
  follow_up_delay_minutes?: number;
  availability_enabled?: boolean;
  availability_sheet_tab?: string;
  onboarding_completed?: boolean;
  onboarding_step?: number;
  plan?: string;
  subscription_status?: string;
  monthly_lead_limit?: number;
  monthly_leads_used?: number;
  trial_ends_at?: string | null;
};

export type ClinicUpdatePayload = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  greeting_message?: string;
  fallback_message?: string;
  business_hours?: unknown;
  assistant_name?: string;
  primary_color?: string;
  notifications_enabled?: boolean;
  notification_email?: string;
  availability_enabled?: boolean;
  availability_sheet_tab?: string;
  reminder_enabled?: boolean;
  reminder_lead_hours?: number;
  follow_up_automation_enabled?: boolean;
  follow_up_delay_minutes?: number;
  onboarding_completed?: boolean;
  onboarding_step?: number;
  is_live?: boolean;
};

export type BillingStatus = {
  plan: string;
  plan_name: string;
  subscription_status: string;
  monthly_lead_limit: number;
  monthly_leads_used: number;
  trial_ends_at?: string | null;
  has_stripe_subscription: boolean;
};

export type BillingPlan = {
  id: string;
  name: string;
  description: string;
  monthly_lead_limit: number;
  monthly_price_cents: number;
  features: string[];
};

export type InboxConversation = {
  id: string;
  thread_type?: string;
  session_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  channel: string;
  lead_id?: string | null;
  lead_status?: string | null;
  derived_status: string;
  last_message_preview: string;
  last_message_at?: string | null;
  updated_at?: string | null;
  requires_attention?: boolean;
  manual_takeover?: boolean;
  summary?: string | null;
  ai_auto_reply_enabled?: boolean;
  ai_auto_reply_ready?: boolean;
};

export type MessageRow = {
  id: string;
  role: string;
  content: string;
  created_at?: string | null;
};

export type LeadRow = {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  reason_for_visit: string;
  status: string;
  source: string;
  notes: string;
  created_at?: string | null;
  appointment_status?: string | null;
  appointment_starts_at?: string | null;
};

export type ConversationDetail = {
  thread_type?: string;
  conversation: InboxConversation;
  messages: MessageRow[];
  lead?: LeadRow | null;
};

export type LeadUpdatePayload = {
  status?: string;
  notes?: string;
  patient_name?: string;
  patient_phone?: string;
  patient_email?: string;
  reason_for_visit?: string;
  preferred_datetime_text?: string;
};

export type CustomerSummary = {
  key: string;
  name: string;
  phone: string;
  email: string;
  conversation_count: number;
  lead_count: number;
  booked_count: number;
  open_request_count?: number;
  total_interactions?: number;
  last_outcome?: string;
  latest_note?: string;
  last_interaction_at?: string | null;
  follow_up_needed?: boolean;
};

export type CustomerDetail = CustomerSummary & {
  recent_conversations: Array<Record<string, unknown>>;
  recent_requests: LeadRow[];
  timeline: Array<Record<string, unknown>>;
};

export type Opportunity = {
  id: string;
  type: string;
  title: string;
  detail: string;
  priority: string;
  customer_key?: string | null;
  customer_name: string;
  occurred_at?: string | null;
  conversation_id?: string | null;
  lead_id?: string | null;
  derived_status?: string | null;
  follow_up_task_id?: string | null;
  follow_up_task_status?: string | null;
};

export type AppointmentRecord = {
  lead_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  reason_for_visit: string;
  preferred_datetime_text: string;
  appointment_status: string;
  appointment_starts_at?: string | null;
  appointment_ends_at?: string | null;
  reminder_status: string;
  deposit_status: string;
  deposit_required?: boolean;
  updated_at?: string | null;
};

export type FrontdeskAnalytics = {
  conversations_total: number;
  leads_created: number;
  booked_requests: number;
  unresolved_count: number;
  follow_up_needed_count: number;
  potential_lost_patients?: number;
  recovered_opportunities?: number;
  estimated_value_recovered_cents?: number;
  estimated_value_recovered_label?: string;
  lead_capture_rate: number;
  ai_resolution_estimate: number;
  ai_resolution_estimate_label?: string;
  deposits_requested_count: number;
  deposits_paid_count: number;
};

export type ChannelReadiness = {
  id: string;
  channel: string;
  display_name: string;
  connection_status: string;
  contact_value: string;
  summary: string;
  detail: string;
  live: boolean;
  automation_enabled?: boolean;
};

export type SystemReadiness = {
  overall_status: string;
  items: Array<{
    key: string;
    label: string;
    status: string;
    summary: string;
    detail: string;
  }>;
};

export type OperationsOverview = {
  reminder_enabled: boolean;
  reminder_lead_hours: number;
  follow_up_automation_enabled: boolean;
  follow_up_delay_minutes: number;
  deposit_summary: Record<string, unknown>;
  channel_readiness: ChannelReadiness[];
  system_readiness: SystemReadiness;
  communication_queue: unknown[];
  review_queue: unknown[];
  reminder_candidates: unknown[];
};

export type TrainingKnowledgeSource = {
  id: string;
  source_type: string;
  title: string;
  content: string;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TrainingDocument = {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  chunk_count?: number;
  error_message?: string;
};

export type TrainingOverview = {
  clinic_name: string;
  assistant_name: string;
  knowledge_score: number;
  knowledge_status: string;
  readiness_items: Array<{ key: string; label: string; configured: boolean; detail: string }>;
  knowledge_gaps: string[];
  custom_sources: TrainingKnowledgeSource[];
  documents: TrainingDocument[];
  document_stats: {
    total: number;
    ready: number;
    processing: number;
    failed: number;
  };
};

export type ActivityEvent = {
  type: string;
  title: string;
  detail: string;
  timestamp?: string | null;
  resource_id?: string | null;
};
