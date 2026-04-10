"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Phone,
  RefreshCw,
  Send,
  Shield,
} from "lucide-react";
import { api } from "@/lib/api";
import { summarizeBusinessHoursForChat } from "@/lib/chat-surface";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string | null;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

const SUGGESTIONS = [
  "Book an appointment",
  "Check hours",
  "Ask about insurance",
];

const STEP_LABELS = ["Reason", "Time", "Name", "Phone", "Email", "Confirm"];

function bookingStep(intent: string | null | undefined): number | null {
  const map: Record<string, number> = {
    booking_reason: 1,
    booking_slot_offer: 2,
    booking_slot_selection: 2,
    booking_datetime_fallback: 2,
    booking_datetime: 2,
    booking_name: 3,
    booking_phone: 4,
    booking_email: 5,
    booking_confirm: 6,
  };
  return intent ? (map[intent] ?? null) : null;
}

function digitsOnlyPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export default function ChatPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = use(params);
  const isDemo = slug === "demo";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#118579");
  const [clinicName, setClinicName] = useState("");
  const [assistantLabel, setAssistantLabel] = useState("Clinic Assistant");
  const [clinicIsLive, setClinicIsLive] = useState(true);
  const [clinicPhone, setClinicPhone] = useState("");
  const [hoursSummary, setHoursSummary] = useState<string | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.clinics
      .getBranding(slug)
      .then((b) => {
        if (b.primary_color) setBrandColor(b.primary_color);
        setClinicName(b.name || "");
        setAssistantLabel(b.assistant_name || b.name || "Clinic Assistant");
        setClinicIsLive(b.is_live !== false);
        setClinicPhone((b.phone || "").trim());
        setHoursSummary(summarizeBusinessHoursForChat(b.business_hours));
      })
      .catch(() => {
        // Branding is non-blocking for chat
      });
  }, [slug]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!slug?.trim() || bootstrapped) return;
      setSending(true);
      setBootstrapError(null);
      try {
        const response = await api.chat.send({
          clinic_slug: slug,
          session_id: sessionId,
          message: "hello",
        });
        setMessages([
          {
            id: `assistant_bootstrap_${Date.now()}`,
            role: "assistant",
            content: response.reply,
            intent: response.intent,
          },
        ]);
        setCurrentIntent(response.intent);
        setBootstrapped(true);
        if (isDemo) {
          void api.events.track({ event_type: "demo_opened", session_id: sessionId });
        }
      } catch {
        setBootstrapError("We couldn’t reach the assistant. Check your connection, then try again.");
      } finally {
        setSending(false);
      }
    };

    void bootstrap();
  }, [bootstrapped, isDemo, sessionId, slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, bootstrapError]);

  const sendMessage = async (text: string) => {
    if (!text || sending || !bootstrapped) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    if (isDemo) {
      void api.events.track({ event_type: "demo_message_sent", session_id: sessionId });
    }

    try {
      const response = await api.chat.send({
        clinic_slug: slug,
        session_id: sessionId,
        message: text,
      });

      const assistantMsg: Message = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: response.reply,
        intent: response.intent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentIntent(response.intent);

      if (response.lead_created && !leadCaptured) {
        setLeadCaptured(true);
      }
    } catch {
      const fallback = clinicPhone
        ? `We’re having trouble sending that right now. Please call the clinic at ${clinicPhone}.`
        : "We’re having trouble sending that right now. Please try again in a couple of minutes.";
      setMessages((prev) => [
        ...prev,
        { id: `error_${Date.now()}`, role: "assistant", content: fallback },
      ]);
    } finally {
      setSending(false);
    }
  };

  const retryBootstrap = () => {
    setBootstrapError(null);
    setMessages([]);
    setBootstrapped(false);
  };

  const step = bookingStep(currentIntent);
  const telHref = clinicPhone ? `tel:${digitsOnlyPhone(clinicPhone)}` : null;
  const headline = clinicName || "Clinic AI demo";
  const supportLine = clinicIsLive
    ? "Patient-safe assistant"
    : "Assistant not live yet";

  const progress = useMemo(() => {
    if (step === null) return 0;
    return Math.max(1, Math.min(STEP_LABELS.length, step));
  }, [step]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="app-btn app-btn-secondary">
            Back home
          </Link>
          {slug !== "demo" ? (
            <Link href="/register" className="app-btn app-btn-primary">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="panel-surface rounded-4xl px-6 py-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-app-border/70 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
              <Shield className="h-3.5 w-3.5" />
              {supportLine}
            </div>
            <h1 className="mt-5 text-[clamp(2.3rem,3vw,4rem)] font-bold tracking-[-0.055em] text-app-text">
              {assistantLabel}
            </h1>
            <p className="mt-3 text-sm leading-7 text-app-text-secondary">
              {clinicName && clinicName !== assistantLabel
                ? `${headline} · Front-desk assistant`
                : "Calm, guided front-desk assistance for patient questions and booking flow."}
            </p>

            <div className="mt-8 grid gap-4">
              <div className="rounded-[1.6rem] border border-app-border/70 bg-white/80 p-4">
                <p className="text-sm font-bold text-app-text">What this chat does well</p>
                <p className="mt-2 text-sm leading-7 text-app-text-muted">
                  It answers from configured clinic information, guides booking intake, and keeps the flow clear for patients without making the interface feel clinical or cold.
                </p>
              </div>
              {hoursSummary ? (
                <div className="rounded-[1.6rem] border border-app-border/70 bg-white/80 p-4">
                  <p className="text-sm font-bold text-app-text">Hours summary</p>
                  <p className="mt-2 text-sm leading-7 text-app-text-muted">{hoursSummary}</p>
                </div>
              ) : null}
              {telHref ? (
                <a href={telHref} className="rounded-[1.6rem] border border-app-border/70 bg-white/80 p-4 transition-colors hover:border-app-primary/20">
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-app-text">
                    <Phone className="h-4 w-4 text-app-primary" />
                    Call the clinic
                  </div>
                  <p className="mt-2 text-sm text-app-text-muted">{clinicPhone}</p>
                </a>
              ) : null}
            </div>
          </section>

          <section className="chat-stage-shell flex min-h-[42rem] flex-col overflow-hidden">
            <div className="border-b border-app-border/70 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-app-text">{headline}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-app-text-muted">
                    {clinicIsLive ? "Active assistant" : "Preview mode"}
                  </p>
                </div>
                {leadCaptured ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Request captured
                  </span>
                ) : null}
              </div>

              {step !== null && !leadCaptured ? (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-[0.18em] text-app-text-muted">
                    <span>Booking progress</span>
                    <span>{progress}/{STEP_LABELS.length}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-2">
                    {STEP_LABELS.map((label, index) => (
                      <div
                        key={label}
                        className={`h-2 rounded-full ${index < progress ? "bg-app-primary" : "bg-slate-200"}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {bootstrapError ? (
                <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <p>{bootstrapError}</p>
                  <button type="button" className="app-btn app-btn-secondary mt-4" onClick={retryBootstrap}>
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 text-sm leading-7 ${message.role === "assistant" ? "bg-app-surface-alt text-app-text" : "ml-auto bg-app-primary text-white"}`}
                >
                  {message.content}
                </div>
              ))}

              {bootstrapped && messages.length <= 1 && !sending ? (
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="rounded-full border border-app-border/70 bg-white/80 px-4 py-2 text-sm font-bold text-app-text-secondary transition-colors hover:text-app-text"
                      onClick={() => void sendMessage(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}

              {sending ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-app-border/70 bg-white/80 px-3 py-2 text-sm text-app-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assistant thinking...
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-app-border/70 px-5 py-4">
              <div className="flex gap-3">
                <input
                  className="app-field"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage(input.trim());
                    }
                  }}
                  placeholder={bootstrapped ? "Type your message..." : "Connecting to assistant..."}
                  disabled={sending || !bootstrapped}
                />
                <button
                  type="button"
                  className="app-btn app-btn-primary"
                  onClick={() => void sendMessage(input.trim())}
                  disabled={sending || !input.trim() || !bootstrapped}
                  style={{ backgroundColor: brandColor, borderColor: brandColor }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-app-text-muted">
                Patient-safe, calm, and clearly structured
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
