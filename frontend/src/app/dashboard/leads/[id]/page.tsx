"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  Calendar,
  Clock,
  Save,
  Loader2,
  User,
  Users,
  CheckCircle2,
  PhoneCall,
  XCircle,
  Inbox,
} from "lucide-react";
import { api } from "@/lib/api";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActionErrorBanner } from "@/components/shared/ActionErrorBanner";
import { WorkspaceBand } from "@/components/shared/WorkspaceBand";
import { DetailSection } from "@/components/shared/detail/DetailSection";
import { OperationalCallout } from "@/components/shared/detail/OperationalCallout";
import { DetailBackLink } from "@/components/shared/detail/DetailBackLink";
import { formatDateTime } from "@/lib/utils";
import { leadNextStepHint } from "@/lib/operational-hints";
import {
  humanizeSnakeCase,
  appointmentStatusClass,
  depositStatusClass,
  depositStatusLabel,
} from "@/lib/format-helpers";
import type { Lead, LeadStatus, ConversationMessage } from "@/types";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "booked", label: "Booked" },
  { value: "closed", label: "Closed" },
];

const QUICK_ACTIONS: {
  target: LeadStatus;
  label: string;
  icon: typeof PhoneCall;
  bg: string;
  hover: string;
  text: string;
}[] = [
    {
      target: "contacted",
      label: "Mark contacted",
      icon: PhoneCall,
      bg: "bg-amber-50",
      hover: "hover:bg-amber-100",
      text: "text-amber-700",
    },
    {
      target: "booked",
      label: "Mark booked",
      icon: CheckCircle2,
      bg: "bg-emerald-50",
      hover: "hover:bg-emerald-100",
      text: "text-emerald-700",
    },
    {
      target: "closed",
      label: "Mark closed",
      icon: XCircle,
      bg: "bg-app-surface-alt",
      hover: "hover:bg-app-surface-alt",
      text: "text-app-text-muted",
    },
  ];

function sourceLabel(source: string, slotSource?: string): string {
  if (slotSource === "availability") return "Availability slot";
  if (source === "web_chat") return "AI chat";
  if (source === "sms") return "SMS";
  if (source === "whatsapp") return "WhatsApp";
  if (source === "missed_call") return "Missed call";
  if (source === "callback_request") return "Callback request";
  if (source === "manual") return "Manual entry";
  return source;
}

export default function LeadDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState<LeadStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ConversationMessage[]>([]);

  const loadLead = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, convData] = await Promise.all([
        api.leads.get(id),
        api.leads.getConversation(id),
      ]);
      setLead(data);
      setNotes(data.notes || "");
      setStatus(data.status as LeadStatus);
      setConversationId(convData.conversation?.id || null);
      setChatMessages(convData.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  const handleSave = async () => {
    setSaving(true);
    setActionError("");
    try {
      const updated = await api.leads.update(id, { status, notes });
      setLead(updated);
      setSuccessMessage("Changes saved successfully.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAction = async (targetStatus: LeadStatus) => {
    setQuickSaving(targetStatus);
    setActionError("");
    try {
      const updated = await api.leads.update(id, { status: targetStatus });
      setLead(updated);
      setStatus(targetStatus);
      setSuccessMessage(`Status updated to ${targetStatus}.`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setQuickSaving(null);
    }
  };

  if (loading) return <LoadingState message="Loading request details..." />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={loadLead} />;
  if (!lead)
    return (
      <ErrorState title="Not Found" message="This request could not be found." />
    );

  const appointmentSummary =
    lead.appointment_status === "confirmed" && lead.appointment_starts_at
      ? formatDateTime(lead.appointment_starts_at)
      : null;

  let reminderLine: string | null = null;
  if (lead.reminder_status && lead.reminder_status !== "not_ready") {
    const reminderBase = humanizeSnakeCase(lead.reminder_status);
    const reminderSuffix = lead.reminder_scheduled_for ? " · " + formatDateTime(lead.reminder_scheduled_for) : "";
    reminderLine = reminderBase + reminderSuffix;
  }

  let calloutTone: "neutral" | "information" | "attention" = "attention";
  if (lead.status === "closed") calloutTone = "neutral";
  else if (lead.status === "booked") calloutTone = "information";

  return (
    <div className="workspace-grid space-y-6 min-w-0">
      <DetailBackLink href="/dashboard/leads">Back to Leads</DetailBackLink>

      <PageHeader
        eyebrow={
          <>
            <Users className="h-3.5 w-3.5" />
            Booking request
          </>
        }
        title={lead.patient_name}
        description={`Opened ${formatDateTime(lead.created_at)} · Last updated ${formatDateTime(lead.updated_at)}`}
        showDivider
        actions={<LeadStatusBadge status={lead.status as LeadStatus} />}
      />

      <ActionErrorBanner message={actionError} onDismiss={() => setActionError("")} />

      <WorkspaceBand>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:items-stretch">
          <OperationalCallout title="Operational focus" tone={calloutTone}>
            {leadNextStepHint(lead.status as LeadStatus)}
          </OperationalCallout>
          <div className="flex flex-col justify-center rounded-xl border border-app-border bg-app-surface/90 px-4 py-3.5 sm:px-5">
            <p className="panel-section-head mb-2">Request snapshot</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-app-text-muted">Source</dt>
                <dd className="text-right font-medium text-app-text">{sourceLabel(lead.source, lead.slot_source)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-app-text-muted">Preferred time</dt>
                <dd className="max-w-56 text-right font-medium text-app-text">
                  {lead.preferred_datetime_text || "—"}
                </dd>
              </div>
              {appointmentSummary ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-app-text-muted">Confirmed time</dt>
                  <dd className="text-right font-medium text-app-text">{appointmentSummary}</dd>
                </div>
              ) : null}
              {lead.appointment_status ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-app-text-muted">Booking state</dt>
                  <dd className="text-right">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${appointmentStatusClass(lead.appointment_status)}`}
                    >
                      {lead.appointment_status === "confirmed" ? "Confirmed" : humanizeSnakeCase(lead.appointment_status)}
                    </span>
                  </dd>
                </div>
              ) : null}
              {reminderLine ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-app-text-muted">Reminder</dt>
                  <dd className="max-w-56 text-right text-sm font-medium text-app-text">{reminderLine}</dd>
                </div>
              ) : null}
              {lead.deposit_status && lead.deposit_status !== "not_required" ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-app-text-muted">Deposit</dt>
                  <dd className="text-right">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${depositStatusClass(lead.deposit_status)}`}
                    >
                      {depositStatusLabel(lead.deposit_status)}
                    </span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </WorkspaceBand>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-6">
          <div className="panel-surface rounded-3xl p-5 sm:p-6">
            <DetailSection
              label="Contact"
              description="Verified contact paths on this request."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-surface-alt">
                    <User className="h-4 w-4 text-app-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm text-app-text-muted">Name</p>
                    <p className="text-sm font-medium text-app-text">{lead.patient_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-surface-alt">
                    <Phone className="h-4 w-4 text-app-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm text-app-text-muted">Phone</p>
                    <p className="text-sm font-medium text-app-text">{lead.patient_phone || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-surface-alt">
                    <Mail className="h-4 w-4 text-app-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm text-app-text-muted">Email</p>
                    <p className="text-sm font-medium text-app-text">{lead.patient_email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-surface-alt">
                    <Calendar className="h-4 w-4 text-app-text-muted" />
                  </div>
                  <div>
                    <p className="text-sm text-app-text-muted">Inbound source</p>
                    <p className="text-sm font-medium text-app-text">{sourceLabel(lead.source, lead.slot_source)}</p>
                  </div>
                </div>
              </div>
            </DetailSection>
          </div>

          <div className="panel-surface rounded-3xl p-5 sm:p-6">
            <DetailSection
              label="Visit & scheduling"
              description="Patient intent and preferences. Confirmed visits remain tied to this lead — use the calendar you already rely on for real slot management."
            >
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-app-text-muted">Reason for visit</p>
                  <p className="mt-1 text-sm text-app-text">{lead.reason_for_visit || "Not specified"}</p>
                </div>
                <div className="flex gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-app-text-muted" />
                  <div>
                    <p className="text-sm font-medium text-app-text-muted">Preferred date / time</p>
                    <p className="mt-1 text-sm text-app-text">{lead.preferred_datetime_text || "Not specified"}</p>
                    <p className="mt-1 text-sm text-app-text-muted">
                      {lead.slot_source === "availability" || lead.slot_row_index
                        ? "Captured from an availability slot when the patient chose one."
                        : "Free-text preference from the patient or staff."}
                    </p>
                  </div>
                </div>
                {lead.slot_row_index ? (
                  <div className="rounded-xl border border-teal-200 bg-app-accent-wash px-4 py-3">
                    <p className="text-sm font-semibold uppercase tracking-wider text-app-accent-dark">Availability row</p>
                    <p className="mt-1 text-sm text-app-accent-dark">
                      Linked to row <strong>{lead.slot_row_index}</strong> in your Availability sheet — not a separate scheduling product.
                    </p>
                  </div>
                ) : null}
              </div>
            </DetailSection>
          </div>

          {chatMessages.length > 0 ? (
            <div className="panel-surface rounded-3xl p-5 sm:p-6">
              <DetailSection
                label="Related conversation"
                description="Latest lines from the AI chat tied to this request when one exists."
              >
                <div className="rounded-2xl border border-app-border/60 bg-app-surface-alt px-4 py-4 space-y-3">
                  {chatMessages.slice(-8).map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${msg.role === "user"
                          ? "bg-app-primary text-white"
                          : "bg-app-surface text-app-text ring-1 ring-app-border"
                          }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                {conversationId ? (
                  <Link
                    href={`/dashboard/inbox/${conversationId}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-app-accent-dark hover:text-app-primary"
                  >
                    <Inbox className="h-4 w-4" />
                    Open full thread in inbox
                  </Link>
                ) : null}
              </DetailSection>
            </div>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="panel-section-head mb-2">Pipeline actions</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.filter((a) => a.target !== lead.status).map((action) => (
                <button
                  key={action.target}
                  type="button"
                  onClick={() => handleQuickAction(action.target)}
                  disabled={quickSaving !== null}
                  className={`flex items-center gap-2 rounded-lg border border-transparent px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${action.bg} ${action.hover} ${action.text}`}
                >
                  {quickSaving === action.target ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <action.icon className="h-4 w-4" />
                  )}
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-surface rounded-3xl p-4 sm:p-5">
            <DetailSection label="Record & notes">
              <div className="space-y-4">
                <div>
                  <label htmlFor="lead-status" className="block text-sm font-medium text-app-text">
                    Status
                  </label>
                  <select
                    id="lead-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LeadStatus)}
                    className="mt-1.5 w-full rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm focus:border-app-primary focus:ring-2 focus:ring-app-accent-wash"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="lead-notes" className="block text-sm font-medium text-app-text">
                    Internal notes
                  </label>
                  <textarea
                    id="lead-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    className="mt-1.5 w-full resize-none rounded-lg border border-app-border bg-app-surface px-3.5 py-2.5 text-sm placeholder:text-app-text-muted focus:border-app-primary focus:ring-2 focus:ring-app-accent-wash"
                    placeholder="Operational context for your team only…"
                  />
                </div>

                {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-app-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-app-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save changes
                </button>
              </div>
            </DetailSection>
          </div>
        </aside>
      </div>
    </div>
  );
}
