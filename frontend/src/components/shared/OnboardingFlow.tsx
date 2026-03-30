"use client";

import { useState, useRef, useEffect } from "react";
import {
  Building2,
  Stethoscope,
  Clock,
  BellRing,
  MessageSquare,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Plus,
  Trash2,
  Bot,
  Send,
  CheckCircle2,
  Mail,
  Sheet,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Clinic } from "@/types";

// ── Step definitions ──────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Clinic Info", icon: Building2 },
  { id: 2, title: "Services", icon: Stethoscope },
  { id: 3, title: "Hours", icon: Clock },
  { id: 4, title: "Notifications", icon: BellRing },
  { id: 5, title: "Preview", icon: MessageSquare },
  { id: 6, title: "Launch", icon: Rocket },
];

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DEFAULT_HOURS: Record<string, string> = {
  monday: "9:00 AM - 5:00 PM",
  tuesday: "9:00 AM - 5:00 PM",
  wednesday: "9:00 AM - 5:00 PM",
  thursday: "9:00 AM - 5:00 PM",
  friday: "9:00 AM - 5:00 PM",
  saturday: "Closed",
  sunday: "Closed",
};

const SUGGESTION_CHIPS = [
  "I\u2019d like to book an appointment",
  "What are your hours?",
  "Do you accept walk-ins?",
];

// ── Component ─────────────────────────────────────────────────────
interface OnboardingFlowProps {
  clinic: Clinic;
  onComplete: () => void;
}

function serviceSummaryDetail(clinic: Clinic): string {
  if (Array.isArray(clinic.services) === false || clinic.services.length === 0) {
    return "None added";
  }

  const suffix = clinic.services.length === 1 ? "" : "s";
  return `${clinic.services.length} service${suffix} configured`;
}

function stepButtonClass(isDone: boolean, isCurrent: boolean): string {
  if (isDone) return "bg-teal-600 text-white shadow-sm";
  if (isCurrent) return "bg-teal-50 text-teal-700 ring-2 ring-teal-600 ring-offset-1";
  return "bg-slate-100 text-slate-400";
}

function stepLabelClass(isDone: boolean, isCurrent: boolean): string {
  if (isCurrent) return "text-teal-700";
  if (isDone) return "text-slate-600";
  return "text-slate-400";
}

function nextButtonLabel(step: number, saving: boolean, saved: boolean): string {
  if (saving) return "Saving…";
  if (saved) return "Saved";
  if (step === 5) return "Looks good, continue";
  if (step === 4) return "Continue";
  return "Save & continue";
}

type OnboardingFlowFormState = {
  name: string;
  phone: string;
  email: string;
  services: string[];
  hours: Record<string, string>;
  notificationsEnabled: boolean;
  notificationEmail: string;
};

type SummaryItem = {
  label: string;
  detail: string;
  done: boolean;
};

function buildStepUpdates(step: number, state: OnboardingFlowFormState): Partial<Clinic> {
  if (step === 1) return { name: state.name, phone: state.phone, email: state.email };
  if (step === 2) return { services: state.services };
  if (step === 3) return { business_hours: state.hours };
  if (step === 4) {
    return {
      notifications_enabled: state.notificationsEnabled,
      notification_email: state.notificationEmail,
    };
  }

  return {};
}

function validateStepState(step: number, state: Pick<OnboardingFlowFormState, "name" | "phone" | "email" | "services">): Record<string, string> {
  const errs: Record<string, string> = {};

  if (step === 1) {
    if (!state.name.trim()) errs.name = "Clinic name is required";
    if (!state.phone.trim()) errs.phone = "Phone number is required";
    if (!state.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) errs.email = "Enter a valid email";
  }

  if (step === 2 && state.services.length === 0) {
    errs.services = "Add at least one service";
  }

  return errs;
}

function createSummaryItems(clinic: Clinic): SummaryItem[] {
  return [
    {
      label: "Clinic info",
      detail: clinic.name || "Not set",
      done: !!(clinic.name && clinic.phone && clinic.email),
    },
    {
      label: "Services",
      detail: serviceSummaryDetail(clinic),
      done: Array.isArray(clinic.services) && clinic.services.length > 0,
    },
    {
      label: "Business hours",
      detail: "Schedule set",
      done:
        typeof clinic.business_hours === "object" &&
        Object.keys(clinic.business_hours).length > 0,
    },
    {
      label: "Email notifications",
      detail: clinic.notifications_enabled ? "Enabled" : "Skipped",
      done: !!clinic.notifications_enabled,
    },
    {
      label: "Google Sheets",
      detail: clinic.google_sheet_id ? "Connected" : "Not connected",
      done: !!clinic.google_sheet_id,
    },
  ];
}

function canJumpToStep(targetStep: number, currentStep: number): boolean {
  return targetStep < currentStep;
}

function stepContainerClass(targetStep: number, currentStep: number): string {
  return targetStep > currentStep
    ? "opacity-25 cursor-not-allowed"
    : "cursor-pointer";
}

function shouldPersistStep(step: number): boolean {
  return step <= 4;
}

function OnboardingFlowProgress({
  step,
  onSelectStep,
}: Readonly<{
  step: number;
  onSelectStep: (step: number) => void;
}>) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((s) => {
          const isDone = step > s.id;
          const isCurrent = step === s.id;
          const StepIcon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (canJumpToStep(s.id, step)) onSelectStep(s.id);
              }}
              disabled={s.id > step}
              className={`flex flex-col items-center gap-1.5 transition-opacity ${stepContainerClass(s.id, step)}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${stepButtonClass(isDone, isCurrent)}`}>
                {isDone ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${stepLabelClass(isDone, isCurrent)}`}>
                {s.title}
              </span>
            </button>
          );
        })}
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div className="onboarding-flow-progress bg-teal-600 h-1.5 rounded-full transition-all duration-500 ease-out" />
      </div>
    </div>
  );
}

function OnboardingFlowNavigation({
  step,
  saving,
  saved,
  nextButtonIcon,
  nextLabel,
  showNextChevron,
  onBack,
  onNext,
}: Readonly<{
  step: number;
  saving: boolean;
  saved: boolean;
  nextButtonIcon: React.ReactNode;
  nextLabel: string;
  showNextChevron: boolean;
  onBack: () => void;
  onNext: () => void;
}>) {
  if (step === 6) {
    return (
      <div className="px-6 sm:px-8 py-4 border-t border-slate-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between">
      {step > 1 ? (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={onNext}
        disabled={saving}
        className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all ${
          saved
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-teal-600 hover:bg-teal-700"
        } disabled:opacity-50`}
      >
        {nextButtonIcon}
        {nextLabel}
        {showNextChevron && <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function OnboardingFlow({
  clinic: initialClinic,
  onComplete,
}: Readonly<OnboardingFlowProps>) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Step 1: Clinic Info ──
  const [name, setName] = useState(initialClinic.name || "");
  const [phone, setPhone] = useState(initialClinic.phone || "");
  const [email, setEmail] = useState(initialClinic.email || "");

  // ── Step 2: Services ──
  const [services, setServices] = useState<string[]>(
    Array.isArray(initialClinic.services) ? initialClinic.services : []
  );
  const [newService, setNewService] = useState("");

  // ── Step 3: Hours ──
  const [hours, setHours] = useState<Record<string, string>>(
    typeof initialClinic.business_hours === "object" &&
      initialClinic.business_hours
      ? initialClinic.business_hours
      : DEFAULT_HOURS
  );

  // ── Step 4: Integrations ──
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    !!initialClinic.notifications_enabled
  );
  const [notificationEmail, setNotificationEmail] = useState(
    initialClinic.notification_email || ""
  );

  // ── Step 5: Chat test ──
  const [chatMessages, setChatMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatSessionId] = useState(
    () =>
      `setup_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  );
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Step 6: Activate ──
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);

  // Track latest clinic state for summary
  const [clinic, setClinic] = useState(initialClinic);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Clear saved indicator on step change
  useEffect(() => {
    setSaved(false);
  }, [step]);

  // ── Save helpers ─────────────────────────────────────────────────
  const saveStep = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updates = buildStepUpdates(step, {
        name,
        phone,
        email,
        services,
        hours,
        notificationsEnabled,
        notificationEmail,
      });

      if (Object.keys(updates).length > 0) {
        const result = await api.clinics.updateMyClinic(updates);
        setClinic(result);
      }
      setSaved(true);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const validate = (): boolean => {
    const errs = validateStepState(step, { name, phone, email, services });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = async () => {
    if (!validate()) return;
    if (shouldPersistStep(step)) {
      const saved = await saveStep();
      if (!saved) return;
    }
    setStep((s) => Math.min(s + 1, 6));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  // ── Service helpers ──────────────────────────────────────────────
  const addService = () => {
    const trimmed = newService.trim();
    if (trimmed && !services.includes(trimmed)) {
      setServices([...services, trimmed]);
      setNewService("");
      setErrors({});
    }
  };

  const removeService = (idx: number) =>
    setServices(services.filter((_, i) => i !== idx));

  // ── Chat helpers ─────────────────────────────────────────────────
  const sendChat = async (text?: string) => {
    const msg = (text || chatInput).trim();
    if (!msg || chatSending) return;
    setChatInput("");
    setChatMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: msg },
    ]);
    setChatSending(true);
    try {
      const res = await api.chat.send({
        clinic_slug: clinic.slug,
        session_id: chatSessionId,
        message: msg,
      });
      setChatMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: res.reply },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Something went wrong. Try again.",
        },
      ]);
    } finally {
      setChatSending(false);
    }
  };

  // ── Activate (Go Live) ──────────────────────────────────────────
  const activate = async () => {
    setActivating(true);
    setActivateError(null);
    try {
      await api.clinics.updateMyClinic({ onboarding_completed: true });
    } catch {
      // Non-critical — continue to goLive even if this fails
    }
    try {
      await api.clinics.goLive();
      setActivated(true);
      setTimeout(() => onComplete(), 2500);
    } catch (err: unknown) {
      // If goLive fails, still mark onboarding done so user can access dashboard
      setActivateError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
      // Fallback: let them into the dashboard anyway
      setTimeout(() => onComplete(), 1500);
    } finally {
      setActivating(false);
    }
  };

  // ── Summary data for step 6 ─────────────────────────────────────
  const summaryItems = createSummaryItems(clinic);

  const completedSummary = summaryItems.filter((i) => i.done).length;
  const progressWidth = `${((step - 1) / 5) * 100}%`;
  const nextLabel = nextButtonLabel(step, saving, saved);
  const showNextChevron = saving === false && saved === false;
  let nextButtonIcon: React.ReactNode = null;
  if (saving) {
    nextButtonIcon = <Loader2 className="w-4 h-4 animate-spin" />;
  } else if (saved) {
    nextButtonIcon = <Check className="w-4 h-4" />;
  }

  // ── Render: activated success ────────────────────────────────────
  if (activated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            You&apos;re live!
          </h1>
          <p className="text-slate-500 mb-1">
            Your AI assistant is now accepting patient inquiries.
          </p>
          <p className="text-sm text-slate-400">
            Redirecting to your dashboard\u2026
          </p>
        </div>
      </div>
    );
  }

  // ── Render: main flow ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-slate-900">Clinic AI</span>
          <span className="ml-auto text-sm text-slate-400">
            Step {step} of 6
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <OnboardingFlowProgress step={step} onSelectStep={setStep} />

        {/* Step card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* ═══════ Step 1: Clinic Info ═══════ */}
          {step === 1 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Tell us about your clinic
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Your assistant uses this to greet patients and share contact details when asked.
              </p>
              <div className="space-y-4 max-w-md">
                <Field
                  id="ob-name"
                  label="Clinic Name"
                  value={name}
                  onChange={setName}
                  error={errors.name}
                  placeholder="Sunrise Medical Clinic"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="ob-phone"
                    label="Phone"
                    value={phone}
                    onChange={setPhone}
                    error={errors.phone}
                    placeholder="(555) 123-4567"
                    type="tel"
                    required
                  />
                  <Field
                    id="ob-email"
                    label="Email"
                    value={email}
                    onChange={setEmail}
                    error={errors.email}
                    placeholder="contact@clinic.com"
                    type="email"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══════ Step 2: Services ═══════ */}
          {step === 2 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Add the services you offer
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Patients choose from these when booking. Your assistant uses them to match the right appointment type.
              </p>
              <div className="max-w-md">
                {services.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {services.map((s, i) => (
                      <span
                        key={`svc-${s}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm font-medium"
                      >
                        {s}
                        <button
                          onClick={() => removeService(i)}
                          aria-label={`Remove ${s}`}
                          className="text-teal-400 hover:text-teal-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addService();
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="e.g., Teeth Cleaning, Consultation"
                  />
                  <button
                    onClick={addService}
                    aria-label="Add service"
                    className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {errors.services && (
                  <p className="mt-2 text-xs text-red-600">{errors.services}</p>
                )}
                {services.length === 0 && (
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-slate-600">Common services</p>
                      <button
                        onClick={() =>
                          setServices([
                            "General Consultation",
                            "Teeth Cleaning",
                            "Urgent Care",
                            "Follow-up Visit",
                          ])
                        }
                        className="text-xs font-medium text-teal-600 hover:text-teal-700"
                      >
                        Add All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "General Consultation",
                        "Teeth Cleaning",
                        "Urgent Care",
                        "Follow-up Visit",
                      ].map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            setServices((prev) =>
                              prev.includes(s) ? prev : [...prev, s]
                            )
                          }
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════ Step 3: Hours ═══════ */}
          {step === 3 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Set your business hours
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Your assistant shares these when patients ask when you\u2019re open. Type &quot;Closed&quot; for days off.
              </p>
              <div className="max-w-md space-y-2.5">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium text-slate-700 capitalize">
                      {day}
                    </span>
                    <input
                      type="text"
                      value={hours[day] || ""}
                      onChange={(e) =>
                        setHours({ ...hours, [day]: e.target.value })
                      }
                      className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      placeholder="9:00 AM - 5:00 PM"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════ Step 4: Integrations ═══════ */}
          {step === 4 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Stay notified when patients reach out
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Turn on email alerts so you never miss an appointment request. You can add more integrations later in Settings.
              </p>
              <div className="max-w-md space-y-5">
                {/* Email notifications — recommended, shown first */}
                <div className={`p-4 rounded-xl border transition-colors ${
                  notificationsEnabled
                    ? "border-teal-200 bg-teal-50/30"
                    : "border-slate-200"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      notificationsEnabled ? "bg-teal-100" : "bg-slate-100"
                    }`}>
                      <Mail className={`w-5 h-5 ${notificationsEnabled ? "text-teal-600" : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          Email alerts
                        </p>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Receive an email each time a patient submits an appointment request through your assistant.
                      </p>
                    </div>
                    <label className="relative shrink-0 cursor-pointer">
                      <span className="sr-only">Enable email notifications</span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={notificationsEnabled}
                        onChange={(e) =>
                          setNotificationsEnabled(e.target.checked)
                        }
                      />
                      <div
                        className={`block w-10 h-6 rounded-full transition-colors ${
                          notificationsEnabled
                            ? "bg-teal-600"
                            : "bg-slate-200"
                        }`}
                      />
                      <div
                        className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${
                          notificationsEnabled ? "translate-x-4" : ""
                        }`}
                      />
                    </label>
                  </div>
                  {notificationsEnabled && (
                    <div className="mt-3 pl-12">
                      <label htmlFor="notif-email" className="block text-xs font-medium text-slate-600 mb-1">
                        Send notifications to
                      </label>
                      <input
                        id="notif-email"
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                        placeholder={email || "your@email.com"}
                      />
                    </div>
                  )}
                </div>

                {/* Google Sheets — optional, secondary */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Sheet className={`w-5 h-5 ${clinic.google_sheet_id ? "text-emerald-600" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        Google Sheets
                      </p>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        Optional
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {clinic.google_sheet_id
                        ? "Connected \u2014 leads sync to your spreadsheet."
                        : "Automatically sync leads to a spreadsheet. You can connect this in Settings after setup."}
                    </p>
                  </div>
                  {clinic.google_sheet_id && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════ Step 5: Test Assistant ═══════ */}
          {step === 5 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                See your assistant in action
              </h2>
              <p className="text-sm text-slate-500 mb-1">
                This is exactly what patients see when they open your chat widget.
              </p>
              <p className="text-xs text-slate-400 mb-6">
                Your assistant already knows your clinic name, services, and hours.
              </p>
              <div className="max-w-md mx-auto border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {/* Chat header */}
                <div className="px-4 py-3 bg-teal-600 text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium block leading-tight">
                      {clinic.assistant_name || clinic.name || "AI Assistant"}
                    </span>
                    <span className="text-[11px] text-teal-100">Online now</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="h-72 overflow-y-auto p-4 space-y-3 bg-slate-50">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8">
                      <Sparkles className="w-6 h-6 text-teal-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600 mb-1">
                        Try asking something
                      </p>
                      <p className="text-xs text-slate-400 mb-4">
                        See how your assistant responds to common questions
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {SUGGESTION_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => sendChat(chip)}
                            className="px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full hover:bg-teal-100 transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${
                          msg.role === "user"
                            ? "bg-teal-600 text-white rounded-br-md"
                            : "bg-white text-slate-700 border border-slate-200 rounded-bl-md shadow-sm leading-relaxed"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatSending && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                        <span className="typing-dot-1 w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="typing-dot-2 w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        <span className="typing-dot-3 w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-slate-200 p-3 bg-white flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    placeholder="Type a message..."
                  />
                  <button
                    onClick={() => sendChat()}
                    disabled={chatSending || !chatInput.trim()}
                    aria-label="Send message"
                    className="px-3 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ Step 6: Launch ═══════ */}
          {step === 6 && (
            <div className="p-6 sm:p-8">
              <div className="max-w-md mx-auto text-center">
                <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-7 h-7 text-teal-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  Your assistant is ready to launch
                </h2>
                <p className="text-sm text-slate-500 mb-8">
                  Once activated, your AI assistant will start handling patient inquiries in real time.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3 mb-6">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Setup summary &mdash; {completedSummary} of {summaryItems.length} configured
                </p>
                {summaryItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50"
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span
                        className={`text-sm ${
                          item.done
                            ? "text-slate-900 font-medium"
                            : "text-slate-400"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.detail && (
                        <p className="text-xs text-slate-400 mt-0.5">{item.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="max-w-md mx-auto rounded-xl bg-teal-50/50 border border-teal-100 p-4 mb-8">
                <p className="text-xs font-medium text-teal-800 mb-2">After activation:</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-xs text-teal-700">
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    Your chat widget goes live on your website
                  </li>
                  <li className="flex items-center gap-2 text-xs text-teal-700">
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    Patients can book appointments instantly
                  </li>
                  <li className="flex items-center gap-2 text-xs text-teal-700">
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    You&apos;ll see leads appear in your dashboard
                  </li>
                </ul>
              </div>

              <div className="max-w-md mx-auto">
                <button
                  onClick={activate}
                  disabled={activating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-70 transition-all shadow-md hover:shadow-lg"
                >
                  {activating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Activating&hellip;
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      Activate your assistant
                    </>
                  )}
                </button>
                {activateError && (
                  <p className="mt-3 text-sm text-red-600 text-center">
                    {activateError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          <OnboardingFlowNavigation
            step={step}
            saving={saving}
            saved={saved}
            nextButtonIcon={nextButtonIcon}
            nextLabel={nextLabel}
            showNextChevron={showNextChevron}
            onBack={goBack}
            onNext={goNext}
          />
        </div>
      </div>

      <style jsx>{`
        .onboarding-flow-progress {
          width: ${progressWidth};
        }

        .typing-dot-1 {
          animation-delay: 0ms;
        }

        .typing-dot-2 {
          animation-delay: 150ms;
        }

        .typing-dot-3 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}

// ── Reusable field component ──────────────────────────────────────
function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  required,
}: Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 mb-1.5"
      >
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white focus:ring-1 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-slate-200 focus:border-teal-500 focus:ring-teal-500"
        }`}
        placeholder={placeholder}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
