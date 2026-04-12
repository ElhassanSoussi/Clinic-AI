import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  Globe,
  Smartphone,
  Target,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiJson } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { cn } from "@/app/components/ui/utils";
import { humanizeSnake } from "@/lib/display-text";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleCompactClass } from "@/lib/page-layout";

type LeadRow = {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  source: string;
  status: string;
  reason_for_visit: string;
  created_at?: string | null;
};

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "new") {
    return "New";
  }
  if (s === "contacted") {
    return "Contacted";
  }
  if (s === "booked") {
    return "Booked";
  }
  if (s === "closed") {
    return "Closed";
  }
  return status;
}

function getStageColor(status: string) {
  const s = status.toLowerCase();
  if (s === "new") {
    return "bg-sky-50 text-sky-900 border-sky-200 ring-1 ring-sky-100";
  }
  if (s === "contacted") {
    return "bg-violet-50 text-violet-900 border-violet-200 ring-1 ring-violet-100";
  }
  if (s === "booked") {
    return "bg-emerald-50 text-emerald-900 border-emerald-200 ring-1 ring-emerald-100";
  }
  if (s === "closed") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }
  return "bg-muted text-muted-foreground border-border";
}

function nextStepHint(status: string): string {
  const s = status.toLowerCase();
  if (s === "new") {
    return "Next: reach out and confirm intent";
  }
  if (s === "contacted") {
    return "Next: propose times or answer objections";
  }
  if (s === "booked") {
    return "On calendar — confirm prep and reminders";
  }
  if (s === "closed") {
    return "Closed — archive or revisit if they return";
  }
  return "Next: review details and update stage";
}

function sourceLabel(raw: string): string {
  const r = (raw || "").trim();
  if (!r) {
    return "Chat";
  }
  return humanizeSnake(r.replace(/\./g, "_"));
}

export function LeadsPage() {
  const { session } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | "new" | "contacted" | "booked" | "closed">("all");
  const [staleOnly, setStaleOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiJson<LeadRow[]>("/leads", {
          accessToken: session.accessToken,
        });
        if (!cancelled) {
          setLeads(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load leads");
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

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.status.toLowerCase() !== stageFilter) {
        return false;
      }
      if (staleOnly) {
        const st = l.status.toLowerCase();
        if (st === "booked" || st === "closed") {
          return false;
        }
        if (!l.created_at) {
          return false;
        }
        const t = new Date(l.created_at).getTime();
        if (!Number.isFinite(t) || Date.now() - t <= 72 * 3600 * 1000) {
          return false;
        }
      }
      if (!q.trim()) {
        return true;
      }
      const n = q.toLowerCase();
      return (
        l.patient_name.toLowerCase().includes(n) ||
        l.patient_email.toLowerCase().includes(n) ||
        (l.patient_phone || "").toLowerCase().includes(n)
      );
    });
  }, [leads, q, stageFilter, staleOnly]);

  const qualifiedCount = leads.filter((l) => l.status.toLowerCase() === "booked").length;
  const newCount = leads.filter((l) => l.status.toLowerCase() === "new").length;
  const activePipeline = leads.filter((l) => {
    const s = l.status.toLowerCase();
    return s !== "booked" && s !== "closed";
  }).length;
  const staleOpen = leads.filter((l) => {
    const s = l.status.toLowerCase();
    if (s === "booked" || s === "closed") {
      return false;
    }
    if (!l.created_at) {
      return false;
    }
    const t = new Date(l.created_at).getTime();
    return Number.isFinite(t) && Date.now() - t > 72 * 3600 * 1000;
  }).length;

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="border-b border-border bg-white">
        <div className={appPagePaddingClass}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={cn(appPageTitleCompactClass, "mb-2")}>Leads</h1>
              <p className={appPageSubtitleClass}>
                Track requests from first message to booked: stage, source, and next step at a glance.
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-semibold opacity-60 cursor-not-allowed"
              title="Create lead via chat or API"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : leads.length}</p>
              <p className="text-sm text-muted-foreground">Total leads</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : newCount}</p>
              <p className="text-sm text-muted-foreground">New — need first response</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : activePipeline}</p>
              <p className="text-sm text-muted-foreground">Active pipeline (not booked/closed)</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : qualifiedCount}</p>
              <p className="text-sm text-muted-foreground">Booked</p>
              <p className="text-xs text-muted-foreground mt-2 leading-snug">
                {loading || leads.length === 0
                  ? "—"
                  : `${Math.round((qualifiedCount / leads.length) * 100)}% booked rate`}
                {staleOpen > 0 ? ` · ${staleOpen} open >72h` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={appPagePaddingClass}>
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm text-destructive">
            {error}
          </div>
        )}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search leads..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              />
            </div>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "px-4 py-2 border border-border rounded-lg transition-colors flex items-center gap-2 font-semibold bg-white shrink-0",
                  stageFilter !== "all" || staleOnly ? "border-primary/40 bg-primary/5" : "hover:bg-muted",
                )}
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className={cn("w-4 h-4 transition-transform", filtersOpen && "rotate-180")} />
                {(stageFilter !== "all" || staleOnly) && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary">On</span>
                )}
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="rounded-xl border border-border bg-white p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Stage</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All"],
                    ["new", "New"],
                    ["contacted", "Contacted"],
                    ["booked", "Booked"],
                    ["closed", "Closed"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStageFilter(val)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors",
                      stageFilter === val
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-foreground border-border hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={staleOnly}
                onChange={(e) => setStaleOnly(e.target.checked)}
                className="rounded border-border"
              />
              Open leads older than 72 hours (excludes booked & closed)
            </label>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-3">
          {loading && <p className="text-muted-foreground text-sm">Loading leads…</p>}
          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-slate-50/60 px-6 py-8 text-center max-w-lg">
              <p className="text-sm font-medium text-foreground">
                {leads.length === 0 ? "No leads yet" : "No leads match"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {leads.length === 0 ? (
                  <>
                    New requests from your public chat and other channels will land here. Copy your chat link from{" "}
                    <Link to="/app/settings" className="text-primary font-semibold hover:underline">
                      Settings
                    </Link>
                    .
                  </>
                ) : (
                  <>Clear the search box or reset filters to see more rows.</>
                )}
              </p>
            </div>
          )}
          {filtered.map((lead) => {
            const SourceIcon = lead.source?.toLowerCase().includes("sms") ? Smartphone : Globe;
            const initial = (lead.patient_name || "?").charAt(0).toUpperCase();
            const st = lead.status.toLowerCase();
            const isStaleOpen =
              st !== "booked" &&
              st !== "closed" &&
              lead.created_at &&
              Date.now() - new Date(lead.created_at).getTime() > 72 * 3600 * 1000;
            const hasEmail = Boolean((lead.patient_email || "").trim());
            const hasPhone = Boolean((lead.patient_phone || "").trim());

            return (
              <Link
                key={lead.id}
                to={`/app/leads/${lead.id}`}
                className={cn(
                  "block bg-white rounded-xl border transition-all hover:shadow-sm",
                  st === "booked"
                    ? "border-emerald-200 hover:border-emerald-300"
                    : isStaleOpen
                      ? "border-orange-200 hover:border-orange-300 border-l-4 border-l-orange-400"
                      : "border-border hover:border-primary/40",
                )}
              >
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 border border-border">
                        <span className="font-bold text-primary">{initial}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground text-base">{lead.patient_name || "Patient"}</h3>
                          {isStaleOpen ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded">
                              Stale
                            </span>
                          ) : null}
                          {st === "booked" ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                              Booked
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-2">
                          <span className={hasEmail ? "" : "text-muted-foreground/70"}>
                            {hasEmail ? lead.patient_email : "No email"}
                          </span>
                          <span className="text-border">·</span>
                          <span className={hasPhone ? "" : "text-muted-foreground/70"}>
                            {hasPhone ? lead.patient_phone : "No phone"}
                          </span>
                          <span className="text-border">·</span>
                          <span className="text-xs font-medium text-foreground/80">
                            {hasEmail || hasPhone ? "Reachable" : "Needs contact capture"}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-foreground mb-3">{nextStepHint(lead.status)}</p>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getStageColor(lead.status)}`}>
                            {statusLabel(lead.status)}
                          </span>
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-border rounded-md">
                            <SourceIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">{sourceLabel(lead.source)}</span>
                          </div>
                          {lead.reason_for_visit ? (
                            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[280px]" title={lead.reason_for_visit}>
                              Intent: {lead.reason_for_visit}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Intent not recorded</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 lg:gap-4 flex-shrink-0 lg:min-w-[140px]">
                      <div className="text-left lg:text-right">
                        <p className="text-xs font-semibold text-muted-foreground mb-0.5">Added</p>
                        <p className="text-sm font-semibold text-foreground tabular-nums">
                          {formatRelativeTime(lead.created_at ?? undefined) || "—"}
                        </p>
                      </div>

                      <span className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold shadow-sm">
                        Open lead
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
