import type { Page } from "@playwright/test";

export const FAKE_USER = JSON.stringify({
  id: "e2e-test-user",
  email: "e2e@clinic.test",
  full_name: "E2E Test",
  clinic_id: "e2e-clinic",
  clinic_name: "E2E Clinic",
  access_token: "e2e-fake-token",
  has_completed_onboarding: true,
});

/**
 * Seed localStorage and intercept backend API calls so the 401
 * interceptor in api.ts doesn't redirect us back to /login.
 */
export async function seedAuth(page: Page) {
  await page.addInitScript(
    (user: string) => {
      localStorage.setItem("auth_user", user);
      localStorage.setItem("access_token", "e2e-fake-token");
    },
    FAKE_USER,
  );

  await page.route("**/api/**", (route) => {
    const url = route.request().url();

    if (url.includes("/clinics/me") || /\/clinics\/[^/]+$/.exec(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "e2e-clinic",
          name: "E2E Clinic",
          slug: "e2e-clinic",
          phone: "+1234567890",
          email: "e2e@clinic.test",
          address: "123 Test St",
          services: ["General"],
          google_sheet_id: "fake-sheet",
          notifications_enabled: true,
          notification_email: "e2e@clinic.test",
          availability_enabled: true,
          is_live: true,
        }),
      });
    }

    if (url.includes("/leads") || url.includes("/conversations") || url.includes("/threads")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (url.includes("/billing")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          plan: "starter_trial",
          plan_name: "Starter Trial",
          subscription_status: "trialing",
          messages_used: 0,
          messages_limit: 50,
        }),
      });
    }

    if (url.includes("/frontdesk/analytics")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          conversations_total: 0,
          leads_created: 0,
          booked_requests: 0,
          unresolved_count: 0,
          follow_up_needed_count: 0,
          potential_lost_patients: 0,
          recovered_opportunities: 0,
          estimated_value_recovered_cents: 0,
          estimated_value_recovered_label: "$0",
          lead_capture_rate: 0,
          ai_resolution_estimate: 0,
          ai_resolution_estimate_label: "0%",
          ai_auto_handled_count: 0,
          human_review_required_count: 0,
          manual_takeover_threads: 0,
          suggested_replies_sent_count: 0,
          blocked_for_review_count: 0,
          deposit_requested_count: 0,
          deposit_paid_count: 0,
          deposit_waiting_count: 0,
          busiest_contact_hours: [],
        }),
      });
    }

    if (url.includes("/activity")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (url.includes("/frontdesk/operations")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reminder_enabled: false,
          reminder_lead_hours: 24,
          follow_up_automation_enabled: false,
          follow_up_delay_minutes: 45,
          reminder_candidates: [],
          action_required_requests: [],
          waitlist_entries: [],
          deposit_summary: {
            required_count: 0,
            requested_count: 0,
            paid_count: 0,
            waiting_count: 0,
            configured_count: 0,
            note: "No deposits tracked yet.",
          },
          channel_readiness: [],
          system_readiness: {
            configured_count: 0,
            partial_count: 0,
            missing_count: 0,
            blocked_count: 0,
            items: [],
          },
          communication_queue: [],
          review_queue: [],
          due_reminders: [],
          recent_outbound_messages: [],
          outbound_activity: {
            outbound_sms_total: 0,
            ai_replies_sent: 0,
            human_review_required: 0,
            suggested_replies_sent: 0,
            reminders_sent: 0,
            missed_call_texts_sent: 0,
            manual_takeover_threads: 0,
            failed_sends: 0,
            skipped_sends: 0,
            ai_reply_failures: 0,
            blocked_for_review: 0,
          },
        }),
      });
    }

    if (
      url.includes("/frontdesk/opportunities") ||
      url.includes("/frontdesk/follow-ups") ||
      url.includes("/frontdesk/appointments") ||
      url.includes("/frontdesk/customers") ||
      url.includes("/frontdesk/reminders") ||
      url.includes("/frontdesk/channels") ||
      url.includes("/frontdesk/communications")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    if (url.includes("/frontdesk/training")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          assistant_name: "AI Assistant",
          knowledge_score: 0,
          knowledge_status: "needs_work",
          readiness_items: [],
          knowledge_gaps: [],
          custom_sources: [],
          documents: [],
          document_stats: { total: 0, ready: 0, processing: 0, failed: 0, total_chunks: 0 },
        }),
      });
    }

    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}
