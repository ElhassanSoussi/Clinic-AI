import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { MessageSquare, Calendar, Users, Settings as SettingsIcon, FileText, AlertCircle, Clock } from "lucide-react";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { apiJson } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { activityTypeLabel } from "@/lib/display-text";
import { cn } from "@/app/components/ui/utils";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleClass, appSectionTitleClass } from "@/lib/page-layout";

type ActivityEvent = {
  type: string;
  title: string;
  detail: string;
  timestamp?: string | null;
  resource_id?: string | null;
};

function iconForType(t: string) {
  if (t === "lead_created" || t === "lead_status_changed") {
    return Users;
  }
  if (t === "conversation_started") {
    return MessageSquare;
  }
  if (t.includes("appointment")) {
    return Calendar;
  }
  if (t.includes("note")) {
    return FileText;
  }
  if (t.includes("alert")) {
    return AlertCircle;
  }
  return SettingsIcon;
}

function colorForType(t: string) {
  if (t === "lead_created" || t === "lead_status_changed") {
    return "text-violet-700 bg-violet-50 border-violet-200";
  }
  if (t === "conversation_started") {
    return "text-sky-800 bg-sky-50 border-sky-200";
  }
  if (t.includes("appointment")) {
    return "text-emerald-800 bg-emerald-50 border-emerald-200";
  }
  if (t.includes("alert")) {
    return "text-orange-800 bg-orange-50 border-orange-200";
  }
  return "text-slate-700 bg-slate-50 border-slate-200";
}

function dayKey(ts: string | null | undefined): string {
  if (!ts) {
    return "undated";
  }
  try {
    const d = parseISO(ts);
    if (!isValid(d)) {
      return "undated";
    }
    return format(startOfDay(d), "yyyy-MM-dd");
  } catch {
    return "undated";
  }
}

function dayTitle(key: string): string {
  if (key === "undated") {
    return "Undated / no timestamp";
  }
  try {
    return format(parseISO(`${key}T12:00:00`), "EEEE, MMMM d, yyyy");
  } catch {
    return key;
  }
}

export function ActivityPage() {
  const { session } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
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
        const data = await apiJson<ActivityEvent[]>("/activity?limit=50", {
          accessToken: session.accessToken,
        });
        if (!cancelled) {
          setEvents(data || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load activity");
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

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const ev of events) {
      const k = dayKey(ev.timestamp);
      if (!map.has(k)) {
        map.set(k, []);
      }
      map.get(k)!.push(ev);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === "undated") {
        return 1;
      }
      if (b === "undated") {
        return -1;
      }
      return b.localeCompare(a);
    });
    return keys.map((key) => ({ key, label: dayTitle(key), items: map.get(key)! }));
  }, [events]);

  return (
    <div className={appPagePaddingClass}>
      <div className="mb-8">
        <h1 className={appPageTitleClass}>Activity</h1>
        <p className={appPageSubtitleClass}>
          A day-by-day log of what changed — new chats, leads, and updates your team should know about.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm md:col-span-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">Events loaded</p>
          <p className="text-3xl font-bold text-foreground tabular-nums">{loading ? "…" : events.length}</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Showing the 50 most recent events.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-white">
          <h2 className={appSectionTitleClass}>Timeline</h2>
          <p className="text-sm text-muted-foreground mt-1">Newest days first. Each row is a single event.</p>
        </div>
        <div className="p-6 bg-background">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && events.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-slate-50/60 px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">No activity in this window</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                That usually means a quiet period or a new clinic. Patient chats and lead updates will appear here automatically.{" "}
                <Link to="/app/dashboard" className="text-primary font-semibold hover:underline">
                  Back to dashboard
                </Link>
              </p>
            </div>
          )}
          <div className="space-y-10">
            {!loading &&
              grouped.map((group) => (
                <section key={group.key}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-border" />
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide whitespace-nowrap">{group.label}</h3>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="relative ml-2 sm:ml-4 pl-6 sm:pl-8 space-y-4">
                    <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />
                    {group.items.map((ev, idx) => {
                      const Icon = iconForType(ev.type);
                      const chip = colorForType(ev.type);
                      const typeLabel = activityTypeLabel(ev.type);
                      return (
                        <div key={`${ev.type}-${ev.resource_id}-${idx}`} className="relative">
                          <div className="absolute -left-6 sm:-left-8 top-3 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border",
                                  chip,
                                )}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{typeLabel}</span>
                                  {ev.resource_id ? (
                                    <span className="text-[11px] font-mono text-muted-foreground">#{ev.resource_id.slice(0, 8)}…</span>
                                  ) : null}
                                </div>
                                <h4 className="font-semibold text-foreground text-sm sm:text-base leading-snug">{ev.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{ev.detail}</p>
                                <div className="flex items-center gap-2 mt-3 text-xs font-medium text-muted-foreground flex-wrap">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatRelativeTime(ev.timestamp ?? undefined) || "—"}
                                  {ev.timestamp ? (
                                    <span className="text-muted-foreground/80">
                                      ·{" "}
                                      {(() => {
                                        try {
                                          const d = parseISO(ev.timestamp!);
                                          return isValid(d) ? format(d, "MMM d, yyyy · HH:mm") : "";
                                        } catch {
                                          return "";
                                        }
                                      })()}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
