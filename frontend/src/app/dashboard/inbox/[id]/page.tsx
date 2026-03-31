"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
  UserRound,
} from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ChannelBadge, FrontdeskStatusBadge } from "@/components/shared/FrontdeskBadges";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { ConversationDetail } from "@/types";

export default function InboxThreadPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConversation = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.frontdesk.getConversation(id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  if (loading) return <LoadingState message="Loading conversation..." />;
  if (error) return <ErrorState message={error} onRetry={loadConversation} />;
  if (!detail) {
    return <ErrorState title="Not found" message="This conversation could not be found." />;
  }

  const { conversation, lead, messages } = detail;

  return (
    <div className="max-w-6xl">
      <button
        onClick={() => router.push("/dashboard/inbox")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Inbox
      </button>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {conversation.customer_name}
                </h1>
                <ChannelBadge channel={conversation.channel} />
                <FrontdeskStatusBadge status={conversation.derived_status} />
              </div>
              <p className="text-sm text-slate-500">
                Started {conversation.conversation_started_at ? formatDateTime(conversation.conversation_started_at) : "recently"}
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  {conversation.summary
                    ? conversation.summary
                    : "No message transcript is stored for this conversation yet."}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "bg-teal-600 text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-700 rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-[11px] mt-2 ${
                          message.role === "user" ? "text-white/70" : "text-slate-400"
                        }`}
                      >
                        {message.created_at ? formatDateTime(message.created_at) : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="w-full xl:w-84 shrink-0 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Customer
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="font-medium text-slate-900">{conversation.customer_name}</p>
                </div>
              </div>

              {conversation.customer_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-medium text-slate-900">{conversation.customer_phone}</p>
                  </div>
                </div>
              )}

              {conversation.customer_email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-slate-900">{conversation.customer_email}</p>
                  </div>
                </div>
              )}
            </div>

            {conversation.customer_key && (
              <Link
                href={`/dashboard/customers/${conversation.customer_key}`}
                className="inline-flex items-center gap-2 mt-5 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
              >
                <UserRound className="w-4 h-4" />
                Open customer profile
              </Link>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Request status
            </h2>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <FrontdeskStatusBadge status={conversation.derived_status} />
              {lead && <LeadStatusBadge status={lead.status} />}
            </div>

            {lead ? (
              <div className="space-y-3 text-sm text-slate-600">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Reason for visit</p>
                  <p>{lead.reason_for_visit || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Preferred time</p>
                  <p>{lead.preferred_datetime_text || "Not provided"}</p>
                </div>
                {lead.notes && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Internal notes</p>
                    <p>{lead.notes}</p>
                  </div>
                )}
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open request detail
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500 leading-relaxed">
                This conversation has not created a linked request yet. If the patient stopped before sharing details, it may need manual follow-up.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
