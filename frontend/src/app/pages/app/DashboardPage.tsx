import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Brain,
  ListTodo,
} from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "@/lib/auth-context";
import {
  fetchActivity,
  fetchAppointments,
  fetchFrontdeskAnalytics,
  fetchLeads,
} from "@/lib/api/services";
import type { ActivityEvent, AppointmentRecord, FrontdeskAnalytics } from "@/lib/api/types";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleClass, appSectionTitleClass } from "@/lib/page-layout";

type Lead = { id: string; status: string };

export function DashboardPage() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<FrontdeskAnalytics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [a, l, act, appts] = await Promise.all([
          fetchFrontdeskAnalytics(session.accessToken),
          fetchLeads(session.accessToken),
          fetchActivity(session.accessToken, 8),
          fetchAppointments(session.accessToken, "upcoming"),
        ]);
        if (!cancelled) {
          setAnalytics(a);
          setLeads(l);
          setActivity(act);
          setAppointments(appts);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
          setAnalytics(null);
          setLeads([]);
          setActivity([]);
          setAppointments([]);
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
  }, [session?.accessToken]);

  const newLeads = leads.filter((x) => x.status.toLowerCase() === "new").length;

  const upcomingPreview = useMemo(() => {
    const now = Date.now();
    return [...appointments]
      .filter((r) => r.appointment_starts_at && new Date(r.appointment_starts_at).getTime() >= now - 86400000)
      .sort((x, y) => {
        const tx = x.appointment_starts_at ? new Date(x.appointment_starts_at).getTime() : 0;
        const ty = y.appointment_starts_at ? new Date(y.appointment_starts_at).getTime() : 0;
        return tx - ty;
      })
      .slice(0, 6);
  }, [appointments]);

  const aiPct = analytics
    ? Math.min(100, Math.round((analytics.ai_resolution_estimate || 0) * 100))
    : 0;
  const capturePct = analytics
    ? Math.min(100, Math.round((analytics.lead_capture_rate || 0) * 100))
    : 0;

  const aiResolutionBarRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = aiResolutionBarRef.current;
    if (el) {
      el.style.width = `${aiPct}%`;
    }
  }, [aiPct]);

  const unresolved = analytics?.unresolved_count ?? 0;
  const followUps = analytics?.follow_up_needed_count ?? 0;

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="border-b border-border bg-white">
        <div className={appPagePaddingClass}>
          <div className="mb-6">
            <h1 className={appPageTitleClass}>Dashboard</h1>
            <p className={appPageSubtitleClass}>
              Front desk command center — start with what needs a human, then scan volume and the schedule ahead.
            </p>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>

          <div className="rounded-xl border border-border bg-slate-50/80 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ListTodo className="w-5 h-5 text-primary" />
              <h2 className={appSectionTitleClass}>Priorities</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Link
                to="/app/inbox"
                className="rounded-lg border border-border bg-white p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inbox</p>
                <p className="text-2xl font-bold text-foreground mt-1">{loading ? "…" : unresolved}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Unresolved threads</p>
                <p className="text-xs font-semibold text-primary mt-2 inline-flex items-center gap-1">
                  Triage <ArrowRight className="w-3 h-3" />
                </p>
              </Link>
              <Link
                to="/app/inbox"
                className="rounded-lg border border-border bg-white p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Follow-up</p>
                <p className="text-2xl font-bold text-foreground mt-1">{loading ? "…" : followUps}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Flagged for staff</p>
                <p className="text-xs font-semibold text-primary mt-2 inline-flex items-center gap-1">
                  Review <ArrowRight className="w-3 h-3" />
                </p>
              </Link>
              <Link
                to="/app/leads"
                className="rounded-lg border border-border bg-white p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline</p>
                <p className="text-2xl font-bold text-foreground mt-1">{loading ? "…" : newLeads}</p>
                <p className="text-sm text-muted-foreground mt-0.5">New leads</p>
                <p className="text-xs font-semibold text-primary mt-2 inline-flex items-center gap-1">
                  Open leads <ArrowRight className="w-3 h-3" />
                </p>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">
                {loading ? "…" : analytics?.conversations_total ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">Conversations (period)</p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">
                {loading ? "…" : analytics?.booked_requests ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">Booked requests</p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">
                {loading ? "…" : analytics?.leads_created ?? leads.length}
              </p>
              <p className="text-sm text-muted-foreground">Leads created</p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">
                {loading ? "…" : `${capturePct}%`}
              </p>
              <p className="text-sm text-muted-foreground">Lead capture rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className={appPagePaddingClass}>
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <h3 className={appSectionTitleClass}>Queue health</h3>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unresolved</span>
                <span className="font-semibold text-foreground">{loading ? "…" : analytics?.unresolved_count ?? "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Follow-ups needed</span>
                <span className="font-semibold text-foreground">{loading ? "…" : analytics?.follow_up_needed_count ?? "—"}</span>
              </div>
              <Link to="/app/inbox" className="block p-3 border border-border rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Open inbox</p>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
              <Link to="/app/leads" className="block p-3 border border-border rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {newLeads} new lead{newLeads === 1 ? "" : "s"}
                  </p>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className={appSectionTitleClass}>AI handling</h3>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Estimated auto-resolution</span>
                  <span className="text-sm font-bold text-foreground">{loading ? "…" : `${aiPct}%`}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div ref={aiResolutionBarRef} className="bg-primary h-2 rounded-full transition-all min-w-0" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Derived from front-desk analytics. Not a clinical quality score.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className={appSectionTitleClass}>Deposits</h3>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Requested</span>
                <span className="text-sm font-bold text-foreground">
                  {loading ? "…" : analytics?.deposits_requested_count ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid</span>
                <span className="text-sm font-bold text-foreground">
                  {loading ? "…" : analytics?.deposits_paid_count ?? "—"}
                </span>
              </div>
              <Link to="/app/operations" className="text-sm font-semibold text-primary hover:underline inline-block">
                Operations center →
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-border">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className={appSectionTitleClass}>Recent activity</h2>
                <Link to="/app/activity" className="text-sm font-semibold text-primary hover:underline">View all</Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {loading && <p className="text-sm text-muted-foreground">Loading activity…</p>}
                {!loading && activity.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                )}
                {!loading &&
                  activity.map((item) => {
                    const Icon =
                      item.type === "lead_created" || item.type === "lead_status_changed"
                        ? Users
                        : item.type === "conversation_started"
                          ? MessageSquare
                          : CheckCircle;
                    return (
                      <div key={`${item.type}-${item.title}-${item.timestamp}`} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.detail}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(item.timestamp ?? undefined) || "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className={appSectionTitleClass}>Upcoming on the schedule</h2>
                <Link to="/app/appointments" className="text-sm font-semibold text-primary hover:underline">View all</Link>
              </div>
            </div>
            <div className="p-6">
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!loading && upcomingPreview.length === 0 && (
                <p className="text-sm text-muted-foreground">No scheduled appointments in the current view.</p>
              )}
              <div className="space-y-4">
                {!loading &&
                  upcomingPreview.map((apt) => (
                    <div key={apt.lead_id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{(apt.patient_name || "?").charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{apt.patient_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(apt.appointment_starts_at ?? undefined)} • {apt.reason_for_visit || apt.appointment_status}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
