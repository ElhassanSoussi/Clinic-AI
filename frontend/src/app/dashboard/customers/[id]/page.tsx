"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, UserRound } from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { FrontdeskStatusBadge } from "@/components/shared/FrontdeskBadges";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { CustomerProfileDetail } from "@/types";

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

  if (loading) return <LoadingState message="Loading customer profile..." />;
  if (error) return <ErrorState message={error} onRetry={loadProfile} />;
  if (!profile) {
    return <ErrorState title="Not found" message="This customer profile could not be found." />;
  }

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
              </div>
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
                    <LeadStatusBadge status={lead.status} />
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
                  <FrontdeskStatusBadge status={conversation.derived_status} />
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
      </div>
    </div>
  );
}
