import { useParams, Link } from "react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Phone, MessageSquare, Calendar, Brain, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchLead, fetchLeadConversation, updateLead } from "@/lib/api/services";
import type { LeadRow, MessageRow } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/feedback";

export function LeadDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkedConversationId, setLinkedConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !session?.accessToken) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [l, conv] = await Promise.all([
          fetchLead(session.accessToken, id),
          fetchLeadConversation(session.accessToken, id),
        ]);
        if (!cancelled) {
          setLead(l);
          setNotes(l.notes || "");
          setStatus(l.status || "");
          setMessages(conv.messages || []);
          const convObj = conv.conversation as { id?: string } | null;
          setLinkedConversationId(convObj?.id ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load lead");
          setLead(null);
          setMessages([]);
          setLinkedConversationId(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, session?.accessToken]);

  const saveLead = async () => {
    if (!id || !session?.accessToken || !lead) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateLead(session.accessToken, id, { notes, status });
      setLead(updated);
      notifySuccess("Lead updated");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Save failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-muted-foreground">Loading lead…</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <Link to="/app/leads" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to leads
        </Link>
        <p className="text-destructive">{error || "Lead not found."}</p>
      </div>
    );
  }

  const initial = (lead.patient_name || "?").charAt(0).toUpperCase();

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <Link to="/app/leads" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to leads
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{initial}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{lead.patient_name || "Patient"}</h1>
                  <p className="text-muted-foreground">Lead from {lead.source || "chat"}</p>
                </div>
              </div>
              <label className="text-sm">
                <span className="text-muted-foreground block mb-1">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 bg-white capitalize"
                >
                  {["new", "contacted", "booked", "closed"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{lead.patient_email || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{lead.patient_phone || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{formatDateTime(lead.created_at ?? undefined)}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-3">Inquiry</h3>
              <p className="text-muted-foreground mb-4">{lead.reason_for_visit || "No reason captured."}</p>
              {linkedConversationId ? (
                <p className="text-sm mb-4">
                  <Link to={`/app/inbox/${linkedConversationId}`} className="text-primary font-medium hover:underline">
                    Open linked inbox thread →
                  </Link>
                </p>
              ) : null}
              <label className="block text-sm font-medium mb-2">Staff notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveLead()}
                className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save notes & status"}
              </button>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversation
            </h2>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages linked to this lead.</p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.role === "user" || msg.role === "patient";
                  const isAssistant = msg.role === "assistant" || msg.role === "ai";
                  return (
                    <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-lg ${isUser ? "" : "flex items-start gap-3"}`}>
                        {!isUser && (
                          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-1">
                            <Brain className="w-4 h-4 text-teal-600" />
                          </div>
                        )}
                        <div>
                          <div
                            className={`px-4 py-3 rounded-2xl ${isUser ? "bg-primary text-white" : "bg-white border border-border shadow-sm"
                              }`}
                          >
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2 px-1">
                            <p className={`text-xs ${isUser ? "text-slate-600" : "text-muted-foreground"}`}>
                              {formatDateTime(msg.created_at ?? undefined)}
                            </p>
                            {isAssistant && <span className="text-xs text-teal-600 font-medium">AI</span>}
                          </div>
                        </div>
                        {isUser && (
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-semibold mb-3">Next actions</h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4 mb-4">
              <li>Update status and notes, then save.</li>
              {linkedConversationId ? (
                <li>
                  <Link to={`/app/inbox/${linkedConversationId}`} className="text-primary font-medium hover:underline">
                    Continue in inbox
                  </Link>{" "}
                  for thread controls.
                </li>
              ) : (
                <li>No inbox thread linked yet — conversation history may appear after the patient chats.</li>
              )}
            </ul>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border">
            <h3 className="font-semibold mb-4">Lead information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Source</p>
                <p className="font-medium">{lead.source || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Appointment</p>
                <p className="font-medium capitalize">{(lead.appointment_status || "—").replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lead.appointment_starts_at ? formatDateTime(lead.appointment_starts_at) : "No start time"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
