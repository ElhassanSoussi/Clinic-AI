import { useEffect, useState } from "react";
import { MessageSquare, Calendar, Users, Settings as SettingsIcon, FileText, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiJson } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

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
    return "text-purple-600 bg-purple-50";
  }
  if (t === "conversation_started") {
    return "text-blue-600 bg-blue-50";
  }
  return "text-slate-600 bg-slate-50";
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Activity</h1>
        <p className="text-muted-foreground">Recent leads and conversations for your clinic</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Events loaded</p>
          <p className="text-3xl font-bold">{loading ? "…" : events.length}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Timeline</h2>
        </div>
        <div className="p-6">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && events.length === 0 && (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
          <div className="relative ml-4 pl-8 space-y-6">
            <div className="absolute left-0 top-3 bottom-3 w-px bg-border" />
            {!loading &&
              events.map((ev, idx) => {
                const Icon = iconForType(ev.type);
                const colorClass = colorForType(ev.type);
                return (
                  <div key={`${ev.type}-${ev.resource_id}-${idx}`} className="relative">
                    <div className="absolute -left-8 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white" />
                    <div className="bg-white rounded-lg border border-border p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1">{ev.title}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{ev.detail}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(ev.timestamp ?? undefined) || "—"}
                              </span>
                              <span className="text-xs opacity-70">{ev.type}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors flex-shrink-0"
                        >
                          View
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
