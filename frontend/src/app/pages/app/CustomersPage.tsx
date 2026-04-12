import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, Filter, Users, Calendar, Clock, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchCustomers } from "@/lib/api/services";
import type { CustomerSummary } from "@/lib/api/types";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { formatOutcomeLabel, sanitizeStaffNote } from "@/lib/display-text";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { cn } from "@/app/components/ui/utils";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleClass, appSectionTitleClass } from "@/lib/page-layout";

export function CustomersPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [followUpOnly, setFollowUpOnly] = useState(false);
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
        const data = await fetchCustomers(session.accessToken);
        if (!cancelled) {
          setRows(data || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load patients");
          setRows([]);
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
    let list = rows;
    if (followUpOnly) {
      list = list.filter((c) => c.follow_up_needed);
    }
    const q = query.trim().toLowerCase();
    if (!q) {
      return list;
    }
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q),
    );
  }, [rows, query, followUpOnly]);

  const followUps = useMemo(() => filtered.filter((c) => c.follow_up_needed).length, [filtered]);

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="border-b border-border bg-white">
        <div className={appPagePaddingClass}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className={appPageTitleClass}>Patients</h1>
              <p className={appPageSubtitleClass}>
                One row per person: contact info, recent visits to your front desk, and short staff notes patients should never see raw.
              </p>
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : rows.length}</p>
              <p className="text-sm text-muted-foreground">Profiles</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : followUps}</p>
              <p className="text-sm text-muted-foreground">Need follow-up (filtered)</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : filtered.length}</p>
              <p className="text-sm text-muted-foreground">Shown</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-border">
              <p className={cn(appSectionTitleClass, "text-base mb-1")}>At a glance</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Totals reflect live front-desk data: conversations, open requests, and booked leads linked to each person.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={appPagePaddingClass}>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
              />
            </div>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-11 px-4 border border-border rounded-lg transition-colors flex items-center gap-2 text-sm font-medium bg-white shrink-0",
                  followUpOnly ? "border-primary/40 bg-primary/5" : "hover:bg-muted",
                )}
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className={cn("w-4 h-4 transition-transform", filtersOpen && "rotate-180")} />
                {followUpOnly && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary">On</span>
                )}
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="rounded-xl border border-border bg-white p-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={followUpOnly}
                onChange={(e) => setFollowUpOnly(e.target.checked)}
                className="rounded border-border"
              />
              Follow-up needed only
            </label>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Matches the follow-up flag from your clinic data — same signal as the orange badge on each row.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {loading && <p className="text-sm text-muted-foreground">Loading patients…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? "No patient profiles found."
              : "No patients match your search or filters. Try clearing the follow-up filter or search terms."}
          </p>
        )}

        <div className="space-y-3">
          {!loading &&
            filtered.map((customer) => {
              const note = sanitizeStaffNote(customer.latest_note, 160);
              const outcome = formatOutcomeLabel(customer.last_outcome);
              return (
                <Link
                  key={customer.key}
                  to={`/app/customers/${encodeURIComponent(customer.key)}`}
                  className="group block bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-accent border border-border flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary">{customer.name.charAt(0)}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base font-bold text-foreground">{customer.name}</h3>
                            {customer.follow_up_needed ? (
                              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-orange-50 text-orange-900 border border-orange-200">
                                Follow-up
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                                In relationship
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3 flex-wrap">
                            <span className="font-medium text-foreground/90">{customer.email || "No email"}</span>
                            <span className="text-border">·</span>
                            <span className="font-medium text-foreground/90">{customer.phone || "No phone"}</span>
                          </div>

                          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="rounded-lg border border-border bg-slate-50/80 px-3 py-2">
                              <dt className="text-muted-foreground font-medium">Conversations</dt>
                              <dd className="text-lg font-bold text-foreground tabular-nums">{customer.conversation_count}</dd>
                            </div>
                            <div className="rounded-lg border border-border bg-slate-50/80 px-3 py-2">
                              <dt className="text-muted-foreground font-medium">Requests</dt>
                              <dd className="text-lg font-bold text-foreground tabular-nums">{customer.lead_count}</dd>
                            </div>
                            <div className="rounded-lg border border-border bg-slate-50/80 px-3 py-2">
                              <dt className="text-muted-foreground font-medium">Open requests</dt>
                              <dd className="text-lg font-bold text-foreground tabular-nums">{customer.open_request_count ?? "—"}</dd>
                            </div>
                            <div className="rounded-lg border border-border bg-slate-50/80 px-3 py-2">
                              <dt className="text-muted-foreground font-medium">Booked</dt>
                              <dd className="text-lg font-bold text-foreground tabular-nums">{customer.booked_count}</dd>
                            </div>
                          </dl>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                            {customer.last_interaction_at ? (
                              <span className="flex items-center gap-1.5 font-medium">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                Last touch {formatRelativeTime(customer.last_interaction_at)} ·{" "}
                                <span className="text-muted-foreground font-normal">{formatDateTime(customer.last_interaction_at)}</span>
                              </span>
                            ) : (
                              <span>No recorded touch yet</span>
                            )}
                          </div>
                          {note ? (
                            <p className="text-xs text-foreground/90 mt-2 line-clamp-2 border-l-2 border-primary/30 pl-2">
                              <span className="font-semibold text-muted-foreground">Staff note · </span>
                              {note}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="lg:text-right flex-shrink-0 lg:max-w-[220px] lg:border-l lg:border-border lg:pl-5">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Last outcome</p>
                        <p className="text-sm font-semibold text-foreground leading-snug">{outcome}</p>
                        <p className="text-xs text-primary font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          Open profile →
                        </p>
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
