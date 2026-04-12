import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Globe, Smartphone, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchFrontdeskInbox } from "@/lib/api/services";
import type { InboxConversation } from "@/lib/api/types";
import { formatRelativeTime } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  subtitle: string;
  preview: string;
  time: string;
  unread: boolean;
  channel: string;
  status: string;
  aiHandled: boolean;
};

function channelLabel(raw: string): { label: string; isWeb: boolean } {
  const c = (raw || "").toLowerCase();
  if (c.includes("sms") || c === "sms") {
    return { label: "SMS", isWeb: false };
  }
  return { label: raw ? raw.replace(/_/g, " ") : "Web", isWeb: true };
}

function mapInboxRow(c: InboxConversation): Row {
  const ch = channelLabel(c.channel);
  const name =
    (c.customer_name || "").trim() ||
    (c.customer_phone || "").trim() ||
    (c.customer_email || "").trim() ||
    "Visitor";
  const subtitle =
    (c.customer_email || "").trim() ||
    (c.customer_phone || "").trim() ||
    c.session_id ||
    "—";
  return {
    id: c.id,
    name,
    subtitle,
    preview: (c.last_message_preview || c.summary || "No preview yet.").trim(),
    time: formatRelativeTime(c.last_message_at || c.updated_at || undefined) || "—",
    unread: Boolean(c.requires_attention),
    channel: ch.label,
    status: (c.derived_status || "active").replace(/_/g, " "),
    aiHandled: Boolean(c.ai_auto_reply_ready && c.ai_auto_reply_enabled),
  };
}

export function InboxPage() {
  const { session } = useAuth();
  const [raw, setRaw] = useState<InboxConversation[]>([]);
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
    if (!q) {
      return mapped;
    }
    return mapped.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q),
    );
  }, [raw, query]);

  const attentionCount = useMemo(() => raw.filter((c) => c.requires_attention).length, [raw]);

  const getChannelIcon = (label: string) => {
    return label.toLowerCase().includes("sms") ? Smartphone : Globe;
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("resolved") || s.includes("closed") || s.includes("complete")) {
      return "bg-muted text-muted-foreground border-border";
    }
    if (s.includes("need") || s.includes("review") || s.includes("follow")) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const unreadCount = conversations.filter((c) => c.unread).length;

  return (
    <div className="h-full bg-background flex">
      <div className="w-64 bg-white border-r border-border flex-shrink-0">
        <div className="p-6 border-b border-border">
          <h2 className="font-bold text-foreground">Filters</h2>
        </div>

        <div className="p-4 space-y-1">
          <button
            type="button"
            className="w-full px-3 py-2 bg-accent text-foreground rounded-lg font-semibold text-sm text-left flex items-center justify-between"
          >
            All Conversations
            <span className="text-xs text-muted-foreground">{raw.length}</span>
          </button>
          <button type="button" className="w-full px-3 py-2 hover:bg-muted text-foreground rounded-lg font-semibold text-sm text-left flex items-center justify-between">
            Needs attention
            {attentionCount > 0 ? <span className="text-xs text-primary">{attentionCount}</span> : null}
          </button>
        </div>

        <div className="p-4 border-t border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Channel</p>
          <p className="text-xs text-muted-foreground px-1">
            Use search to filter. Channel badges are shown per thread.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-6 border-b border-border bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Inbox</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount} need attention • {loading ? "…" : conversations.length} shown
              </p>
              {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </div>
            <button
              type="button"
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-background">
          <div className="divide-y divide-border">
            {loading && <div className="p-6 text-sm text-muted-foreground">Loading conversations…</div>}
            {!loading && conversations.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">No conversations match this view.</div>
            )}
            {!loading &&
              conversations.map((conv) => {
                const ChannelIcon = getChannelIcon(conv.channel);
                return (
                  <Link key={conv.id} to={`/app/inbox/${conv.id}`} className="block bg-white hover:bg-muted/50 transition-colors">
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${conv.unread ? "bg-accent" : "bg-muted"
                              }`}
                          >
                            <span className={`font-bold ${conv.unread ? "text-primary" : "text-muted-foreground"}`}>
                              {conv.name.charAt(0)}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-bold ${conv.unread ? "text-foreground" : "text-muted-foreground"}`}>
                                  {conv.name}
                                </h3>
                                {conv.unread && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{conv.subtitle}</p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {conv.time}
                              </div>
                            </div>
                          </div>

                          <p className={`text-sm mb-3 line-clamp-2 ${conv.unread ? "text-foreground" : "text-muted-foreground"}`}>
                            {conv.preview}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-1 rounded border capitalize ${getStatusBadge(conv.status)}`}>
                              {conv.status}
                            </span>
                            <div className="flex items-center gap-1 px-2 py-1 bg-muted border border-border rounded">
                              <ChannelIcon className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs font-semibold text-foreground">{conv.channel}</span>
                            </div>
                            {conv.aiHandled && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-accent border border-primary/20 rounded">
                                <CheckCircle2 className="w-3 h-3 text-primary" />
                                <span className="text-xs font-semibold text-primary">AI</span>
                              </div>
                            )}
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
    </div>
  );
}
