import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, Filter, Users, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchCustomers } from "@/lib/api/services";
import type { CustomerSummary } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export function CustomersPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
    const q = query.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const followUps = useMemo(() => filtered.filter((c) => c.follow_up_needed).length, [filtered]);

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="border-b border-border bg-white">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Patients</h1>
              <p className="text-[15px] text-muted-foreground">Customer profiles aggregated from conversations and requests</p>
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
              <p className="text-sm text-muted-foreground">
                Revenue and visit counts are not part of this API response; metrics below reflect interaction counts only.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8">
        <div className="flex gap-3 mb-6 flex-wrap">
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
          <button
            type="button"
            className="h-11 px-4 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium bg-white"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading patients…</p>}
        {!loading && filtered.length === 0 && <p className="text-sm text-muted-foreground">No patient profiles found.</p>}

        <div className="space-y-3">
          {!loading &&
            filtered.map((customer) => (
              <Link
                key={customer.key}
                to={`/app/customers/${encodeURIComponent(customer.key)}`}
                className="group block bg-white rounded-xl border border-border hover:border-teal-200 hover:shadow-md transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-teal-700">{customer.name.charAt(0)}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-base font-bold text-foreground">{customer.name}</h3>
                          {customer.follow_up_needed ? (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-50 text-orange-800 border border-orange-200">
                              Follow-up
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-700">Active</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3 flex-wrap">
                          <span>{customer.email || "—"}</span>
                          <span>•</span>
                          <span>{customer.phone || "—"}</span>
                        </div>

                        <div className="flex items-center gap-6 flex-wrap text-xs text-muted-foreground">
                          <span>
                            Conversations: <strong className="text-foreground">{customer.conversation_count}</strong>
                          </span>
                          <span>
                            Requests: <strong className="text-foreground">{customer.lead_count}</strong> (open{" "}
                            {customer.open_request_count ?? "—"})
                          </span>
                          <span>
                            Booked: <strong className="text-foreground">{customer.booked_count}</strong>
                          </span>
                          {customer.last_interaction_at ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Last: {formatDateTime(customer.last_interaction_at)}
                            </span>
                          ) : null}
                        </div>
                        {customer.latest_note ? (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">Note: {customer.latest_note}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground mb-1">Last outcome</p>
                      <p className="text-sm font-semibold text-foreground max-w-[200px]">{customer.last_outcome || "—"}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
