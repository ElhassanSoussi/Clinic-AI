import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Send, Shield, Clock, CheckCircle, Bot, User } from "lucide-react";
import { ApiError, apiFetch, apiJson, parseApiErrorMessage } from "@/lib/api";

type Branding = {
  name: string;
  assistant_name?: string | null;
  primary_color?: string | null;
  is_live?: boolean | null;
};

type ChatMessage = {
  id: string;
  sender: "assistant" | "patient";
  text: string;
  time: string;
  status?: "sending" | "sent" | "delivered" | "failed";
};

function sessionStorageKey(slug: string) {
  return `clinic_ai_chat_session_${slug}`;
}

/** Matches typical clinic slugs; avoids junk in the query string before hitting the API. */
const CHAT_SLUG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;

function getOrCreateSessionId(slug: string): string {
  const key = sessionStorageKey(slug);
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function PatientChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const slugParam = (searchParams.get("slug") || "").trim();
  const [slugInput, setSlugInput] = useState(slugParam);
  const [slugFieldError, setSlugFieldError] = useState<string | null>(null);

  const [branding, setBranding] = useState<Branding | null>(null);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const activeSlug = slugParam;

  useEffect(() => {
    setSlugInput(slugParam);
  }, [slugParam]);

  useEffect(() => {
    if (!activeSlug) {
      setBranding(null);
      setBrandingError(null);
      setMessages([]);
      sessionIdRef.current = null;
      return;
    }

    if (!CHAT_SLUG_PATTERN.test(activeSlug)) {
      setBranding(null);
      setMessages([]);
      sessionIdRef.current = null;
      setBrandingLoading(false);
      setBrandingError(
        "Invalid slug in URL. Use letters, numbers, hyphens, or underscores — same value as in Settings → public chat link.",
      );
      return;
    }

    sessionIdRef.current = getOrCreateSessionId(activeSlug);
    let cancelled = false;
    setBrandingLoading(true);
    setBrandingError(null);

    (async () => {
      try {
        const data = await apiJson<Branding>(`/clinics/${encodeURIComponent(activeSlug)}/branding`);
        if (cancelled) {
          return;
        }
        setBranding(data);
        const assistant = data.assistant_name?.trim() || "your AI assistant";
        const intro = `Hello! I'm ${assistant} at ${data.name}. How may I help you today?`;
        setMessages([
          {
            id: "welcome",
            sender: "assistant",
            text: intro,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "delivered",
          },
        ]);
      } catch (e) {
        if (cancelled) {
          return;
        }
        const msg =
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not load clinic.";
        setBrandingError(msg);
        setBranding(null);
        setMessages([]);
      } finally {
        if (!cancelled) {
          setBrandingLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSlug]);

  const headerColor = useMemo(() => {
    const hex = branding?.primary_color?.trim();
    if (hex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
      return hex;
    }
    return undefined;
  }, [branding]);

  const chatHeaderRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = chatHeaderRef.current;
    if (!el) {
      return;
    }
    if (headerColor) {
      el.style.backgroundColor = headerColor;
    } else {
      el.style.removeProperty("background-color");
    }
  }, [headerColor]);

  const applySlug = () => {
    const s = slugInput.trim();
    if (!s) {
      return;
    }
    if (!CHAT_SLUG_PATTERN.test(s)) {
      setSlugFieldError(
        "Use letters, numbers, hyphens, or underscores only (match the slug from your dashboard).",
      );
      return;
    }
    setSlugFieldError(null);
    setSearchParams({ slug: s });
  };

  const sendPatientMessage = useCallback(
    async (patientText: string, patientId: string) => {
      if (!patientText.trim() || !activeSlug) {
        return;
      }
      const sid = sessionIdRef.current || getOrCreateSessionId(activeSlug);
      sessionIdRef.current = sid;

      setIsTyping(true);
      setChatError(null);

      try {
        const res = await apiFetch("/chat", {
          method: "POST",
          body: JSON.stringify({
            clinic_slug: activeSlug,
            session_id: sid,
            message: patientText,
          }),
        });
        if (!res.ok) {
          throw new Error(await parseApiErrorMessage(res));
        }
        const data = (await res.json()) as { reply: string; session_id: string };
        setMessages((prev) =>
          prev.map((m) => (m.id === patientId ? { ...m, status: "delivered" as const } : m)),
        );
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "assistant",
            text: data.reply,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "delivered",
          },
        ]);
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Message failed to send.";
        setChatError(msg);
        setMessages((prev) =>
          prev.map((m) => (m.id === patientId ? { ...m, status: "failed" as const } : m)),
        );
      } finally {
        setIsTyping(false);
      }
    },
    [activeSlug],
  );

  const handleSend = useCallback(() => {
    const patientText = message.trim();
    if (!patientText || !activeSlug) {
      return;
    }
    const patientId = crypto.randomUUID();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      {
        id: patientId,
        sender: "patient",
        text: patientText,
        time,
        status: "sending",
      },
    ]);
    setMessage("");
    void sendPatientMessage(patientText, patientId);
  }, [activeSlug, message, sendPatientMessage]);

  const retryPatientMessage = useCallback(
    (patientId: string, patientText: string) => {
      setChatError(null);
      setMessages((prev) =>
        prev.map((m) => (m.id === patientId ? { ...m, status: "sending" as const } : m)),
      );
      void sendPatientMessage(patientText, patientId);
    },
    [sendPatientMessage],
  );

  if (!activeSlug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-4 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Patient chat</h1>
          <p className="text-muted-foreground text-sm">
            Enter your clinic&apos;s public slug (same as in your Clinic AI dashboard). Example URL:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">/chat?slug=my-clinic</code>
          </p>
          {slugFieldError ? (
            <p className="text-sm text-destructive" role="alert">
              {slugFieldError}
            </p>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={slugInput}
              onChange={(e) => {
                setSlugFieldError(null);
                setSlugInput(e.target.value);
              }}
              className="flex-1 min-w-0 px-4 py-2 border border-border rounded-lg"
              placeholder="clinic-slug"
            />
            <button
              type="button"
              onClick={applySlug}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg shrink-0"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (brandingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading clinic…</p>
      </div>
    );
  }

  if (brandingError || !branding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-destructive">{brandingError || "Clinic not found."}</p>
          <button
            type="button"
            className="text-primary underline"
            onClick={() => setSearchParams({})}
          >
            Try another slug
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-3xl min-w-0">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-border">
          <div ref={chatHeaderRef} className={`p-4 sm:p-6 ${headerColor ? "" : "bg-primary"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-white truncate">{branding.name}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    <p className="text-white/90 text-sm">
                      {branding.assistant_name || "AI Assistant"} • {branding.is_live ? "Online" : "Away"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                <div className="px-3 py-1 bg-white/20 rounded-full flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-white" />
                  <span className="text-xs text-white font-medium">Secure</span>
                </div>
              </div>
            </div>
          </div>

          {!branding.is_live ? (
            <div className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-amber-50 text-amber-900 border-b border-amber-200">
              This clinic hasn&apos;t turned on the assistant yet. You may not get an instant reply until they go live in their dashboard.
            </div>
          ) : null}

          <div className="bg-muted/50 border-b border-border px-4 sm:px-6 py-3">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground text-center">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 shrink-0" />
                <span>Messages go to this clinic&apos;s assistant — not a general chatbot.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 shrink-0" />
                <span>For emergencies or urgent care, call the clinic or local services — don&apos;t rely on chat.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Reply speed depends on clinic hours and how busy staff are.</span>
              </div>
            </div>
          </div>

          {chatError && (
            <div className="px-6 py-2 text-sm text-destructive bg-destructive/10 border-b border-destructive/20">
              {chatError}
            </div>
          )}

          <div className="h-[min(28rem,65dvh)] sm:h-[500px] overflow-y-auto p-4 sm:p-6 space-y-4 bg-muted/20 min-h-[240px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.sender === "patient" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-md px-4 py-3 rounded-2xl ${msg.sender === "patient"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-white border border-border text-foreground rounded-bl-sm"
                    }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <p
                      className={`text-xs ${msg.sender === "patient" ? "text-white/70" : "text-muted-foreground"
                        }`}
                    >
                      {msg.time}
                    </p>
                    {msg.sender === "patient" && msg.status && (
                      <div className="flex items-center gap-1">
                        {msg.status === "sending" && (
                          <div className="w-1 h-1 rounded-full bg-white/50"></div>
                        )}
                        {msg.status === "sent" && (
                          <CheckCircle className="w-3 h-3 text-white/70" />
                        )}
                        {msg.status === "delivered" && (
                          <div className="flex">
                            <CheckCircle className="w-3 h-3 text-white/70 -mr-1.5" />
                            <CheckCircle className="w-3 h-3 text-white/70" />
                          </div>
                        )}
                        {msg.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => retryPatientMessage(msg.id, msg.text)}
                            className="text-[10px] uppercase tracking-wide font-semibold text-white/90 underline underline-offset-2"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {msg.sender === "patient" && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-white border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-3 bg-muted/50 border-t border-border">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setMessage("I'd like to schedule an appointment")}
                className="px-3 py-1.5 text-xs bg-white border border-border rounded-full hover:bg-muted transition-colors whitespace-nowrap"
              >
                📅 Book Appointment
              </button>
              <button
                type="button"
                onClick={() => setMessage("What are your office hours?")}
                className="px-3 py-1.5 text-xs bg-white border border-border rounded-full hover:bg-muted transition-colors whitespace-nowrap"
              >
                🕐 Office Hours
              </button>
              <button
                type="button"
                onClick={() => setMessage("Do you accept my insurance?")}
                className="px-3 py-1.5 text-xs bg-white border border-border rounded-full hover:bg-muted transition-colors whitespace-nowrap"
              >
                💳 Insurance
              </button>
              <button
                type="button"
                onClick={() => setMessage("Where is the clinic located?")}
                className="px-3 py-1.5 text-xs bg-white border border-border rounded-full hover:bg-muted transition-colors whitespace-nowrap"
              >
                📍 Location
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Type your message..."
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!message.trim() || isTyping}
                aria-label="Send message"
                className="px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
              <Shield className="w-3 h-3 text-primary" />
              <span>Your messages are encrypted and HIPAA-compliant</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>Powered by Clinic AI • For emergencies, please call 911 or visit your nearest emergency room</p>
        </div>
      </div>
    </div>
  );
}
