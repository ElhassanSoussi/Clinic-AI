import type { ChannelType, CustomerProfileSummary, LeadStatus } from "@/types";

export function leadNextStepHint(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "Contact the patient or capture missing details, then update status.";
    case "contacted":
      return "Confirm scheduling on the calendar you already use, then mark booked when the visit time is set.";
    case "booked":
      return "Complete prep in Appointments — reminders, deposits, and schedule changes — as needed.";
    case "closed":
      return "No further pipeline work unless they reach out again.";
    default:
      return "";
  }
}

export type InboxNextStepParams = {
  readonly isEventThread: boolean;
  readonly eventChannel: string | undefined;
  readonly channel: ChannelType;
  readonly pendingReview: boolean;
  readonly manualTakeover: boolean;
  readonly aiAutoReplyEnabled: boolean;
  readonly aiAutoReplyReady: boolean;
  readonly hasLead: boolean;
  readonly derivedStatus: string;
};

/** Copy-only operational hint derived from real thread fields (no new backend concepts). */
export function inboxNextStepHint(params: InboxNextStepParams): { title: string; body: string } {
  if (params.pendingReview) {
    return {
      title: "Review the drafted SMS",
      body: "Approve, edit, or discard the assistant's draft before anything else sends on this thread.",
    };
  }

  if (params.isEventThread && params.eventChannel === "missed_call") {
    return {
      title: "Recover the caller",
      body: "Reply by SMS and convert to a booking request when the patient is ready to schedule.",
    };
  }

  if (params.derivedStatus === "needs_follow_up" && !params.hasLead) {
    return {
      title: "Close the loop",
      body: "Create a follow-up task or convert this thread to a request so status, booking, and reminders stay in one place.",
    };
  }

  if (!params.hasLead) {
    return {
      title: "Capture the request",
      body: "When you have name and intent, convert to a lead to track pipeline, booking, and operational messages.",
    };
  }

  if (params.channel === "sms") {
    if (params.manualTakeover) {
      return {
        title: "Staff-owned replies",
        body: "New inbound SMS waits for your team until you re-enable automatic replies on this thread.",
      };
    }
    if (params.aiAutoReplyEnabled && params.aiAutoReplyReady) {
      return {
        title: "AI-assisted SMS",
        body: "Clinic AI can draft or send routine replies; you can still take over manually at any time.",
      };
    }
  }

  if (params.derivedStatus === "booked") {
    return {
      title: "Visit confirmed",
      body: "Keep internal notes current and use Appointments for reminders and deposit follow-through.",
    };
  }

  if (params.derivedStatus === "handled") {
    return {
      title: "Thread handled",
      body: "No urgent inbox actions — reopen from the patient’s profile or a new inbound message if needed.",
    };
  }

  return {
    title: "Keep momentum",
    body: "Use the transcript and linked request to document outcomes and next touches for your team.",
  };
}

type CustomerOperationalPick = Pick<
  CustomerProfileSummary,
  "follow_up_needed" | "latest_sms_pending_review" | "last_outcome"
>;

export function customerOperationalHint(profile: CustomerOperationalPick): { title: string; body: string } {
  if (profile.latest_sms_pending_review) {
    return {
      title: "SMS review open",
      body: "Open the latest SMS thread to approve, edit, or discard drafted replies before Clinic AI sends again.",
    };
  }
  if (profile.follow_up_needed) {
    return {
      title: "Follow-up flagged",
      body: "Someone marked that this contact still needs a deliberate touch — use inbox threads and requests to close the loop.",
    };
  }
  if (profile.last_outcome === "booked") {
    return {
      title: "Booking trajectory",
      body: "Last recorded outcome is booked — keep operational work aligned in Appointments and linked requests.",
    };
  }
  return {
    title: "Relationship overview",
    body: "Scan conversations and requests below to see how this person has engaged across channels.",
  };
}
