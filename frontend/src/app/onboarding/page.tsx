"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Building2,
  Stethoscope,
  Clock,
  HelpCircle,
  Sheet,
  MessageSquare,
  Code2,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Send,
  Palette,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Clinic, FaqEntry, SheetsValidation } from "@/types";

const STEPS = [
  { id: 1, title: "Clinic Info", icon: Building2 },
  { id: 2, title: "Services", icon: Stethoscope },
  { id: 3, title: "Hours", icon: Clock },
  { id: 4, title: "FAQ", icon: HelpCircle },
  { id: 5, title: "Google Sheets", icon: Sheet },
  { id: 6, title: "Test Chat", icon: MessageSquare },
  { id: 7, title: "Embed Widget", icon: Code2 },
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

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 - Clinic Info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // Step 2 - Services
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");

  // Step 3 - Hours
  const [hours, setHours] = useState<Record<string, string>>(DEFAULT_HOURS);

  // Step 4 - FAQ
  const [faq, setFaq] = useState<FaqEntry[]>([]);

  // Step 5 - Google Sheets
  const [googleSheetId, setGoogleSheetId] = useState("");
  const [googleSheetTab, setGoogleSheetTab] = useState("Sheet1");
  const [availabilityEnabled, setAvailabilityEnabled] = useState(false);
  const [availabilitySheetTab, setAvailabilitySheetTab] = useState("Availability");
  const [sheetsValidation, setSheetsValidation] = useState<SheetsValidation | null>(null);
  const [validatingSheets, setValidatingSheets] = useState(false);

  // Step 5 - Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");

  // Step 5 - Branding
  const [assistantName, setAssistantName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d9488");

  // Step 6 - Chat test
  const [chatMessages, setChatMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatSessionId] = useState(
    () => `onboarding_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  );
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Step 7 - Embed
  const [copied, setCopied] = useState(false);

  const loadClinic = useCallback(async () => {
    try {
      const data = await api.clinics.getMyClinic();
      setClinic(data);

      // If onboarding already completed, go to dashboard
      if (data.onboarding_completed) {
        router.push("/dashboard");
        return;
      }

      // Restore saved progress
      setName(data.name || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      setAddress(data.address || "");
      setServices(Array.isArray(data.services) ? data.services : []);
      setHours(
        typeof data.business_hours === "object" && data.business_hours
          ? data.business_hours
          : DEFAULT_HOURS
      );
      setFaq(Array.isArray(data.faq) ? data.faq : []);
      setGoogleSheetId(data.google_sheet_id || "");
      setGoogleSheetTab(data.google_sheet_tab || "Sheet1");
      setAvailabilityEnabled(!!data.availability_enabled);
      setAvailabilitySheetTab(data.availability_sheet_tab || "Availability");
      setNotificationsEnabled(!!data.notifications_enabled);
      setNotificationEmail(data.notification_email || "");
      setAssistantName(data.assistant_name || "");
      setPrimaryColor(data.primary_color || "#0d9488");

      // Resume from saved step
      if (data.onboarding_step && data.onboarding_step > 0) {
        setStep(Math.min(data.onboarding_step, 7));
      }
    } catch {
      // Clinic not found — stay on step 1
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (isAuthenticated) loadClinic();
  }, [authLoading, isAuthenticated, router, loadClinic]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const saveProgress = async (extraUpdates: Partial<Clinic> = {}) => {
    setSaving(true);
    try {
      const updates: Partial<Clinic> = {
        name,
        phone,
        email,
        address,
        services,
        business_hours: hours,
        faq,
        google_sheet_id: googleSheetId,
        google_sheet_tab: googleSheetTab,
        availability_enabled: availabilityEnabled,
        availability_sheet_tab: availabilitySheetTab,
        notifications_enabled: notificationsEnabled,
        notification_email: notificationEmail,
        assistant_name: assistantName,
        primary_color: primaryColor,
        onboarding_step: step,
        ...extraUpdates,
      };
      const updated = await api.clinics.updateMyClinic(updates);
      setClinic(updated);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!name.trim()) errs.name = "Clinic name is required";
      if (!phone.trim()) errs.phone = "Phone number is required";
      if (!email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errs.email = "Enter a valid email address";
    }

    if (step === 2) {
      if (services.length === 0) errs.services = "Add at least one service";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = async () => {
    if (!validateStep()) return;
    const saved = await saveProgress({ onboarding_step: step + 1 } as Partial<Clinic>);
    if (saved) setStep((s) => Math.min(s + 1, 7));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  const finishOnboarding = async () => {
    await saveProgress({
      onboarding_completed: true,
      onboarding_step: 7,
    } as Partial<Clinic>);
    router.push("/dashboard?welcome=true");
  };

  // Services helpers
  const addService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setServices([...services, newService.trim()]);
      setNewService("");
      setErrors({});
    }
  };
  const removeService = (idx: number) =>
    setServices(services.filter((_, i) => i !== idx));

  // FAQ helpers
  const addFaq = () => setFaq([...faq, { question: "", answer: "" }]);
  const updateFaq = (
    idx: number,
    field: "question" | "answer",
    value: string
  ) => {
    const updated = [...faq];
    updated[idx] = { ...updated[idx], [field]: value };
    setFaq(updated);
  };
  const removeFaq = (idx: number) => setFaq(faq.filter((_, i) => i !== idx));

  // Sheets validation
  const validateSheets = async () => {
    if (!googleSheetId.trim()) return;
    setValidatingSheets(true);
    setSheetsValidation(null);
    try {
      const result = await api.clinics.validateSheets({
        sheet_id: googleSheetId,
        tab_name: googleSheetTab,
        availability_tab: availabilityEnabled ? availabilitySheetTab : "",
      });
      setSheetsValidation(result);
    } catch {
      setSheetsValidation({
        connected: false,
        tab_found: false,
        availability_tab_found: false,
        availability_headers_ok: false,
        error: "Failed to validate. Check your connection.",
      });
    } finally {
      setValidatingSheets(false);
    }
  };

  // Chat test
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatSending || !clinic) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: msg }]);
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
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setChatSending(false);
    }
  };

  // Copy embed code
  const origin = globalThis.window === undefined ? "" : globalThis.location.origin;
  const embedCode = clinic
    ? `<script src="${origin}/widget.js" data-clinic="${clinic.slug}"></script>`
    : "";

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-slate-900">Clinic AI Setup</span>
          <span className="ml-auto text-sm text-slate-500">
            Step {step} of 7
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s) => {
              const StepIcon = s.icon;
              const isDone = step > s.id;
              const isCurrent = step === s.id;
              let stepColorClass: string;
              if (isDone) {
                stepColorClass = "bg-teal-600 text-white";
              } else if (isCurrent) {
                stepColorClass = "bg-teal-100 text-teal-700 ring-2 ring-teal-600";
              } else {
                stepColorClass = "bg-slate-100 text-slate-400";
              }
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (s.id < step) setStep(s.id);
                  }}
                  disabled={s.id > step}
                  className={`flex flex-col items-center gap-1.5 transition-colors ${
                    s.id > step
                      ? "opacity-40 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${stepColorClass}`}
                  >
                    {isDone ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-medium hidden sm:block ${
                      isCurrent ? "text-teal-700" : "text-slate-500"
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((step - 1) / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          {/* ==================== STEP 1: Clinic Info ==================== */}
          {step === 1 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Tell us about your clinic
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                This information will be used by your AI assistant when
                interacting with patients.
              </p>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label htmlFor="ob-clinic-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Clinic Name *
                  </label>
                  <input
                    id="ob-clinic-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white focus:ring-1 ${
                      errors.name
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                    }`}
                    placeholder="Sunrise Medical Clinic"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ob-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Phone *
                    </label>
                    <input
                      id="ob-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white focus:ring-1 ${
                        errors.phone
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                      }`}
                      placeholder="(555) 123-4567"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="ob-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email *
                    </label>
                    <input
                      id="ob-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white focus:ring-1 ${
                        errors.email
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                      }`}
                      placeholder="contact@clinic.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="ob-address" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Address
                  </label>
                  <input
                    id="ob-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="123 Main St, Suite 100, City, State"
                  />
                </div>
                {/* Branding section within step 1 */}
                <div className="border-t border-slate-100 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Branding (optional)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="ob-assistant-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Assistant Name
                      </label>
                      <input
                        id="ob-assistant-name"
                        type="text"
                        value={assistantName}
                        onChange={(e) => setAssistantName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        placeholder='e.g., "Sarah from Smile Dental"'
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Displayed in the chat widget header. Leave blank for
                        default.
                      </p>
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-slate-700 mb-1.5">
                        Primary Color
                      </span>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          aria-label="Choose primary color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                          placeholder="#0d9488"
                        />
                        <div
                          className="h-10 flex-1 rounded-lg"
                          style={{ backgroundColor: primaryColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 2: Services ==================== */}
          {step === 2 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                What services does your clinic offer?
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                The AI assistant will use these when helping patients describe
                their reason for visit.
              </p>
              <div className="max-w-lg">
                <div className="flex flex-wrap gap-2 mb-4">
                  {services.map((s, i) => (
                    <span
                      key={`svc-${s}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm"
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
                    placeholder="e.g., Teeth Cleaning, Consultation, Urgent Care"
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
                  <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-slate-500">
                        Common services to get started:
                      </p>
                      <button
                        onClick={() =>
                          setServices([
                            "General Consultation",
                            "Teeth Cleaning",
                            "Urgent Care",
                            "Follow-up Visit",
                            "X-Ray",
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
                        "X-Ray",
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

          {/* ==================== STEP 3: Business Hours ==================== */}
          {step === 3 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Set your business hours
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                The AI assistant will share these hours with patients who ask.
              </p>
              <div className="max-w-lg space-y-3">
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
                      className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      placeholder='9:00 AM - 5:00 PM or "Closed"'
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== STEP 4: FAQ ==================== */}
          {step === 4 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Add questions patients commonly ask. The AI will use these to
                provide accurate answers. You can skip this and add them later.
              </p>
              <div className="max-w-lg">
                {faq.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                    <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-4">
                      No FAQs yet. Add common questions like:
                    </p>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>&quot;Do you accept insurance?&quot;</p>
                      <p>&quot;What is your cancellation policy?&quot;</p>
                      <p>&quot;Do you offer evening appointments?&quot;</p>
                    </div>
                    <button
                      onClick={addFaq}
                      className="mt-4 px-4 py-2 text-sm font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add FAQ
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {faq.map((item, i) => (
                      <div
                        key={`faq-${i}-${item.question.slice(0, 20)}`}
                        className="p-4 border border-slate-100 rounded-lg bg-slate-50"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-medium text-slate-500">
                            FAQ #{i + 1}
                          </span>
                          <button
                            onClick={() => removeFaq(i)}
                            aria-label={`Remove FAQ ${i + 1}`}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={item.question}
                          onChange={(e) =>
                            updateFaq(i, "question", e.target.value)
                          }
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 mb-3"
                          placeholder="Question"
                        />
                        <textarea
                          value={item.answer}
                          onChange={(e) =>
                            updateFaq(i, "answer", e.target.value)
                          }
                          rows={2}
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                          placeholder="Answer"
                        />
                      </div>
                    ))}
                    <button
                      onClick={addFaq}
                      className="w-full py-2.5 text-sm font-medium text-teal-600 border border-dashed border-teal-300 rounded-lg hover:bg-teal-50"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add Another FAQ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== STEP 5: Google Sheets + Integrations ==================== */}
          {step === 5 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Connect Google Sheets
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Sync leads to a spreadsheet and optionally manage appointment
                availability. You can skip this and set it up later.
              </p>

              <div className="max-w-lg space-y-6">
                {/* Setup instructions */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">
                    Setup Instructions
                  </h4>
                  <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
                    <li>Create a Google Sheet (or use an existing one)</li>
                    <li>
                      <span>Click <b>Share</b> and add this email as an <b>Editor</b>:</span>
                      <code className="block mt-1 bg-white/80 px-2 py-1 rounded text-blue-900 select-all break-all">
                        clinic-ai-bot@clinic-ai-491503.iam.gserviceaccount.com
                      </code>
                    </li>
                    <li>Paste the spreadsheet link or ID below</li>
                  </ol>
                </div>

                {/* Sheet ID */}
                <div>
                  <label htmlFor="ob-sheet-id" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Spreadsheet ID or URL
                  </label>
                  <input
                    id="ob-sheet-id"
                    type="text"
                    value={googleSheetId}
                    onChange={(e) => {
                      setGoogleSheetId(e.target.value);
                      setSheetsValidation(null);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </div>

                {/* Leads tab */}
                <div>
                  <label htmlFor="ob-leads-tab" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Leads Tab Name
                  </label>
                  <input
                    id="ob-leads-tab"
                    type="text"
                    value={googleSheetTab}
                    onChange={(e) => setGoogleSheetTab(e.target.value)}
                    className="w-full sm:max-w-xs px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="Sheet1"
                  />
                </div>

                {/* Availability toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={availabilityEnabled}
                      onChange={(e) =>
                        setAvailabilityEnabled(e.target.checked)
                      }
                    />
                    <div
                      className={`block w-10 h-6 rounded-full transition-colors ${
                        availabilityEnabled ? "bg-teal-500" : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                        availabilityEnabled ? "translate-x-4" : ""
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    Enable appointment availability
                  </span>
                </label>

                {availabilityEnabled && (
                  <div className="space-y-4 pl-1">
                    <div>
                      <label htmlFor="ob-avail-tab" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Availability Tab Name
                      </label>
                      <input
                        id="ob-avail-tab"
                        type="text"
                        value={availabilitySheetTab}
                        onChange={(e) =>
                          setAvailabilitySheetTab(e.target.value)
                        }
                        className="w-full sm:max-w-xs px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        placeholder="Availability"
                      />
                    </div>
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 text-xs text-teal-700">
                      Required headers:{" "}
                      <code className="bg-white/80 px-1 py-0.5 rounded">
                        Date | Time | Status | Patient Name | Lead ID
                      </code>
                    </div>
                  </div>
                )}

                {/* Notifications */}
                <div className="border-t border-slate-100 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
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
                            ? "bg-indigo-500"
                            : "bg-slate-200"
                        }`}
                      />
                      <div
                        className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                          notificationsEnabled ? "translate-x-4" : ""
                        }`}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      Email me when a new lead arrives
                    </span>
                  </label>
                  {notificationsEnabled && (
                    <div className="mt-3 pl-1">
                      <input
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        className="w-full sm:max-w-md px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder={email || "your@email.com"}
                      />
                    </div>
                  )}
                </div>

                {/* Validate button */}
                {googleSheetId.trim() && (
                  <button
                    onClick={validateSheets}
                    disabled={validatingSheets}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    {validatingSheets ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sheet className="w-4 h-4" />
                    )}
                    Test Connection
                  </button>
                )}

                {/* Validation result */}
                {sheetsValidation && (
                  <div
                    className={`p-4 rounded-lg border ${
                      sheetsValidation.connected
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {sheetsValidation.connected ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1 text-sm">
                        {sheetsValidation.connected ? (
                          <>
                            <p className="font-medium text-emerald-800">
                              Connected to &quot;{sheetsValidation.sheet_title}
                              &quot;
                            </p>
                            <p className="text-emerald-700">
                              Leads tab ({googleSheetTab}):{" "}
                              {sheetsValidation.tab_found ? "Found" : "Not found"}
                            </p>
                            {availabilityEnabled && (
                              <p className="text-emerald-700">
                                Availability tab ({availabilitySheetTab}):{" "}
                                {(() => {
                                  if (!sheetsValidation.availability_tab_found) return "Not found";
                                  if (sheetsValidation.availability_headers_ok) return "Found with correct headers";
                                  return "Found but missing required headers";
                                })()}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-red-700">
                            {sheetsValidation.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== STEP 6: Test Chat ==================== */}
          {step === 6 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Test your AI assistant
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Try a conversation to see how patients will experience your
                assistant. Try saying &quot;I want to book an appointment.&quot;
              </p>
              <div className="max-w-lg mx-auto border border-slate-200 rounded-xl overflow-hidden">
                {/* Chat header */}
                <div
                  className="px-4 py-3 text-white flex items-center gap-2"
                  style={{ backgroundColor: primaryColor || "#0d9488" }}
                >
                  <Bot className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {assistantName || name || "AI Assistant"}
                  </span>
                </div>

                {/* Chat messages */}
                <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12 text-sm text-slate-400">
                      Send a message to start testing
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
                            : "bg-white text-slate-700 border border-slate-200 rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatSending && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="border-t border-slate-200 p-3 bg-white flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="Type a message..."
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatSending || !chatInput.trim()}
                    aria-label="Send chat message"
                    className="px-3 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 7: Embed Widget ==================== */}
          {step === 7 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Add the chat widget to your website
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Copy the code below and paste it into your website to start
                receiving real patient leads.
              </p>

              <div className="max-w-lg space-y-6">
                {/* Code snippet */}
                <div>
                  <span className="block text-sm font-medium text-slate-700 mb-2">
                    Embed Code
                  </span>
                  <div className="relative group">
                    <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-sm overflow-x-auto font-mono">
                      {embedCode}
                    </pre>
                    <button
                      onClick={copyEmbed}
                      className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">
                    Installation Steps
                  </h4>
                  <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                    <li>
                      Copy the code above
                    </li>
                    <li>
                      Open your website&apos;s HTML
                    </li>
                    <li>
                      Paste the code just before the{" "}
                      <code className="bg-white/80 px-1 py-0.5 rounded">
                        &lt;/body&gt;
                      </code>{" "}
                      closing tag
                    </li>
                    <li>Save and deploy your website</li>
                  </ol>
                </div>

                {/* Works with */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    Compatible with
                  </h4>
                  <p className="text-sm text-slate-500">
                    WordPress, Squarespace, Wix, Webflow, Shopify, custom HTML,
                    and any website that supports custom code.
                  </p>
                </div>

                {/* Direct chat link */}
                {clinic && (
                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                    <h4 className="text-sm font-semibold text-teal-800 mb-2">
                      Direct Chat Link
                    </h4>
                    <p className="text-sm text-teal-700 mb-2">
                      You can also share this link directly with patients:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-white/80 px-3 py-2 rounded border border-teal-200 text-teal-900 truncate">
                        {globalThis.window === undefined
                          ? `/chat/${clinic.slug}`
                          : `${globalThis.location.origin}/chat/${clinic.slug}`}
                      </code>
                      <a
                        href={`/chat/${clinic.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open chat page in new tab"
                        className="p-2 text-teal-600 hover:text-teal-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 7 ? (
              <button
                onClick={goNext}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {step === 4 || step === 5 ? "Continue" : "Save & Continue"}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={finishOnboarding}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 shadow-sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Launch Your Assistant
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
