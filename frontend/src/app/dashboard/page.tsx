"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Users, Clock, CheckCircle2, Phone, ArrowRight, MessageSquare, Settings, AlertTriangle, Zap, UserPlus, ArrowRightLeft } from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { timeAgo } from "@/lib/utils";
import { computeSystemStatus } from "@/lib/system-status";
import type { Lead, Clinic, BillingStatus, ActivityEvent } from "@/types";

const EVENT_CONFIG: Record<ActivityEvent["type"], { icon: typeof UserPlus; color: string; bg: string; label: string }> = {
  lead_created: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50", label: "New Lead" },
  lead_status_changed: { icon: ArrowRightLeft, color: "text-amber-600", bg: "bg-amber-50", label: "Updated" },
  conversation_started: { icon: MessageSquare, color: "text-teal-600", bg: "bg-teal-50", label: "Chat" },
};

/** Dispatch event to open the settings drawer (handled by layout) */
function openSettingsDrawer(section?: string | null) {
  window.dispatchEvent(new CustomEvent("open-settings-drawer", { detail: section ?? null }));
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  booked: number;
}

export default function DashboardPage() {
  const [firstLead] = useState(
    () =>
      globalThis.window !== undefined &&
      new URLSearchParams(globalThis.location.search).get("first_lead") === "true"
  );
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFirstLeadSuccess, setShowFirstLeadSuccess] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, clinicData, billingData, activityData] = await Promise.all([
        api.leads.list(),
        api.clinics.getMyClinic(),
        api.billing.getStatus(),
        api.activity.list(8),
      ]);
      setLeads(data);
      setClinic(clinicData);
      setBilling(billingData);
      setActivity(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (firstLead && !loading) {
      setShowFirstLeadSuccess(true);
    }
  }, [firstLead, loading]);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;

  const stats: Stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    booked: leads.filter((l) => l.status === "booked").length,
  };

  const newLeads = leads.filter((l) => l.status === "new");

  const statCards = [
    {
      label: "Total Requests",
      value: stats.total,
      icon: Users,
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
    {
      label: "New",
      value: stats.new,
      icon: Clock,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Contacted",
      value: stats.contacted,
      icon: Phone,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Booked",
      value: stats.booked,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Overview of your appointment requests and leads
        </p>
      </div>

      {/* First Lead Success Banner */}
      {showFirstLeadSuccess && (
        <div className="mb-8 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-emerald-800">Your first lead is captured! 🎉</h3>
              <p className="text-sm text-emerald-600 mt-0.5">
                Your AI assistant is working. Patient requests will now appear on your dashboard automatically.
              </p>
            </div>
            <button
              onClick={() => setShowFirstLeadSuccess(false)}
              className="text-emerald-400 hover:text-emerald-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">Overview</h2>
        {billing && billing.plan !== "premium" && (
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <Zap className="w-3 h-3" /> Upgrade
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">
                {stat.label}
              </span>
              <div
                className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Critical billing alerts */}
      {billing && (
        <div className="mb-4">
          {billing.monthly_lead_limit !== -1 &&
            billing.monthly_leads_used >= billing.monthly_lead_limit && billing.plan !== "trial" && (
            <div className="p-4 rounded-xl border bg-red-50 border-red-200 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Monthly lead limit reached</p>
                <p className="text-xs text-red-600 mt-0.5">
                  New patient conversations are paused. Upgrade your plan to continue.
                </p>
              </div>
              <Link
                href="/dashboard/billing"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" /> Upgrade
              </Link>
            </div>
          )}
          {billing.subscription_status === "past_due" && (
            <div className="p-4 rounded-xl border bg-red-50 border-red-200 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Payment failed</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Please update your payment method to keep your subscription active.
                </p>
              </div>
              <Link
                href="/dashboard/billing"
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Fix Payment
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Needs Attention */}
      {stats.new > 0 && (
        <div className="bg-white rounded-xl border-2 border-blue-300 mb-8 shadow-sm">
          <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between bg-blue-50/50 rounded-t-xl">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <div className="relative">
                <Clock className="w-4.5 h-4.5 text-blue-600" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
              </div>
              Needs Attention
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                {stats.new} new
              </span>
            </h2>
            <Link
              href="/dashboard/leads?status=new"
              className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View All New
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-blue-50">
            {newLeads.slice(0, 5).map((lead) => (
              <Link
                key={lead.id}
                href={`/dashboard/leads/${lead.id}`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-blue-50/50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {lead.patient_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {lead.reason_for_visit || "No reason specified"}
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {timeAgo(lead.created_at)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 mb-8">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Recent Activity
          </h2>
          <Link
            href="/dashboard/activity"
            className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activity.length === 0 ? (
          <div className="px-5 py-10">
            {clinic && computeSystemStatus(clinic).status === "LIVE" ? (
              <EmptyState
                icon={<MessageSquare className="w-6 h-6 text-slate-400" />}
                title="No activity yet"
                description="Your assistant is live. Events will appear here as patients interact with your clinic."
                action={
                  clinic?.slug ? (
                    <a
                      href={`/chat/${clinic.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Test your assistant
                    </a>
                  ) : undefined
                }
              />
            ) : clinic && computeSystemStatus(clinic).status === "READY" ? (
              <EmptyState
                icon={<MessageSquare className="w-6 h-6 text-slate-400" />}
                title="Ready to go live"
                description="Setup is complete. Go live to start receiving patient requests."
              />
            ) : (
              <EmptyState
                icon={<MessageSquare className="w-6 h-6 text-slate-400" />}
                title="System not live yet"
                description="Complete your setup to start receiving patient requests."
                action={
                  <button
                    onClick={() => openSettingsDrawer()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" /> Complete setup
                  </button>
                }
              />
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activity.slice(0, 8).map((event, i) => {
              const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.lead_created;
              const Icon = config.icon;
              const isLead = event.type === "lead_created" || event.type === "lead_status_changed";

              return (
                <div
                  key={`${event.type}-${event.resource_id}-${i}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isLead ? (
                      <Link
                        href={`/dashboard/leads/${event.resource_id}`}
                        className="text-sm font-medium text-slate-900 hover:text-teal-700 transition-colors truncate block"
                      >
                        {event.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {event.title}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {event.detail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All caught up */}
      {leads.length > 0 && stats.new === 0 && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          You&apos;re all caught up! No new requests need attention.
        </div>
      )}
    </div>
  );
}
