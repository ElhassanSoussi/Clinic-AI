"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Phone, UserRound } from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChannelBadge, CommunicationEventStatusBadge, FrontdeskStatusBadge } from "@/components/shared/FrontdeskBadges";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { CommunicationEvent, CustomerProfileDetail } from "@/types";
import { depositStatusClass as depositBadgeClass, depositStatusLabel as depositBadgeLabel } from "@/lib/format-helpers";
import { ActionErrorBanner } from "@/components/shared/ActionErrorBanner";
import { WorkspaceBand } from "@/components/shared/WorkspaceBand";
import { DetailSection } from "@/components/shared/detail/DetailSection";
import { OperationalCallout } from "@/components/shared/detail/OperationalCallout";
import { DetailBackLink } from "@/components/shared/detail/DetailBackLink";
import { customerOperationalHint } from "@/lib/operational-hints";

function timelineHref(profile: CustomerProfileDetail, item: CustomerProfileDetail["timeline"][number]): string | null {
  if (item.thread_id) {
    return `/dashboard/inbox/${item.thread_id}`;
  }
  if (item.lead_id) {
    return `/dashboard/leads/${item.lead_id}`;
  }
  if (item.waitlist_entry_id) {
    return "/dashboard/operations";
  }
  if (item.follow_up_task_id) {
    return "/dashboard/opportunities";
  }
  return profile.key ? `/dashboard/customers/${profile.key}` : null;
}

function lastOutcomeLabel(outcome: CustomerProfileDetail["last_outcome"]): string {
  if (outcome === "booked") return "Booked";
  if (outcome === "lost") return "Lost";
  return "Open";
}

function lastOutcomeClass(outcome: CustomerProfileDetail["last_outcome"]): string {
  if (outcome === "booked") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (outcome === "lost") return "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function smsStatusClass(profile: CustomerProfileDetail): string {
  if (profile.latest_sms_pending_review) return "bg-blue-50 text-blue-700 border-blue-200";
  if (profile.latest_sms_manual_takeover) return "bg-amber-50 text-amber-700 border-amber-200";
  if (profile.latest_sms_ai_auto_reply_enabled) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]";
}

function smsStatusLabel(profile: CustomerProfileDetail): string {
  if (profile.latest_sms_pending_review) return "Pending human review";
  if (profile.latest_sms_manual_takeover) return "Staff handling SMS";
  if (profile.latest_sms_ai_auto_reply_enabled) return "AI handling SMS";
  return "SMS auto-reply off";
}

function smsStatusDescription(profile: CustomerProfileDetail): string {
  if (profile.latest_sms_pending_review) return "The latest SMS needs staff review before Clinic AI sends anything.";
  if (profile.latest_sms_manual_takeover) return "Staff is currently handling this thread.";
  if (profile.latest_sms_ai_auto_reply_enabled) return "Clinic AI can still reply automatically on this thread.";
  return "SMS auto-reply is currently unavailable on this thread.";
}

function TimelineItemBadge({ item }: Readonly<{ item: CustomerProfileDetail["timeline"][number] }>) {
  if (item.item_type === "communication_event" && item.status) {
    return <CommunicationEventStatusBadge status={item.status as CommunicationEvent["status"]} />;
  }
  if (item.item_type === "conversation" && item.status) {
    return <FrontdeskStatusBadge status={item.status as "open" | "needs_follow_up" | "booked" | "handled"} />;
  }
  if (item.item_type === "request" && item.status) {
    return <LeadStatusBadge status={item.status as "new" | "contacted" | "booked" | "closed"} />;
  }
  return null;
}

export default function CustomerProfilePage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const [profile, setProfile] = useState<CustomerProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await api.frontdesk.getCustomer(id);
      setProfile(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load customer profile");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const sendSms = async () => {
    if (!profile?.phone || !smsBody.trim()) return;
    setSendingSms(true);
    try {
      await api.frontdesk.sendSms({
        customer_name: profile.name,
        customer_phone: profile.phone,
        customer_email: profile.email,
        body: smsBody,
      });
      setSmsBody("");
      await loadProfile();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to send SMS");
    } finally {
      setSendingSms(false);
    }
  };

  if (loading) return <LoadingState message="Loading customer profile..." />;
  if (loadError) return <ErrorState variant="calm" message={loadError} onRetry={loadProfile} />;
  if (!profile) {
    return <ErrorState title="Not found" message="This customer profile could not be found." />;
  }

  const latestInboundSms = profile.timeline.find(
    (item) => item.item_type === "communication_event" && item.title === "Inbound SMS"
  );

  const op = customerOperationalHint(profile);
  const calloutTone =
    profile.latest_sms_pending_review || profile.follow_up_needed
      ? "attention"
      : profile.last_outcome === "booked"
        ? "information"
        : "neutral";

  return (
    <div className="workspace-page min-w-0">
      <DetailBackLink href="/dashboard/customers">Back to Customers</DetailBackLink>

      <PageHeader
        eyebrow={
          <>
            <UserRound className="h-3.5 w-3.5" />
            Customer profile
          </>
        }
        title={profile.name}
        description={
          profile.last_interaction_at
            ? `Last interaction ${timeAgo(profile.last_interaction_at)} · ${formatDateTime(profile.last_interaction_at)}`
            : "No recent interaction timestamp on file."
        }
        showDivider
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${lastOutcomeClass(profile.last_outcome)}`}>
              {lastOutcomeLabel(profile.last_outcome)}
            </span>
            {profile.follow_up_needed ? (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Follow-up
              </span>
            ) : null}
          </div>
        }
      />

      <ActionErrorBanner message={actionError} onDismiss={() => setActionError("")} />

      <WorkspaceBand>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,17.5rem)] lg:items-stretch">
          <OperationalCallout title="Operational focus" headline={op.title} tone={calloutTone}>
            {op.body}
          </OperationalCallout>
          <div className="flex flex-col justify-center rounded-xl border border-[#E2E8F0] bg-white/90 px-4 py-3.5 sm:px-5">
            <p className="workspace-rail-title mb-3">Activity</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-[#64748B]">Conversations</dt>
                <dd className="text-lg font-semibold text-[#0F172A]">{profile.conversation_count}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748B]">Requests</dt>
                <dd className="text-lg font-semibold text-[#0F172A]">{profile.lead_count}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748B]">Interactions</dt>
                <dd className="text-lg font-semibold text-[#0F172A]">{profile.total_interactions}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#64748B]">SMS</dt>
                <dd className="text-xs font-semibold leading-snug text-[#0F172A]">
                  {profile.latest_sms_thread_id ? smsStatusLabel(profile) : "No active thread"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </WorkspaceBand>

      <div className="workspace-split">
        <div className="min-w-0 space-y-6">
          <div className="app-card p-5 sm:p-6">
            <DetailSection
              label="Identity & reachability"
              description="Primary contact points your team already has on file."
            >
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${lastOutcomeClass(profile.last_outcome)}`}>
                  Outcome: {lastOutcomeLabel(profile.last_outcome)}
                </span>
                {profile.latest_sms_thread_id ? (
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${smsStatusClass(profile)}`}>
                    {smsStatusLabel(profile)}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                    <UserRound className="h-4 w-4 text-[#475569]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Name</p>
                    <p className="text-sm font-medium text-[#0F172A]">{profile.name}</p>
                  </div>
                </div>
                {profile.phone ? (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                      <Phone className="h-4 w-4 text-[#475569]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Phone</p>
                      <p className="text-sm font-medium text-[#0F172A]">{profile.phone}</p>
                    </div>
                  </div>
                ) : null}
                {profile.email ? (
                  <div className="flex items-center gap-2.5 sm:col-span-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                      <Mail className="h-4 w-4 text-[#475569]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">Email</p>
                      <p className="text-sm font-medium text-[#0F172A]">{profile.email}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              {profile.latest_note ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Latest staff note</p>
                  <p className="mt-1 text-sm text-amber-950">{profile.latest_note}</p>
                </div>
              ) : null}

              {latestInboundSms ? (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">Latest inbound SMS</p>
                  <p className="mt-1 text-sm text-blue-950">{latestInboundSms.detail}</p>
                  {latestInboundSms.occurred_at ? (
                    <p className="mt-1 text-xs text-blue-800/90">{formatDateTime(latestInboundSms.occurred_at)}</p>
                  ) : null}
                  {profile.latest_sms_thread_id ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/inbox/${profile.latest_sms_thread_id}`}
                        className="text-sm font-semibold text-blue-800 hover:text-blue-900"
                      >
                        Open SMS thread
                      </Link>
                      <span className="text-xs text-blue-800/85">{smsStatusDescription(profile)}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </DetailSection>
          </div>

          <div className="app-card p-5 sm:p-6">
            <DetailSection label="Recent requests" description="Booking requests tied to this contact, newest first in the list.">
              <div className="space-y-2">
                {profile.recent_requests.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    className="block rounded-xl border border-[#E2E8F0] px-3.5 py-3 transition-colors hover:border-[#99f6e4] hover:bg-[#F8FAFC]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0F172A]">{lead.reason_for_visit || "Appointment request"}</p>
                        <p className="mt-0.5 text-xs text-[#64748B]">{lead.preferred_datetime_text || "Preferred time not captured"}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <LeadStatusBadge status={lead.status} />
                        {lead.deposit_status && lead.deposit_status !== "not_required" ? (
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${depositBadgeClass(lead.deposit_status)}`}>
                            {depositBadgeLabel(lead.deposit_status)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </DetailSection>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <div className="app-card p-5 sm:p-6">
            <DetailSection label="Recent conversations" description="Latest threads across channels.">
              <div className="space-y-2">
                {profile.recent_conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/dashboard/inbox/${conversation.id}`}
                    className="block rounded-xl border border-[#E2E8F0] px-3.5 py-3 transition-colors hover:border-[#99f6e4] hover:bg-[#F8FAFC]"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <ChannelBadge channel={conversation.channel} withIcon />
                        <FrontdeskStatusBadge status={conversation.derived_status} />
                      </div>
                      <span className="text-xs text-[#64748B]">
                        {conversation.last_message_at ? timeAgo(conversation.last_message_at) : "—"}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#0F172A]">{conversation.last_message_preview}</p>
                  </Link>
                ))}
              </div>
            </DetailSection>
          </div>

          {profile.phone ? (
            <div className="app-card p-5 sm:p-6">
              <DetailSection
                label="Send SMS"
                description="Outbound text logged to this customer — delivery appears in the timeline."
              >
                <textarea
                  rows={4}
                  value={smsBody}
                  onChange={(event) => setSmsBody(event.target.value)}
                  className="app-input min-h-28 w-full resize-none"
                  placeholder="Write your message"
                />
                <button
                  type="button"
                  onClick={sendSms}
                  disabled={sendingSms || !smsBody.trim()}
                  className="mt-3 rounded-lg bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-50"
                >
                  {sendingSms ? "Sending…" : "Send SMS"}
                </button>
              </DetailSection>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="app-card p-5 sm:p-6">
        <DetailSection
          label="Full timeline"
          description="Cross-channel activity: conversations, requests, SMS events, and operational touchpoints."
        >
          <div className="space-y-2">
            {profile.timeline.map((item) => {
              const href = timelineHref(profile, item);
              const content = (
                <div className="rounded-xl border border-[#E2E8F0] px-3.5 py-3 transition-colors hover:border-[#99f6e4] hover:bg-[#F8FAFC]">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.channel ? <ChannelBadge channel={item.channel} withIcon /> : null}
                      <TimelineItemBadge item={item} />
                    </div>
                    <span className="text-xs text-[#64748B]">{item.occurred_at ? timeAgo(item.occurred_at) : "—"}</span>
                  </div>
                  <p className="text-sm font-medium text-[#0F172A]">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#475569]">{item.detail}</p>
                </div>
              );

              if (!href) {
                return <div key={item.id}>{content}</div>;
              }

              return (
                <Link key={item.id} href={href}>
                  {content}
                </Link>
              );
            })}
          </div>

          {profile.timeline.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3.5 text-sm text-[#475569]">
              No cross-channel activity has been recorded for this customer yet.
            </div>
          ) : null}

          {profile.last_interaction_at ? (
            <p className="mt-4 text-xs text-[#64748B]">Most recent activity: {formatDateTime(profile.last_interaction_at)}</p>
          ) : null}
        </DetailSection>
      </div>
    </div>
  );
}
