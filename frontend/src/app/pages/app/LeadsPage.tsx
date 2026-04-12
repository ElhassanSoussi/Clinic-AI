import { Link } from "react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight,
  Globe,
  Smartphone,
  Target,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiJson } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

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
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (s === "contacted") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  if (s === "booked") {
    return "bg-green-50 text-green-700 border-green-200";
  }
  return "bg-muted text-muted-foreground border-border";
}

export function LeadsPage() {
  const { session } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

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

  const filtered = leads.filter((l) => {
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

  const qualifiedCount = leads.filter((l) => l.status.toLowerCase() === "booked").length;

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="border-b border-border bg-white">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Leads</h1>
              <p className="text-muted-foreground">Track inquiries and convert prospects</p>
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

          <div className="grid grid-cols-4 gap-4">
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
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : qualifiedCount}</p>
              <p className="text-sm text-muted-foreground">Booked</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">—</p>
              <p className="text-sm text-muted-foreground">Potential revenue</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">
                {loading || leads.length === 0
                  ? "—"
                  : `${Math.round((qualifiedCount / leads.length) * 100)}%`}
              </p>
              <p className="text-sm text-muted-foreground">Booked rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            />
          </div>
          <button
            type="button"
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 font-semibold bg-white"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        <div className="space-y-3">
          {loading && <p className="text-muted-foreground text-sm">Loading leads…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-muted-foreground text-sm">No leads yet. Patient chat will create leads here.</p>
          )}
          {filtered.map((lead) => {
            const SourceIcon = lead.source?.toLowerCase().includes("sms") ? Smartphone : Globe;
            const initial = (lead.patient_name || "?").charAt(0).toUpperCase();

            return (
              <Link
                key={lead.id}
                to={`/app/leads/${lead.id}`}
                className="block bg-white rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary">{initial}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground mb-1">{lead.patient_name || "Patient"}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          <span>{lead.patient_email || "—"}</span>
                          <span>•</span>
                          <span>{lead.patient_phone || "—"}</span>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded border ${getStageColor(lead.status)}`}
                          >
                            {statusLabel(lead.status)}
                          </span>
                          <div className="flex items-center gap-1 px-2 py-1 bg-muted border border-border rounded">
                            <SourceIcon className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-semibold">{lead.source || "chat"}</span>
                          </div>
                          {lead.reason_for_visit ? (
                            <span className="text-xs text-muted-foreground line-clamp-1">{lead.reason_for_visit}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Updated</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatRelativeTime(lead.created_at ?? undefined) || "—"}
                        </p>
                      </div>

                      <span className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold flex items-center gap-1">
                        Open
                        <ArrowRight className="w-3 h-3" />
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
