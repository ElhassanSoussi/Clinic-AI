import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Globe, Smartphone, Clock, CheckCircle2, Inbox as InboxIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchFrontdeskInbox } from "@/lib/api/services";
import type { InboxConversation } from "@/lib/api/types";
import { formatRelativeTime } from "@/lib/format";
import { humanizeSnake, formatSessionRef } from "@/lib/display-text";
import { cn } from "@/app/components/ui/utils";
import { appPageSubtitleClass, appPageTitleCompactClass, appSectionTitleClass } from "@/lib/page-layout";

type FilterMode = "all" | "attention";

type Row = {
  id: string;
  name: string;
  contactLine: string;
  sessionRef: string;
  preview: string;
  time: string;
  requiresAttention: boolean;
  channel: string;
  status: string;
  aiHandled: boolean;
};

function channelLabel(raw: string): { label: string; isWeb: boolean } {
  const c = (raw || "").toLowerCase();
  if (c.includes("sms") || c === "sms") {
    return { label: "SMS", isWeb: false };
  }
  return { label: raw ? humanizeSnake(raw.replace(/\./g, "_")) : "Web", isWeb: true };
}

function mapInboxRow(c: InboxConversation): Row {
  const ch = channelLabel(c.channel);
  const name =
    (c.customer_name || "").trim() ||
    (c.customer_phone || "").trim() ||
    (c.customer_email || "").trim() ||
    "Visitor";
  const email = (c.customer_email || "").trim();
  const phone = (c.customer_phone || "").trim();
  const contactLine =
    email || phone || (name === "Visitor" ? "No contact on file" : "No email or phone on file");
  const sessionRef = formatSessionRef(c.session_id);
  return {
    id: c.id,
    name,
    contactLine,
    sessionRef,
    preview: (c.last_message_preview || c.summary || "No preview yet.").trim(),
    time: formatRelativeTime(c.last_message_at || c.updated_at || undefined) || "—",
    requiresAttention: Boolean(c.requires_attention),
    channel: ch.label,
    status: humanizeSnake((c.derived_status || "active").replace(/\./g, "_")),
    aiHandled: Boolean(c.ai_auto_reply_ready && c.ai_auto_reply_enabled),
  };
}

export function InboxPage() {
  const { session } = useAuth();
  const [raw, setRaw] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchFrontdeskInbox(session.accessToken, 150);
        if (!cancelled) {
          setRaw(list || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load inbox");
          setRaw([]);
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

  const conversations = useMemo(() => {
    const mapped = raw.map(mapInboxRow);
    const q = query.trim().toLowerCase();
    let list =
      filterMode === "attention" ? mapped.filter((c) => c.requiresAttention) : mapped;
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.contactLine.toLowerCase().includes(q) ||
          c.preview.toLowerCase().includes(q) ||
          c.sessionRef.toLowerCase().includes(q),
      );
    }
    return list;
  }, [raw, query, filterMode]);

  const attentionCount = useMemo(() => raw.filter((c) => c.requires_attention).length, [raw]);

  const getChannelIcon = (label: string) => {
    return label.toLowerCase().includes("sms") ? Smartphone : Globe;
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("resolved") || s.includes("closed") || s.includes("complete")) {
      return "bg-muted text-muted-foreground border-border";
    }
    if (s.includes("need") || s.includes("review") || s.includes("follow") || s.includes("attention")) {
      return "bg-orange-50 text-orange-800 border-orange-200";
    }
    return "bg-sky-50 text-sky-800 border-sky-200";
  };

  return (
    <div className="h-full bg-background flex flex-col xl:flex-row min-h-0">
      <div className="w-full xl:w-56 xl:flex-shrink-0 bg-white border-b xl:border-b-0 xl:border-r border-border">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <InboxIcon className="w-5 h-5 text-primary" />
            <h2 className={appSectionTitleClass}>Triage</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Choose a queue, then scan newest activity first.</p>
        </div>

        <div className="p-3 space-y-1">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "w-full px-3 py-2.5 rounded-lg font-semibold text-sm text-left flex items-center justify-between transition-colors",
              filterMode === "all" ? "bg-accent text-foreground" : "hover:bg-muted text-foreground",
            )}
          >
            All threads
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{raw.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("attention")}
            className={cn(
              "w-full px-3 py-2.5 rounded-lg font-semibold text-sm text-left flex items-center justify-between transition-colors",
              filterMode === "attention" ? "bg-accent text-foreground" : "hover:bg-muted text-foreground",
            )}
          >
            Needs attention
            {attentionCount > 0 ? (
              <span
                className={cn(
                  "text-xs font-bold tabular-nums",
                  filterMode === "attention" ? "text-primary" : "text-orange-700",
                )}
              >
                {attentionCount}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">0</span>
            )}
          </button>
        </div>

        <div className="p-3 border-t border-border">
          <p className="text-xs font-semibold text-foreground mb-1">Channels</p>
          <p className="text-xs text-muted-foreground leading-relaxed px-0.5">
            Each row shows channel and status. Use search to narrow by name, contact, or session suffix.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 xl:flex-row">
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="p-4 sm:p-6 border-b border-border bg-white">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h1 className={cn(appPageTitleCompactClass, "mb-1")}>Inbox</h1>
                <p className={appPageSubtitleClass}>
                  {filterMode === "attention"
                    ? `${attentionCount} flagged for staff · ${conversations.length} match filters`
                    : `${attentionCount} need attention · ${conversations.length} in view`}
                </p>
                {error && <p className="text-sm text-destructive mt-2">{error}</p>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:pt-1">
                <Filter className="w-4 h-4 shrink-0" />
                <span>
                  {filterMode === "attention" ? "Showing attention queue only" : "Showing full inbox"}
                </span>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, email, phone, preview, session…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white text-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-background">
            <div className="divide-y divide-border">
              {loading && <div className="p-6 text-sm text-muted-foreground">Loading conversations…</div>}
              {!loading && conversations.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">
                  {filterMode === "attention" && raw.length > 0
                    ? "No threads match attention filters and search."
                    : "No conversations match this view."}
                </div>
              )}
              {!loading &&
                conversations.map((conv) => {
                  const ChannelIcon = getChannelIcon(conv.channel);
                  return (
                    <Link
                      key={conv.id}
                      to={`/app/inbox/${conv.id}`}
                      className={cn(
                        "block bg-white hover:bg-slate-50/80 transition-colors border-l-4",
                        conv.requiresAttention ? "border-l-primary" : "border-l-transparent",
                      )}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div
                              className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center border",
                                conv.requiresAttention
                                  ? "bg-accent border-primary/25"
                                  : "bg-muted/60 border-border",
                              )}
                            >
                              <span
                                className={cn(
                                  "font-bold text-base",
                                  conv.requiresAttention ? "text-primary" : "text-muted-foreground",
                                )}
                              >
                                {conv.name.charAt(0)}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3
                                    className={cn(
                                      "font-bold text-base",
                                      conv.requiresAttention ? "text-foreground" : "text-foreground/90",
                                    )}
                                  >
                                    {conv.name}
                                  </h3>
                                  {conv.requiresAttention ? (
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded">
                                      Attention
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5 truncate">{conv.contactLine}</p>
                                <p className="text-xs text-muted-foreground/90 mt-1">
                                  Session <span className="font-mono text-foreground/80">{conv.sessionRef}</span>
                                </p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <div className="flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground">
                                  <Clock className="w-3.5 h-3.5" />
                                  {conv.time}
                                </div>
                              </div>
                            </div>

                            <p
                              className={cn(
                                "text-sm mt-3 line-clamp-2 leading-snug",
                                conv.requiresAttention ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {conv.preview}
                            </p>

                            <div className="flex items-center gap-2 flex-wrap mt-3">
                              <span
                                className={cn(
                                  "text-xs font-semibold px-2 py-1 rounded-md border",
                                  getStatusBadge(conv.status),
                                )}
                              >
                                {conv.status}
                              </span>
                              <div className="flex items-center gap-1 px-2 py-1 bg-white border border-border rounded-md">
                                <ChannelIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-foreground">{conv.channel}</span>
                              </div>
                              {conv.aiHandled ? (
                                <div className="flex items-center gap-1 px-2 py-1 bg-accent border border-primary/20 rounded-md">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-xs font-semibold text-primary">AI ready</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>

        <aside className="hidden xl:block w-72 flex-shrink-0 border-l border-border bg-white p-5 space-y-4">
          <h3 className={appSectionTitleClass}>Scan rhythm</h3>
          <ul className="text-sm text-muted-foreground space-y-3 leading-relaxed">
            <li>
              <span className="font-semibold text-foreground">1.</span> Clear{" "}
              <button
                type="button"
                onClick={() => setFilterMode("attention")}
                className="text-primary font-semibold hover:underline"
              >
                Needs attention
              </button>{" "}
              first — these are unresolved or escalated.
            </li>
            <li>
              <span className="font-semibold text-foreground">2.</span> Read the latest message preview, then open the thread for context.
            </li>
            <li>
              <span className="font-semibold text-foreground">3.</span> Channel and status badges show where the patient reached you and queue state.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
