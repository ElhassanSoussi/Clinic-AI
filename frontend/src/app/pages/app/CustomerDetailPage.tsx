import { useParams, Link } from "react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchCustomerDetail } from "@/lib/api/services";
import type { CustomerDetail } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export function CustomerDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [profile, setProfile] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !session?.accessToken) {
      return;
    }
    const key = decodeURIComponent(id);
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerDetail(session.accessToken, key);
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load patient");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id, session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !profile) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-muted-foreground">Loading patient…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <Link to="/app/customers" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to patients
        </Link>
        <p className="text-destructive mb-4">{error || "Patient not found."}</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {loading ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  const initial = (profile.name || "?").charAt(0).toUpperCase();

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="border-b border-border bg-white">
        <div className="p-4 sm:p-6 md:p-8">
          <Link to="/app/customers" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to patients
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-teal-700">{initial}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{profile.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <span>{profile.total_interactions ?? profile.conversation_count + profile.lead_count} total interactions</span>
                  <span>•</span>
                  <span className="capitalize">{profile.last_outcome || "—"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profile.follow_up_needed ? (
                <span className="px-3 py-1.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg text-sm font-semibold">
                  Follow-up needed
                </span>
              ) : (
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  No open follow-up flag
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Mail className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                <p className="text-sm font-semibold text-foreground">{profile.email || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Phone className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                <p className="text-sm font-semibold text-foreground">{profile.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Calendar className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Last interaction</p>
                <p className="text-sm font-semibold text-foreground">
                  {profile.last_interaction_at ? formatDateTime(profile.last_interaction_at) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
                <p className="text-2xl font-bold text-foreground mb-1">{profile.conversation_count}</p>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
                <p className="text-2xl font-bold text-foreground mb-1">{profile.lead_count}</p>
                <p className="text-sm text-muted-foreground">Requests</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
                <p className="text-2xl font-bold text-foreground mb-1">{profile.booked_count}</p>
                <p className="text-sm text-muted-foreground">Booked</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Recent requests</h2>
              </div>
              <div className="p-6 space-y-3">
                {profile.recent_requests.length === 0 && <p className="text-sm text-muted-foreground">No recent requests.</p>}
                {profile.recent_requests.map((lead) => (
                  <Link
                    key={lead.id}
                    to={`/app/leads/${lead.id}`}
                    className="block p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-teal-200 transition-colors"
                  >
                    <p className="font-semibold text-foreground">{lead.patient_name}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">
                      {lead.status} · {lead.reason_for_visit || "No reason"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Recent conversations</h2>
              </div>
              <div className="p-6 space-y-3">
                {profile.recent_conversations.length === 0 && <p className="text-sm text-muted-foreground">No conversations linked.</p>}
                {profile.recent_conversations.map((c) => {
                  const conv = c as { id?: string; last_message_preview?: string; derived_status?: string; channel?: string };
                  if (!conv.id) {
                    return null;
                  }
                  return (
                    <Link
                      key={conv.id}
                      to={`/app/inbox/${conv.id}`}
                      className="block p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-teal-200 transition-colors"
                    >
                      <p className="text-sm font-semibold text-foreground capitalize">{conv.channel?.replace(/_/g, " ") || "Thread"}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{conv.last_message_preview || conv.derived_status}</p>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Timeline</h2>
              </div>
              <div className="p-6 space-y-4">
                {profile.timeline.length === 0 && <p className="text-sm text-muted-foreground">No timeline events.</p>}
                {profile.timeline.map((item) => {
                  const t = item as {
                    id?: string;
                    title?: string;
                    detail?: string;
                    occurred_at?: string | null;
                    item_type?: string;
                    lead_id?: string | null;
                    conversation_id?: string | null;
                  };
                  return (
                    <div key={t.id || `${t.title}-${t.occurred_at}`} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.detail}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(t.occurred_at ?? undefined)}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {t.lead_id ? (
                            <Link to={`/app/leads/${t.lead_id}`} className="text-xs text-primary font-medium hover:underline">
                              Open request
                            </Link>
                          ) : null}
                          {t.conversation_id ? (
                            <Link to={`/app/inbox/${t.conversation_id}`} className="text-xs text-primary font-medium hover:underline">
                              Open inbox
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Open requests</p>
                  <p className="font-semibold text-foreground">{profile.open_request_count ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Latest note</p>
                  <p className="font-semibold text-foreground">{profile.latest_note || "—"}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4">Quick actions</h3>
              <div className="space-y-2">
                <Link
                  to="/app/inbox"
                  className="w-full h-11 px-4 border border-border rounded-lg hover:bg-slate-50 transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  Open inbox
                </Link>
                <p className="text-xs text-muted-foreground">
                  Deep clinical records, insurance, and charting are not stored in this workspace — only operational CRM data from Clinic AI.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
