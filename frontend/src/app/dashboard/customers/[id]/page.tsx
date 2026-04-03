"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Mail, Phone, UserRound } from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ChannelBadge, CommunicationEventStatusBadge, FrontdeskStatusBadge } from "@/components/shared/FrontdeskBadges";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { CommunicationEvent, CustomerProfileDetail } from "@/types";

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
  if (outcome === "lost") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function depositBadgeClass(status: string): string {
  if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "requested" || status === "required") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "failed" || status === "expired") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (status === "waived") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function depositBadgeLabel(status: string): string {
  if (status === "requested") return "Deposit requested";
  if (status === "required") return "Deposit required";
  if (status === "paid") return "Deposit paid";
  if (status === "failed") return "Deposit failed";
  if (status === "expired") return "Deposit expired";
  if (status === "waived") return "Deposit waived";
  return "No deposit";
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
  const [error, setError] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.frontdesk.getCustomer(id);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer profile");
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
      setError(err instanceof Error ? err.message : "Failed to send SMS");
    } finally {
      setSendingSms(false);
    }
  };

  if (loading) return <LoadingState message="Loading customer profile..." />;
  if (error) return <ErrorState message={error} onRetry={loadProfile} />;
  if (!profile) {
    return <ErrorState title="Not found" message="This customer profile could not be found." />;
  }

  const latestInboundSms = profile.timeline.find(
    (item) => item.item_type === "communication_event" && item.title === "Inbound SMS"
  );

  return (
    <div className="max-w-6xl">
      <button
        onClick={() => router.push("/dashboard/customers")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Last interaction{" "}
                  {profile.last_interaction_at
                    ? timeAgo(profile.last_interaction_at)
                    : "not recorded"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="px-4 py-3 rounded-xl bg-slate-50">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Conversations</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{profile.conversation_count}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-slate-50">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Requests</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{profile.lead_count}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-slate-50">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Total interactions</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{profile.total_interactions}</p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-slate-50">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Last outcome</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{lastOutcomeLabel(profile.last_outcome)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-5">
              <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${lastOutcomeClass(profile.last_outcome)}`}>
                {lastOutcomeLabel(profile.last_outcome)}
              </span>
              {profile.follow_up_needed && (
                <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                  Follow-up needed
                </span>
              )}
              {profile.latest_sms_thread_id && (
                <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                  profile.latest_sms_pending_review
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : profile.latest_sms_manual_takeover
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : profile.latest_sms_ai_auto_reply_enabled
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                }`}>
                  {profile.latest_sms_pending_review
                    ? "Pending human review"
                    : profile.latest_sms_manual_takeover
                    ? "Staff handling SMS"
                    : profile.latest_sms_ai_auto_reply_enabled
                      ? "AI handling SMS"
                      : "SMS auto-reply off"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Primary identity</p>
                  <p className="text-sm font-medium text-slate-900">{profile.name}</p>
                </div>
              </div>

              {profile.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="text-sm font-medium text-slate-900">{profile.phone}</p>
                  </div>
                </div>
              )}

              {profile.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="text-sm font-medium text-slate-900">{profile.email}</p>
                  </div>
                </div>
              )}
            </div>

            {profile.latest_note && (
              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Recent note
                </p>
                <p className="text-sm text-amber-800 mt-1">{profile.latest_note}</p>
              </div>
            )}

            {latestInboundSms && (
              <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Latest inbound SMS
                </p>
                <p className="text-sm text-blue-900 mt-1">{latestInboundSms.detail}</p>
                {latestInboundSms.occurred_at && (
                  <p className="text-xs text-blue-700/80 mt-2">
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
                      {profile.latest_sms_pending_review
                        ? "The latest SMS needs staff review before Clinic AI sends anything."
                        : profile.latest_sms_manual_takeover
                        ? "Staff is currently handling this thread."
                        : profile.latest_sms_ai_auto_reply_enabled
                          ? "Clinic AI can still reply automatically on this thread."
                          : "SMS auto-reply is currently unavailable on this thread."}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Recent requests
            </h2>
            <div className="space-y-3">
              {profile.recent_requests.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="block rounded-xl border border-slate-100 px-4 py-3 hover:border-teal-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {lead.reason_for_visit || "Appointment request"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {lead.preferred_datetime_text || "Preferred time not captured"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <LeadStatusBadge status={lead.status} />
                      {lead.deposit_status && lead.deposit_status !== "not_required" && (
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${depositBadgeClass(lead.deposit_status)}`}>
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

        <div className="bg-white border border-slate-200 rounded-2xl p-6 h-fit">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Recent conversation history
          </h2>
          <div className="space-y-3">
            {profile.recent_conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/dashboard/inbox/${conversation.id}`}
                className="block rounded-xl border border-slate-100 px-4 py-3 hover:border-teal-200 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={conversation.channel} withIcon />
                    <FrontdeskStatusBadge status={conversation.derived_status} />
                  </div>
                  <span className="text-xs text-slate-400">
                    {conversation.last_message_at
                      ? timeAgo(conversation.last_message_at)
                      : "Recently"}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {conversation.last_message_preview}
                </p>
              </Link>
            ))}
          </div>

          {profile.last_interaction_at && (
            <p className="text-xs text-slate-400 mt-5">
              Most recent activity: {formatDateTime(profile.last_interaction_at)}
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 h-fit">
          {profile.phone && (
            <div className="mb-6 pb-6 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                Send SMS
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Send a real outbound text to this patient. Delivery results will appear in the timeline below.
              </p>
              <textarea
                rows={4}
                value={smsBody}
                onChange={(event) => setSmsBody(event.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                placeholder="Write your message"
              />
              <button
                onClick={sendSms}
                disabled={sendingSms || !smsBody.trim()}
                className="mt-3 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {sendingSms ? "Sending..." : "Send SMS"}
              </button>
            </div>
          )}

          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Customer timeline
          </h2>
          <div className="space-y-3">
            {profile.timeline.map((item) => {
              const href = timelineHref(profile, item);
              const content = (
                <div className="rounded-xl border border-slate-100 px-4 py-3 hover:border-teal-200 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.channel && <ChannelBadge channel={item.channel} withIcon />}
                      {item.item_type === "communication_event" && item.status ? (
                        <CommunicationEventStatusBadge status={item.status as CommunicationEvent["status"]} />
                      ) : item.item_type === "conversation" && item.status ? (
                        <FrontdeskStatusBadge status={item.status as "open" | "needs_follow_up" | "booked" | "handled"} />
                      ) : item.item_type === "request" && item.status ? (
                        <LeadStatusBadge status={item.status as "new" | "contacted" | "booked" | "closed"} />
                      ) : null}
                    </div>
                    <span className="text-xs text-slate-400">
                      {item.occurred_at ? timeAgo(item.occurred_at) : "Recently"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{item.detail}</p>
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
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              No cross-channel activity has been recorded for this customer yet.
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400 mt-5">
            <Clock3 className="w-3.5 h-3.5" />
            SMS sends, reminders, and recovery activity all land in this same timeline. Future channels will stack onto the same history once they are connected.
          </div>
        </div>
      </div>
    </div>
  );
}
