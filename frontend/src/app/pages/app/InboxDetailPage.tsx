import { useParams, Link } from "react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Send, Globe, Brain, User, Smartphone } from "lucide-react";
import { ConfirmModal } from "@/app/components/Modal";
import { useAuth } from "@/lib/auth-context";
import {
  fetchConversationDetail,
  updateThreadControl,
  updateThreadWorkflow,
} from "@/lib/api/services";
import type { ConversationDetail } from "@/lib/api/types";
import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { formatSessionRef, humanizeSnake, formatThreadMessageBody } from "@/lib/display-text";
import { appPagePaddingClass, appSectionTitleClass } from "@/lib/page-layout";
import { cn } from "@/app/components/ui/utils";

export function InboxDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const load = useCallback(async () => {
    if (!id || !session?.accessToken) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConversationDetail(session.accessToken, id);
      setDetail(data);
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [id, session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const conv = detail?.conversation;
  const messages = detail?.messages ?? [];
  const lead = detail?.lead ?? null;

  const channelLabel = (raw: string | undefined) => {
    const c = (raw || "").toLowerCase();
    if (c.includes("sms")) {
      return { text: "SMS", Icon: Smartphone };
    }
    return { text: raw ? humanizeSnake(raw.replace(/\./g, "_")) : "Web chat", Icon: Globe };
  };

  const ch = channelLabel(conv?.channel);

  const onToggleTakeover = async () => {
    if (!id || !session?.accessToken || !conv) {
      return;
    }
    setBusy("takeover");
    setActionError(null);
    try {
      await updateThreadControl(session.accessToken, id, { manual_takeover: !conv.manual_takeover });
      await load();
      notifySuccess(conv.manual_takeover ? "Returned thread to AI" : "Manual takeover enabled");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not update thread control";
      setActionError(msg);
      notifyError(msg);
    } finally {
      setBusy(null);
    }
  };

  const onCloseThread = () => {
    if (!lead?.id) {
      const msg = "Link a lead to this thread before closing workflow from here, or update the lead on the Leads page.";
      setActionError(msg);
      notifyError(msg);
      return;
    }
    setShowCloseConfirm(true);
  };

  const confirmCloseThread = async () => {
    if (!id || !session?.accessToken) {
      return;
    }
    setBusy("close");
    setActionError(null);
    try {
      await updateThreadWorkflow(session.accessToken, id, { status: "closed" });
      await load();
      setShowCloseConfirm(false);
      notifySuccess("Thread closed");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not close thread";
      setActionError(msg);
      notifyError(msg);
    } finally {
      setBusy(null);
    }
  };

  if (loading && !detail) {
    return (
      <div className={appPagePaddingClass}>
        <p className="text-muted-foreground">Loading conversation…</p>
      </div>
    );
  }

  if (error || !conv) {
    return (
      <div className={appPagePaddingClass}>
        <Link to="/app/inbox" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to inbox
        </Link>
        <p className="text-destructive">{error || "Conversation not found."}</p>
      </div>
    );
  }

  const initial = (conv.customer_name || "?").charAt(0).toUpperCase();

  return (
    <div className="h-full min-h-0 flex flex-col bg-background">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="border-b border-border bg-white shrink-0">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <Link to="/app/inbox" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium shrink-0">
                <ArrowLeft className="w-4 h-4" />
                Back to inbox
              </Link>
              <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                <button
                  type="button"
                  onClick={() => void onToggleTakeover()}
                  disabled={busy !== null}
                  className="h-9 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-50 shadow-sm"
                >
                  {busy === "takeover" ? "Updating…" : conv.manual_takeover ? "Release to AI" : "Take over thread"}
                </button>
                <button
                  type="button"
                  onClick={onCloseThread}
                  disabled={busy !== null}
                  className="h-9 px-4 border border-destructive/40 text-destructive bg-white rounded-lg hover:bg-destructive/5 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {busy === "close" ? "Closing…" : "Close thread"}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-teal-700">{initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-foreground mb-1">{conv.customer_name || "Conversation"}</h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <ch.Icon className="w-3.5 h-3.5" />
                    <span>{ch.text}</span>
                  </div>
                  <span>•</span>
                  <span>{humanizeSnake((conv.derived_status || "active").replace(/\./g, "_"))}</span>
                  {lead?.id ? (
                    <>
                      <span>•</span>
                      <Link to={`/app/leads/${lead.id}`} className="text-primary font-medium hover:underline">
                        View request
                      </Link>
                    </>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  Session {formatSessionRef(conv.session_id)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {actionError ? (
          <div className="px-6 py-2 text-sm text-destructive bg-destructive/10 border-b border-destructive/20">{actionError}</div>
        ) : null}

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row min-w-0">
          <div className="flex-1 flex flex-col min-h-0 min-w-0 order-2 lg:order-1">
            <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
              {loading && <p className="text-sm text-muted-foreground">Refreshing…</p>}
              {messages.map((msg) => {
                const isUser = msg.role === "user" || msg.role === "patient";
                const isAssistant = msg.role === "assistant" || msg.role === "ai";
                const body = formatThreadMessageBody(msg.content);
                return (
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-lg ${isUser ? "" : "flex items-start gap-3"}`}>
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-1">
                          <Brain className="w-4 h-4 text-teal-600" />
                        </div>
                      )}
                      <div>
                        <div
                          className={cn(
                            "px-4 py-3 rounded-2xl",
                            isUser ? "bg-primary text-white" : "bg-white border border-border shadow-sm",
                          )}
                        >
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{body}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 px-1">
                          <p className={`text-xs ${isUser ? "text-slate-600" : "text-muted-foreground"}`}>
                            {formatDateTime(msg.created_at ?? undefined)}
                          </p>
                          {isAssistant && <span className="text-xs text-teal-600 font-medium">AI</span>}
                        </div>
                      </div>
                      {isUser && (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && !loading && (
                <div className="rounded-lg border border-dashed border-border bg-white px-4 py-6 text-center max-w-md mx-auto">
                  <p className="text-sm font-medium text-foreground">No messages in this thread yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The conversation may still be syncing, or the patient hasn&apos;t sent anything. Check back shortly or confirm the channel is
                    live in Settings.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-border bg-white p-4 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled
                  placeholder="Outbound replies are sent from front-desk tools or patient channels"
                  className="flex-1 px-4 py-3 border border-border rounded-xl bg-muted/50 text-muted-foreground"
                />
                <button
                  type="button"
                  disabled
                  aria-label="Send reply"
                  className="px-5 py-3 bg-primary text-white rounded-xl opacity-50 cursor-not-allowed flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <aside className="order-1 lg:order-2 w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-l border-border bg-white p-4 sm:p-5 space-y-5 lg:max-w-sm">
            <div>
              <h3 className={cn(appSectionTitleClass, "text-sm mb-3")}>Thread context</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Channel</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-foreground">
                    <ch.Icon className="w-3.5 h-3.5 shrink-0" />
                    {ch.text}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Queue status</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {humanizeSnake((conv.derived_status || "active").replace(/\./g, "_"))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attention</dt>
                  <dd className="mt-0.5">
                    {conv.requires_attention ? (
                      <span className="text-xs font-bold uppercase tracking-wide text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                        Flagged for staff
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not flagged</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Control</dt>
                  <dd className="mt-0.5 text-foreground">
                    {conv.manual_takeover ? "Staff manual takeover — AI suggestions paused for this thread." : "AI handling with staff escalation when needed."}
                  </dd>
                </div>
                {lead?.id ? (
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linked request</dt>
                    <dd className="mt-0.5">
                      <Link to={`/app/leads/${lead.id}`} className="text-primary font-semibold hover:underline">
                        Open lead · {humanizeSnake((lead.status || "").replace(/\./g, "_"))}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <div className="rounded-xl border border-border bg-slate-50/80 p-4 text-sm text-muted-foreground leading-relaxed">
              <p className={cn(appSectionTitleClass, "text-sm text-foreground mb-2")}>Next steps</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Use takeover when you need to own the tone; release when the assistant should resume.</li>
                <li>Close thread only when workflow is done — requires a linked lead for this control.</li>
                <li>Patient-visible replies use your existing channels, not this composer.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => busy !== "close" && setShowCloseConfirm(false)}
        onConfirm={() => void confirmCloseThread()}
        title="Close this thread?"
        description="This marks the inbox workflow closed. You can still open the linked lead from Leads if one exists."
        confirmLabel={busy === "close" ? "Closing…" : "Close thread"}
        variant="danger"
      />
    </div>
  );
}
