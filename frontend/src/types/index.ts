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
  follow_up_automation_enabled?: boolean;
  follow_up_delay_minutes?: number;
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
export type ChannelType =
  | "web_chat"
  | "sms"
  | "whatsapp"
  | "missed_call"
  | "callback_request"
  | "manual";
export type InboxThreadType = "conversation" | "event";

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
  deposit_status?: "not_required" | "required" | "requested" | "paid" | "failed" | "expired" | "waived";
  deposit_requested_at?: string | null;
  deposit_paid_at?: string | null;
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
  channel?: ChannelType;
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
  thread_type: InboxThreadType;
  session_id: string;
  thread_conversation_id?: string | null;
  customer_key?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  channel: ChannelType;
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
  manual_takeover: boolean;
  ai_auto_reply_enabled: boolean;
  ai_auto_reply_ready: boolean;
}

export interface ConversationDetail {
  thread_type: InboxThreadType;
  conversation: InboxConversation;
  messages: ConversationMessage[];
  lead: Lead | null;
  communication_event?: CommunicationEvent | null;
  related_events: CommunicationEvent[];
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
  total_interactions: number;
  last_outcome: "booked" | "lost" | "open";
  follow_up_needed: boolean;
  last_interaction_at?: string | null;
  latest_note: string;
  latest_sms_thread_id?: string | null;
  latest_sms_manual_takeover: boolean;
  latest_sms_ai_auto_reply_enabled: boolean;
  latest_sms_ai_auto_reply_ready: boolean;
  latest_sms_pending_review: boolean;
  latest_sms_confidence: string;
}

export interface CustomerConversationSummary {
  id: string;
  thread_type: InboxThreadType;
  channel: ChannelType;
  derived_status: "open" | "needs_follow_up" | "booked" | "handled";
  last_message_preview: string;
  last_message_at?: string | null;
  updated_at?: string | null;
  lead_id?: string | null;
  manual_takeover: boolean;
  ai_auto_reply_enabled: boolean;
}

export interface CustomerTimelineItem {
  id: string;
  item_type: "conversation" | "request" | "follow_up" | "waitlist" | "communication_event";
  title: string;
  detail: string;
  channel?: ChannelType | null;
  status?: string | null;
  occurred_at?: string | null;
  lead_id?: string | null;
  conversation_id?: string | null;
  thread_id?: string | null;
  waitlist_entry_id?: string | null;
  follow_up_task_id?: string | null;
  communication_event_id?: string | null;
}

export interface CustomerProfileDetail extends CustomerProfileSummary {
  recent_conversations: CustomerConversationSummary[];
  recent_requests: Lead[];
  timeline: CustomerTimelineItem[];
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
  potential_lost_patients: number;
  recovered_opportunities: number;
  estimated_value_recovered_cents: number;
  estimated_value_recovered_label: string;
  lead_capture_rate: number;
  ai_resolution_estimate: number;
  ai_resolution_estimate_label: string;
  ai_auto_handled_count: number;
  human_review_required_count: number;
  manual_takeover_threads: number;
  suggested_replies_sent_count: number;
  blocked_for_review_count: number;
  deposits_requested_count: number;
  deposits_paid_count: number;
  appointments_waiting_on_deposit_count: number;
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
  auto_generated: boolean;
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
  deposit_status: "not_required" | "required" | "requested" | "paid" | "failed" | "expired" | "waived";
  deposit_requested_at?: string | null;
  deposit_paid_at?: string | null;
  updated_at?: string | null;
}

export interface AppointmentRecord {
  lead_id: string;
  customer_key: string;
  thread_id?: string | null;
  patient_name: string;
  patient_phone: string;
  patient_email: string;
  reason_for_visit: string;
  preferred_datetime_text: string;
  source: ChannelType;
  lead_status: LeadStatus;
  appointment_status: "request_open" | "confirmed" | "cancel_requested" | "reschedule_requested" | "cancelled" | "completed" | "no_show";
  appointment_starts_at?: string | null;
  appointment_ends_at?: string | null;
  reminder_status: "not_ready" | "ready" | "scheduled" | "sent";
  reminder_scheduled_for?: string | null;
  reminder_ready: boolean;
  reminder_blocked_reason: string;
  deposit_required: boolean;
  deposit_amount_cents?: number | null;
  deposit_status: "not_required" | "required" | "requested" | "paid" | "failed" | "expired" | "waived";
  deposit_requested_at?: string | null;
  deposit_paid_at?: string | null;
  deposit_request_delivery_status: string;
  deposit_request_delivery_reason: string;
  follow_up_open: boolean;
  follow_up_task_id?: string | null;
  notes: string;
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

export interface ChannelReadiness {
  id: string;
  channel: ChannelType;
  provider: string;
  connection_status: "not_connected" | "ready_for_setup" | "connected";
  display_name: string;
  contact_value: string;
  automation_enabled: boolean;
  notes: string;
  live: boolean;
  summary: string;
  detail: string;
}

export interface SystemReadinessItem {
  key: string;
  label: string;
  status: "configured" | "partially_configured" | "missing" | "blocked";
  scope: "core" | "feature" | "internal";
  summary: string;
  detail: string;
  action: string;
}

export interface SystemReadiness {
  overall_status: "ready" | "attention" | "blocked";
  configured_count: number;
  partial_count: number;
  missing_count: number;
  blocked_count: number;
  items: SystemReadinessItem[];
}

export interface CommunicationEvent {
  id: string;
  thread_key: string;
  channel: ChannelType;
  direction: "inbound" | "outbound" | "internal";
  event_type: "message" | "missed_call" | "text_back" | "callback_request" | "note" | "reminder" | "deposit_request";
  status: "new" | "queued" | "attempted" | "sent" | "delivered" | "failed" | "skipped" | "completed" | "dismissed";
  customer_key?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  summary: string;
  content: string;
  lead_id?: string | null;
  conversation_id?: string | null;
  waitlist_entry_id?: string | null;
  follow_up_task_id?: string | null;
  provider: string;
  external_id: string;
  provider_message_id: string;
  sender_kind: "patient" | "assistant" | "staff" | "system";
  ai_generated: boolean;
  ai_confidence: "" | "high" | "medium" | "low" | "blocked";
  ai_decision_reason: string;
  auto_reply_status: string;
  auto_reply_reason: string;
  suggested_reply_text: string;
  suggested_reply_status: "" | "pending" | "sent" | "edited_sent" | "discarded";
  suggested_reply_sent_event_id: string;
  failure_reason: string;
  skipped_reason: string;
  sent_at?: string | null;
  delivered_at?: string | null;
  latest_outbound_status?: string | null;
  latest_outbound_summary: string;
  latest_outbound_reason: string;
  latest_outbound_at?: string | null;
  latest_inbound_status?: string | null;
  latest_inbound_summary: string;
  latest_inbound_at?: string | null;
  manual_takeover: boolean;
  ai_auto_reply_enabled: boolean;
  ai_auto_reply_ready: boolean;
  operator_review_required: boolean;
  occurred_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OutboundActivitySummary {
  outbound_sms_total: number;
  reminders_sent: number;
  missed_call_texts_sent: number;
  ai_replies_sent: number;
  ai_reply_failures: number;
  failed_sends: number;
  skipped_sends: number;
  human_review_required: number;
  suggested_replies_sent: number;
  blocked_for_review: number;
  manual_takeover_threads: number;
}

export interface DepositSummary {
  required_count: number;
  requested_count: number;
  paid_count: number;
  waiting_count: number;
  configured_count: number;
  note: string;
}

export interface AppointmentDepositRequestResult {
  lead: Lead;
  checkout_url: string;
  communication_event?: CommunicationEvent | null;
  sms_delivery_status: string;
  blocked_reason: string;
}

export interface OperationsOverview {
  reminder_enabled: boolean;
  reminder_lead_hours: number;
  follow_up_automation_enabled: boolean;
  follow_up_delay_minutes: number;
  reminder_candidates: OperationsLead[];
  action_required_requests: OperationsLead[];
  waitlist_entries: WaitlistEntry[];
  deposit_summary: DepositSummary;
  channel_readiness: ChannelReadiness[];
  system_readiness: SystemReadiness;
  communication_queue: CommunicationEvent[];
  review_queue: CommunicationEvent[];
  due_reminders: ReminderPreview[];
  recent_outbound_messages: CommunicationEvent[];
  outbound_activity: OutboundActivitySummary;
}

export interface ReminderPreview {
  lead_id: string;
  patient_name: string;
  patient_phone: string;
  appointment_starts_at: string;
  reminder_scheduled_for: string;
  channel: ChannelType;
  preview: string;
  is_due: boolean;
  can_send: boolean;
  blocked_reason: string;
}

export interface AutoFollowUpRunResult {
  created_count: number;
  tasks: FollowUpTask[];
}

export interface CommunicationSendPassResult {
  processed_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  events: CommunicationEvent[];
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
  requires_email_confirmation?: boolean;
  message?: string;
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
