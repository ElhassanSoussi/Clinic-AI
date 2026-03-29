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
