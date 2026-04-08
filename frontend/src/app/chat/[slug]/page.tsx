"use client";

import { useState, useRef, useEffect, use } from "react";
import {
  Send,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Clock,
  HelpCircle,
  Phone,
  Building2,
  Shield,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
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
  { label: "Book an appointment", icon: Calendar },
  { label: "Check hours", icon: Clock },
  { label: "Ask about insurance", icon: HelpCircle },
];

/** Map backend intent to a booking step number (1-6). null = not in booking flow. */
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

const STEP_LABELS = ["Reason", "Time", "Name", "Phone", "Email", "Confirm"];

function progressBarClass(index: number, step: number): string {
  if (index + 1 < step) return "bg-teal-600";
  if (index + 1 === step) return "bg-teal-500";
  return "bg-slate-200";
}

function buildInputPlaceholder(
  bootstrapped: boolean,
  leadCaptured: boolean,
  step: number | null
): string {
  if (bootstrapped === false) return "Connecting to assistant…";
  if (leadCaptured) return "Anything else we can help with?";
  if (step !== null) {
    return `Enter your ${STEP_LABELS[(step || 1) - 1]?.toLowerCase() || "response"}…`;
  }
  return "Type your message…";
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
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [brandColor, setBrandColor] = useState("#0d9488");
  const [clinicName, setClinicName] = useState("");
  const [assistantLabel, setAssistantLabel] = useState("Clinic Assistant");
  const [clinicIsLive, setClinicIsLive] = useState(true);
  const [clinicPhone, setClinicPhone] = useState("");
  const [hoursSummary, setHoursSummary] = useState<string | null>(null);
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (globalThis.window !== undefined) {
      const p = new URLSearchParams(globalThis.location.search);
      setIsEmbedded(p.get("embed") === "true");
    }
    setBrandingLoaded(false);
    api.clinics
      .getBranding(slug)
      .then((b) => {
        if (b.primary_color) setBrandColor(b.primary_color);
        setClinicName(b.name || "");
        setAssistantLabel(b.assistant_name || b.name || "Clinic Assistant");
        setClinicIsLive(b.is_live !== false);
        setClinicPhone((b.phone || "").trim());
        setHoursSummary(summarizeBusinessHoursForChat(b.business_hours));
        setBrandingLoaded(true);
      })
      .catch(() => {
        setBrandingLoaded(true);
      });
  }, [slug]);

  useEffect(() => {
    const bootstrap = async () => {
      if (bootstrapped) return;
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
        setShowSuggestions(true);
        if (isDemo) {
          api.events.track({ event_type: "demo_opened", session_id: sessionId });
        }
      } catch {
        setBootstrapError("We couldn’t reach the assistant. Check your connection, then try again.");
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    };
    bootstrap();
  }, [bootstrapped, isDemo, sessionId, slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, bootstrapError]);

  const sendMessage = async (text: string) => {
    if (!text || sending || !bootstrapped) return;

    setShowSuggestions(false);
    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    if (isDemo) {
      api.events.track({ event_type: "demo_message_sent", session_id: sessionId });
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
      const errorMsg: Message = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content:
          "We’re having trouble sending that right now. Please try again in a couple of minutes" +
          (clinicPhone ? `, or call the clinic at ${clinicPhone}.` : " — or call the clinic directly for urgent needs."),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = () => sendMessage(input.trim());

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const retryBootstrap = () => {
    setBootstrapError(null);
    setMessages([]);
    setBootstrapped(false);
  };

  const step = bookingStep(currentIntent);
  const inputDisabled = sending || bootstrapped === false;
  const sendDisabled = sending || !input.trim() || bootstrapped === false;
  const inputPlaceholder = buildInputPlaceholder(bootstrapped, leadCaptured, step);

  const showClinicUnderAssistant =
    brandingLoaded && clinicName && clinicName !== assistantLabel;
  const headerSubtitle = !clinicIsLive
    ? "Assistant not live — limited responses"
    : showClinicUnderAssistant
      ? `${clinicName} · Front desk`
      : "Front desk assistant";

  const statusLabel = !clinicIsLive ? "Unavailable" : "Active";
  const telHref = clinicPhone ? `tel:${digitsOnlyPhone(clinicPhone)}` : null;

  return (
    <div
      className={`brand-scope ${isEmbedded ? "h-dvh bg-transparent flex flex-col" : "min-h-screen bg-slate-100/90 flex flex-col items-center justify-center p-3 sm:p-4"}`}
    >
      {isDemo && !isEmbedded && (
        <div className="w-full max-w-md mb-3 sm:mb-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
              ← Back to Clinic AI
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm text-center">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Building2 className="w-4 h-4 text-teal-600 shrink-0" aria-hidden />
              Sample clinic — Bright Smile Dental
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Uses Clinic AI&apos;s seeded demo workspace — same chat flow your patients get after you configure settings
              and go live with your own clinic slug, not your private dashboard data.
            </p>
          </div>
        </div>
      )}

      <div
        className={`w-full flex flex-col bg-white overflow-hidden ${isEmbedded ? "h-full min-h-0" : "max-w-md max-h-[min(44rem,calc(100dvh-1.5rem))] min-h-[20rem] rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-900/5"}`}
      >
        <div className="brand-header px-4 sm:px-5 pt-4 pb-3 flex items-start gap-3 border-b border-white/10">
          <div
            className="w-11 h-11 rounded-2xl bg-white/18 flex items-center justify-center text-base font-bold text-white select-none shrink-0 shadow-inner"
            aria-hidden
          >
            {(clinicName?.[0] || assistantLabel?.[0] || "C").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm sm:text-base leading-snug truncate" id="chat-assistant-title">
              {assistantLabel}
            </p>
            <p className="text-white/80 text-xs mt-0.5 leading-relaxed">{headerSubtitle}</p>
            <p className="text-white/65 text-[11px] mt-1 leading-relaxed">
              {clinicIsLive
                ? "Helps with scheduling questions your clinic configured. Staff may follow up."
                : "This workspace is not live yet — the clinic may not monitor messages."}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className={`flex items-center gap-1.5 rounded-full bg-black/10 px-2 py-0.5`}>
              <span
                className={`w-1.5 h-1.5 rounded-full ${clinicIsLive ? "bg-emerald-300" : "bg-slate-300"}`}
                aria-hidden
              />
              <span className="text-white/90 text-[11px] font-medium">{statusLabel}</span>
            </span>
          </div>
        </div>

        {!isDemo && !clinicIsLive && brandingLoaded ? (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-900 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" aria-hidden />
            <p>
              This clinic has not finished going live. You can still type below, but answers may be incomplete —
              contact them directly if you need care today.
            </p>
          </div>
        ) : null}

        {(telHref || hoursSummary) && clinicIsLive ? (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-600 space-y-1">
            {hoursSummary ? (
              <p className="flex gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" aria-hidden />
                <span>
                  <span className="font-semibold text-slate-700">Hours: </span>
                  {hoursSummary}
                </span>
              </p>
            ) : null}
            {telHref ? (
              <p className="flex gap-1.5">
                <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" aria-hidden />
                <span>
                  Prefer to call?{" "}
                  <a href={telHref} className="font-semibold text-teal-700 hover:underline">
                    {clinicPhone}
                  </a>
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {step !== null && !leadCaptured ? (
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">
              Booking {step}/6
            </span>
            <div className="flex-1 flex gap-1" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={6}>
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className={`h-1 w-full rounded-full transition-colors ${progressBarClass(i, step)}`} title={label} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-5 py-4 space-y-4"
          aria-labelledby="chat-assistant-title"
        >
          {bootstrapError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">Assistant did not respond yet</p>
              <p className="mt-1 text-amber-900/90 text-xs leading-relaxed">{bootstrapError}</p>
              <button
                type="button"
                onClick={retryBootstrap}
                className="mt-3 inline-flex items-center gap-1.5 min-h-9 rounded-lg bg-white border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                Try again
              </button>
            </div>
          )}

          {bootstrapped && messages.length > 0 && !bootstrapError ? (
            <p className="text-[11px] text-slate-400 text-center uppercase tracking-wider">Messages</p>
          ) : null}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] text-[14px] leading-relaxed ${msg.role === "user"
                  ? "brand-user-message rounded-2xl rounded-br-md px-4 py-2.5 text-white shadow-sm"
                  : "rounded-2xl rounded-bl-md px-4 py-3 bg-slate-50 text-slate-800 border border-slate-100/80 shadow-sm"
                  }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {showSuggestions && bootstrapped && !sending && !bootstrapError ? (
            <div className="pt-1">
              <p className="text-[11px] font-medium text-slate-500 mb-2">Suggested questions</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => sendMessage(s.label)}
                    className="brand-suggestion inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-full border transition-colors hover:shadow-sm min-h-10"
                  >
                    <s.icon className="w-3.5 h-3.5 shrink-0 opacity-90" aria-hidden />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!isDemo && leadCaptured ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0" aria-hidden>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Request received</p>
                  <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                    {clinicName ? `${clinicName} has` : "The clinic has"} your details. Someone from the team will follow
                    up to confirm — this assistant does not replace medical advice or emergencies.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isDemo && leadCaptured ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0" aria-hidden>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Demo: request captured</p>
                  <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                    In your clinic, this would sync to the dashboard for staff to review and call the patient back.
                  </p>
                  <Link
                    href="/register"
                    onClick={() =>
                      api.events.track({
                        event_type: "demo_cta_clicked",
                        session_id: sessionId,
                        metadata: { cta: "in_chat_register" },
                      })
                    }
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:underline"
                  >
                    Get this for your clinic <ArrowRight className="w-3 h-3" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="brand-spinner w-4 h-4 animate-spin" aria-hidden />
                  <span className="text-xs text-slate-500">Assistant is replying…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-100 px-3 sm:px-4 py-3 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <label htmlFor="patient-chat-input" className="sr-only">
              Message to assistant
            </label>
            <input
              id="patient-chat-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              placeholder={inputPlaceholder}
              disabled={inputDisabled}
              autoComplete="off"
              className="flex-1 min-w-0 px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 placeholder:text-slate-400 disabled:opacity-45 disabled:cursor-not-allowed transition-all"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sendDisabled}
              aria-label="Send message"
              className={`w-11 h-11 shrink-0 rounded-xl text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${sendDisabled ? "bg-slate-300" : "brand-send-button"
                }`}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-4 h-4" aria-hidden />}
            </button>
          </div>
          <div className="mt-2.5 flex flex-col items-center gap-1 text-[11px] text-slate-500 text-center px-1">
            <p>
              <span className="font-medium text-slate-600">Clinic assistant</span>
              <span className="text-slate-300 mx-1">·</span>
              Not for medical diagnosis or emergencies
            </p>
            {telHref ? (
              <p>
                Urgent? Call{" "}
                <a href={telHref} className="font-medium text-teal-700 hover:underline">
                  {clinicPhone}
                </a>
                .
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        .brand-header {
          background-color: ${brandColor};
        }
        .brand-user-message {
          background-color: ${brandColor};
        }
        .brand-suggestion {
          color: ${brandColor};
          border-color: ${brandColor}44;
          background-color: ${brandColor}0f;
        }
        .brand-spinner {
          color: ${brandColor};
        }
        .brand-send-button {
          background-color: ${brandColor};
        }
        .brand-send-button:hover {
          filter: brightness(0.92);
        }
      `}</style>

      {isDemo && !isEmbedded && (
        <div className="w-full max-w-md mt-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 text-center">Want this for your clinic?</h3>
          <p className="text-sm text-slate-500 text-center mt-1.5 leading-relaxed">
            Same calm patient experience, wired to your services, hours, and dashboard — without rebuilding your site.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch gap-3 mt-4">
            <Link
              href="/register"
              onClick={() =>
                api.events.track({
                  event_type: "demo_cta_clicked",
                  session_id: sessionId,
                  metadata: { cta: "start_free_setup" },
                })
              }
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors shadow-sm text-center"
            >
              Start free setup
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href="/contact"
              onClick={() =>
                api.events.track({
                  event_type: "demo_cta_clicked",
                  session_id: sessionId,
                  metadata: { cta: "book_demo" },
                })
              }
              className="flex-1 flex items-center justify-center px-5 py-3 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-center"
            >
              Talk to us
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 text-xs text-slate-400">
            <span>14-day trial</span>
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <span>No card to start</span>
          </div>
        </div>
      )}
    </div>
  );
}
