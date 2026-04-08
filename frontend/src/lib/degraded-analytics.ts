import type { FrontdeskAnalytics } from "@/types";

/** Safe zeros when analytics API fails — dashboard stays usable with a refresh banner. */
export const DEGRADED_FRONTDESK_ANALYTICS: FrontdeskAnalytics = {
  conversations_total: 0,
  leads_created: 0,
  booked_requests: 0,
  unresolved_count: 0,
  follow_up_needed_count: 0,
  potential_lost_patients: 0,
  recovered_opportunities: 0,
  estimated_value_recovered_cents: 0,
  estimated_value_recovered_label: "Unavailable — metrics did not load this time.",
  lead_capture_rate: 0,
  ai_resolution_estimate: 0,
  ai_resolution_estimate_label: "—",
  ai_auto_handled_count: 0,
  human_review_required_count: 0,
  manual_takeover_threads: 0,
  suggested_replies_sent_count: 0,
  blocked_for_review_count: 0,
  deposits_requested_count: 0,
  deposits_paid_count: 0,
  appointments_waiting_on_deposit_count: 0,
  busiest_contact_hours: [],
};
