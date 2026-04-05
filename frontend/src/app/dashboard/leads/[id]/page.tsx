"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Clock,
  Save,
  Loader2,
  User,
  MessageSquare,
  CheckCircle2,
  PhoneCall,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDateTime } from "@/lib/utils";
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
    bg: "bg-slate-100",
    hover: "hover:bg-slate-200",
    text: "text-slate-600",
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState<LeadStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [saveMessage, setSaveMessage] = useState("");
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
    setSaveMessage("");
    try {
      const updated = await api.leads.update(id, { status, notes });
      setLead(updated);
      setSaveMessage("Changes saved successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to save changes."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAction = async (targetStatus: LeadStatus) => {
    setQuickSaving(targetStatus);
    try {
      const updated = await api.leads.update(id, { status: targetStatus });
      setLead(updated);
      setStatus(targetStatus);
      setSaveMessage(`Status updated to ${targetStatus}.`);
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to update status."
      );
    } finally {
      setQuickSaving(null);
    }
  };

  if (loading) return <LoadingState message="Loading request details..." />;
  if (error) return <ErrorState message={error} onRetry={loadLead} />;
  if (!lead)
    return (
      <ErrorState title="Not Found" message="This request could not be found." />
    );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to requests
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lead.patient_name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submitted {formatDateTime(lead.created_at)}
          </p>
        </div>
        <LeadStatusBadge status={lead.status as LeadStatus} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {QUICK_ACTIONS.filter((a) => a.target !== lead.status).map((action) => (
          <button
            key={action.target}
            onClick={() => handleQuickAction(action.target)}
            disabled={quickSaving !== null}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-transparent transition-colors ${action.bg} ${action.hover} ${action.text} disabled:opacity-50`}
          >
            {quickSaving === action.target ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <action.icon className="w-4 h-4" />
            )}
            {action.label}
          </button>
        ))}
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Contact information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Name</p>
              <p className="text-sm font-medium text-slate-900">
                {lead.patient_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Phone className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <p className="text-sm font-medium text-slate-900">
                {lead.patient_phone || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-900">
                {lead.patient_email || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Source</p>
              <p className="text-sm font-medium text-slate-900">
                {sourceLabel(lead.source, lead.slot_source)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Visit details
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Reason for Visit</p>
            <p className="text-sm text-slate-700">
              {lead.reason_for_visit || "Not specified"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Preferred Date/Time</p>
              <p className="text-sm text-slate-700">
                {lead.preferred_datetime_text || "Not specified"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lead.slot_source === "availability" || lead.slot_row_index
                  ? "Source: Availability slot"
                  : "Source: Manual preferred time"}
              </p>
            </div>
          </div>
          {lead.slot_row_index && (
            <div className="mt-4 p-3 bg-teal-50 border border-teal-100 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  Confirmed slot
                </p>
                <p className="text-xs text-teal-700">
                  This appointment is linked to row{" "}
                  <strong>{lead.slot_row_index}</strong> in your Availability
                  sheet.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Preview */}
      {chatMessages.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              Chat conversation
            </h2>
            {conversationId && (
              <span className="text-[11px] text-slate-400">
                {chatMessages.length} message{chatMessages.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {chatMessages.slice(-6).map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm ${
                    msg.role === "user"
                      ? "bg-teal-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-700 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status + Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Update request
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="lead-status"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Status
            </label>
            <select
              id="lead-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="lead-notes"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Internal Notes
            </label>
            <textarea
              id="lead-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400 resize-none"
              placeholder="Add internal notes about this request..."
            />
          </div>

          {saveMessage && (
            <p
              className={`text-sm ${
                saveMessage.includes("success") || saveMessage.includes("updated")
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {saveMessage}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
