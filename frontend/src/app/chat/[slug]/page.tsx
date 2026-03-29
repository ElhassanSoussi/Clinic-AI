"use client";

import { useState, useRef, useEffect, use } from "react";
import { Send, Loader2, ArrowRight, Sparkles, CheckCircle2, Calendar, Clock, HelpCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

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
    api.clinics.getBranding(slug).then((b) => {
      if (b.primary_color) setBrandColor(b.primary_color);
      setClinicName(b.name || "");
      setAssistantLabel(b.assistant_name || b.name || "Clinic Assistant");
      setClinicIsLive(b.is_live !== false);
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    const bootstrap = async () => {
      if (bootstrapped) return;
      setSending(true);
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
        setBootstrapError(null);
        setBootstrapped(true);
        setShowSuggestions(true);
        if (isDemo) {
          api.events.track({ event_type: "demo_opened", session_id: sessionId });
        }
      } catch {
        setBootstrapError("Unable to load the assistant right now. Please try again shortly.");
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    };
    bootstrap();
  }, [bootstrapped, isDemo, sessionId, slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          "I apologize, but I\u2019m having trouble connecting right now. Please try again in a moment, or call the clinic directly for immediate assistance.",
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

  const step = bookingStep(currentIntent);

  return (
    <div className={isEmbedded ? "h-dvh bg-transparent flex flex-col" : "min-h-screen bg-slate-50 flex items-center justify-center p-4"}>
      {/* Demo banner above chat */}
      {isDemo && !isEmbedded && (
        <div className="w-full max-w-lg mb-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              &larr; Back to Clinic AI
            </Link>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 text-sm font-medium border border-teal-200">
              <Sparkles className="w-4 h-4" />
              Live Demo — Bright Smile Dental
            </div>
            <p className="text-sm text-slate-500 mt-2">
              This is a working AI assistant. Try booking an appointment or asking a question.
            </p>
          </div>
        </div>
      )}

      <div className={`w-full flex flex-col bg-white overflow-hidden ${isEmbedded ? "h-full" : "max-w-lg h-175 rounded-2xl border border-slate-200 shadow-xl"}`}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundColor: brandColor }}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold text-white select-none">
            {(clinicName?.[0] || assistantLabel?.[0] || "C").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-semibold text-sm truncate">
              {assistantLabel}
            </h1>
            <p className="text-white/70 text-xs">
              Front Desk &middot; Available 24/7
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${clinicIsLive ? "bg-emerald-400" : "bg-slate-400"}`} />
            <span className="text-white/60 text-xs">{clinicIsLive ? "Online" : "Offline"}</span>
          </div>
        </div>

        {/* Booking progress indicator */}
        {step !== null && !leadCaptured && (
          <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide shrink-0">
              Step {step} of 6
            </span>
            <div className="flex-1 flex gap-1">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`h-1 w-full rounded-full transition-colors ${
                      i + 1 < step ? "bg-teal-500" : i + 1 === step ? "bg-teal-400" : "bg-slate-200"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {bootstrapError && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed bg-rose-50 text-rose-700 border border-rose-200">
                <p>{bootstrapError}</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] text-[13.5px] leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-sm px-4 py-2.5 text-white"
                    : "rounded-2xl rounded-bl-sm px-4 py-3 bg-slate-50 text-slate-800 border border-slate-100"
                }`}
                style={msg.role === "user" ? { backgroundColor: brandColor } : undefined}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Suggestion chips */}
          {showSuggestions && !sending && (
            <div className="flex flex-wrap gap-2 pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.label)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium rounded-full border transition-colors hover:shadow-sm"
                  style={{
                    color: brandColor,
                    borderColor: `${brandColor}33`,
                    backgroundColor: `${brandColor}0a`,
                  }}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Lead captured — patient-facing success */}
          {!isDemo && leadCaptured && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-1">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Appointment request received
                  </p>
                  <p className="text-xs text-emerald-600 mt-1 leading-relaxed">
                    {clinicName ? `${clinicName} has` : "The clinic has"} your details and will reach out shortly to confirm your appointment. No further action is needed on your end.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lead captured — demo CTA */}
          {isDemo && leadCaptured && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-1">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Appointment request captured
                  </p>
                  <p className="text-xs text-emerald-600 mt-1 leading-relaxed">
                    The patient&apos;s name, phone, reason, and preferred time were saved automatically. In your clinic, this appears in your dashboard instantly — ready to review and follow up.
                  </p>
                  <Link
                    href="/register"
                    onClick={() => api.events.track({ event_type: "demo_cta_clicked", session_id: sessionId, metadata: { cta: "in_chat_register" } })}
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                  >
                    Get this for your clinic <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: brandColor }} />
                  <span className="text-xs text-slate-400">Typing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 px-4 py-3 bg-white">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              placeholder={
                !bootstrapped
                  ? "Connecting..."
                  : leadCaptured
                    ? "Need anything else?"
                    : step !== null
                      ? `Enter your ${STEP_LABELS[(step || 1) - 1]?.toLowerCase() || "response"}...`
                      : "Type a message..."
              }
              disabled={sending || !bootstrapped}
              className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim() || !bootstrapped}
              aria-label="Send message"
              className="w-10 h-10 rounded-full text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: sending || !input.trim() || !bootstrapped ? "#94a3b8" : brandColor }}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-300 mt-2 select-none">
            Intake assistant &middot; Does not provide medical advice
          </p>
        </div>
      </div>

      {/* Demo CTA below chat */}
      {isDemo && !isEmbedded && (
        <div className="w-full max-w-lg mt-4 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 text-center">
            Want this for your clinic?
          </h3>
          <p className="text-sm text-slate-500 text-center mt-1.5">
            Set up your own AI receptionist in minutes. Capture every patient inquiry, 24/7.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
            <Link
              href="/register"
              onClick={() => api.events.track({ event_type: "demo_cta_clicked", session_id: sessionId, metadata: { cta: "start_free_setup" } })}
              className="flex-1 w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-all shadow-sm"
            >
              Start Free Setup
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              onClick={() => api.events.track({ event_type: "demo_cta_clicked", session_id: sessionId, metadata: { cta: "book_demo" } })}
              className="flex-1 w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
            >
              Book a Demo
            </Link>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400">
            <span>Free 14-day trial</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>No credit card</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>5 min setup</span>
          </div>
        </div>
      )}
    </div>
  );
}
