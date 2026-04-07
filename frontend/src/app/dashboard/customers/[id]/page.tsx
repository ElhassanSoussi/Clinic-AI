"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, UserRound } from "lucide-react";

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
  const router = useRouter();
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
  if (loadError) return <ErrorState message={loadError} onRetry={loadProfile} />;
  if (!profile) {
    return <ErrorState title="Not found" message="This customer profile could not be found." />;
  }

  const latestInboundSms = profile.timeline.find(
    (item) => item.item_type === "communication_event" && item.title === "Inbound SMS"
  );

  return (
    <div className="max-w-6xl space-y-6">
      <button
        onClick={() => router.push("/dashboard/customers")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white/80 px-3 py-1.5 text-sm font-semibold text-[#475569] shadow-sm transition-colors hover:text-[#0F172A]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Customers
      </button>

      <PageHeader
        eyebrow={
          <>
            <UserRound className="h-3.5 w-3.5" />
            Customer profile
          </>
        }
        title={profile.name}
        description="Thread state, booking outcome, SMS handling, and timeline for this contact."
      />

      <ActionErrorBanner message={actionError} onDismiss={() => setActionError("")} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="app-card p-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">{profile.name}</h1>
                <p className="text-sm text-[#475569] mt-0.5">
                  Last interaction{" "}
                  {profile.last_interaction_at
                    ? timeAgo(profile.last_interaction_at)
                    : "not recorded"}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 text-center sm:grid-cols-2 lg:grid-cols-4">
                <div className="px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-xs uppercase tracking-widest text-[#64748B]">Conversations</p>
                  <p className="text-lg font-bold text-[#0F172A] mt-0.5">{profile.conversation_count}</p>
                </div>
                <div className="px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-xs uppercase tracking-widest text-[#64748B]">Requests</p>
                  <p className="text-lg font-bold text-[#0F172A] mt-0.5">{profile.lead_count}</p>
                </div>
                <div className="px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-xs uppercase tracking-widest text-[#64748B]">Total interactions</p>
                  <p className="text-lg font-bold text-[#0F172A] mt-0.5">{profile.total_interactions}</p>
                </div>
                <div className="px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <p className="text-xs uppercase tracking-widest text-[#64748B]">Last outcome</p>
                  <p className="text-lg font-bold text-[#0F172A] mt-0.5">{lastOutcomeLabel(profile.last_outcome)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-4">
              <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${lastOutcomeClass(profile.last_outcome)}`}>
                {lastOutcomeLabel(profile.last_outcome)}
              </span>
              {profile.follow_up_needed && (
                <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                  Follow-up needed
                </span>
              )}
              {profile.latest_sms_thread_id && (
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${smsStatusClass(profile)}`}>
                  {smsStatusLabel(profile)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                  <UserRound className="w-3.5 h-3.5 text-[#475569]" />
                </div>
                <div>
                  <p className="text-xs text-[#64748B]">Primary identity</p>
                  <p className="text-sm font-medium text-[#0F172A]">{profile.name}</p>
                </div>
              </div>

              {profile.phone && (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-[#475569]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Phone</p>
                    <p className="text-sm font-medium text-[#0F172A]">{profile.phone}</p>
                  </div>
                </div>
              )}

              {profile.email && (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-[#475569]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B]">Email</p>
                    <p className="text-sm font-medium text-[#0F172A]">{profile.email}</p>
                  </div>
                </div>
              )}
            </div>

            {profile.latest_note && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                  Recent note
                </p>
                <p className="text-sm text-amber-800 mt-0.5">{profile.latest_note}</p>
              </div>
            )}

            {latestInboundSms && (
              <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
                  Latest inbound SMS
                </p>
                <p className="text-sm text-blue-900 mt-0.5">{latestInboundSms.detail}</p>
                {latestInboundSms.occurred_at && (
                  <p className="text-xs text-blue-700/80 mt-1.5">
                    {formatDateTime(latestInboundSms.occurred_at)}
                  </p>
                )}
                {profile.latest_sms_thread_id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/inbox/${profile.latest_sms_thread_id}`}
                      className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      Open SMS thread
                    </Link>
                    <span className="text-xs text-blue-700/80">
                      {smsStatusDescription(profile)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-3">
              Recent requests
            </h2>
            <div className="space-y-2.5">
              {profile.recent_requests.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="block rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 hover:border-[#99f6e4] hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {lead.reason_for_visit || "Appointment request"}
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {lead.preferred_datetime_text || "Preferred time not captured"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <LeadStatusBadge status={lead.status} />
                      {lead.deposit_status && lead.deposit_status !== "not_required" && (
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${depositBadgeClass(lead.deposit_status)}`}>
                          {depositBadgeLabel(lead.deposit_status)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 h-fit">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">
            Recent conversation history
          </h2>
          <div className="space-y-2.5">
            {profile.recent_conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/dashboard/inbox/${conversation.id}`}
                className="block rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 hover:border-[#99f6e4] hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={conversation.channel} withIcon />
                    <FrontdeskStatusBadge status={conversation.derived_status} />
                  </div>
                  <span className="text-xs text-[#64748B]">
                    {conversation.last_message_at
                      ? timeAgo(conversation.last_message_at)
                      : "Recently"}
                  </span>
                </div>
                <p className="text-sm text-[#0F172A] leading-relaxed">
                  {conversation.last_message_preview}
                </p>
              </Link>
            ))}
          </div>

          {profile.last_interaction_at && (
            <p className="text-xs text-[#64748B] mt-4">
              Most recent activity: {formatDateTime(profile.last_interaction_at)}
            </p>
          )}
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 h-fit">
          {profile.phone && (
            <div className="mb-4 pb-4 border-b border-[#E2E8F0]">
              <h2 className="text-sm font-semibold text-[#0F172A] mb-2.5">
                Send SMS
              </h2>
              <p className="text-xs text-[#64748B] mb-2.5">
                Send a real outbound text to this patient. Delivery results will appear in the timeline below.
              </p>
              <textarea
                rows={4}
                value={smsBody}
                onChange={(event) => setSmsBody(event.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1] resize-none"
                placeholder="Write your message"
              />
              <button
                onClick={sendSms}
                disabled={sendingSms || !smsBody.trim()}
                className="mt-2.5 px-3 py-1.5 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] transition-colors disabled:opacity-50"
              >
                {sendingSms ? "Sending..." : "Send SMS"}
              </button>
            </div>
          )}

          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">
            Customer timeline
          </h2>
          <div className="space-y-2.5">
            {profile.timeline.map((item) => {
              const href = timelineHref(profile, item);
              const content = (
                <div className="rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 hover:border-[#99f6e4] hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.channel && <ChannelBadge channel={item.channel} withIcon />}
                      <TimelineItemBadge item={item} />
                    </div>
                    <span className="text-xs text-[#64748B]">
                      {item.occurred_at ? timeAgo(item.occurred_at) : "Recently"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#0F172A]">{item.title}</p>
                  <p className="text-sm text-[#475569] mt-0.5 leading-relaxed">{item.detail}</p>
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

          {profile.timeline.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3.5 text-sm text-[#475569]">
              No cross-channel activity has been recorded for this customer yet.
            </div>
          )}

          {profile.timeline.length > 0 && (
            <p className="text-xs text-[#64748B] mt-4">
              All channels and activity types appear in this timeline.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
