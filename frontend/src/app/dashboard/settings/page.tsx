"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Palette,
  Sheet,
  Send,
  ExternalLink,
  ChevronDown,
  Building2,
  MessageCircle,
  Stethoscope,
  Clock,
  HelpCircle,
  Code,
} from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import type { Clinic, FaqEntry, SheetsValidation } from "@/types";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function SettingsPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [greeting, setGreeting] = useState("");
  const [fallback, setFallback] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");
  const [hours, setHours] = useState<Record<string, string>>({});
  const [faq, setFaq] = useState<FaqEntry[]>([]);
  const [googleSheetId, setGoogleSheetId] = useState("");
  const [googleSheetTab, setGoogleSheetTab] = useState("Sheet1");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [availabilityEnabled, setAvailabilityEnabled] = useState(false);
  const [availabilitySheetTab, setAvailabilitySheetTab] = useState("Availability");
  const [assistantName, setAssistantName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d9488");
  const [sheetsValidation, setSheetsValidation] = useState<SheetsValidation | null>(null);
  const [validatingSheets, setValidatingSheets] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadClinic = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.clinics.getMyClinic();
      setClinic(data);
      setName(data.name || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      setAddress(data.address || "");
      setGreeting(data.greeting_message || "");
      setFallback(data.fallback_message || "");
      setServices(Array.isArray(data.services) ? data.services : []);
      setHours(
        typeof data.business_hours === "object" && data.business_hours
          ? data.business_hours
          : {}
      );
      setFaq(Array.isArray(data.faq) ? data.faq : []);
      setGoogleSheetId(data.google_sheet_id || "");
      setGoogleSheetTab(data.google_sheet_tab || "Sheet1");
      setNotificationsEnabled(!!data.notifications_enabled);
      setNotificationEmail(data.notification_email || "");
      setAvailabilityEnabled(!!data.availability_enabled);
      setAvailabilitySheetTab(data.availability_sheet_tab || "Availability");
      setAssistantName(data.assistant_name || "");
      setPrimaryColor(data.primary_color || "#0d9488");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClinic();
  }, [loadClinic]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const updated = await api.clinics.updateMyClinic({
        name,
        phone,
        email,
        address,
        greeting_message: greeting,
        fallback_message: fallback,
        services,
        business_hours: hours,
        faq,
        google_sheet_id: googleSheetId,
        google_sheet_tab: googleSheetTab,
        notifications_enabled: notificationsEnabled,
        notification_email: notificationEmail,
        availability_enabled: availabilityEnabled,
        availability_sheet_tab: availabilitySheetTab,
        assistant_name: assistantName,
        primary_color: primaryColor,
      });
      setClinic(updated);
      setSaveMessage("Settings saved successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to save settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const addService = () => {
    if (newService.trim()) {
      setServices([...services, newService.trim()]);
      setNewService("");
    }
  };

  const removeService = (idx: number) => {
    setServices(services.filter((_, i) => i !== idx));
  };

  const addFaq = () => {
    setFaq([...faq, { question: "", answer: "" }]);
  };

  const updateFaq = (idx: number, field: "question" | "answer", value: string) => {
    const updated = [...faq];
    updated[idx] = { ...updated[idx], [field]: value };
    setFaq(updated);
  };

  const removeFaq = (idx: number) => {
    setFaq(faq.filter((_, i) => i !== idx));
  };

  const handleValidateSheets = async () => {
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

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const result = await api.clinics.testNotification();
      if (result.success) {
        setTestEmailResult({ success: true, message: `Test email sent to ${result.email}` });
      } else {
        setTestEmailResult({ success: false, message: result.error || "Failed to send test email." });
      }
    } catch (err) {
      setTestEmailResult({ success: false, message: err instanceof Error ? err.message : "Failed to send test email." });
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) return <LoadingState message="Loading settings..." />;
  if (error) return <ErrorState message={error} onRetry={loadClinic} />;

  // Section status computation
  const getStatus = (key: string): "completed" | "incomplete" | "not-configured" => {
    switch (key) {
      case "clinic-info":
        return name && phone && email && address ? "completed" : (name || phone || email || address) ? "incomplete" : "not-configured";
      case "assistant-messages":
        return greeting && fallback ? "completed" : (greeting || fallback) ? "incomplete" : "not-configured";
      case "services":
        return services.length > 0 ? "completed" : "not-configured";
      case "hours":
        return Object.values(hours).some(v => v?.trim()) ? "completed" : "not-configured";
      case "faq":
        return faq.length > 0 ? "completed" : "not-configured";
      case "google-sheets":
        return googleSheetId ? "completed" : "not-configured";
      case "email-notifications":
        return notificationsEnabled ? (notificationEmail ? "completed" : "incomplete") : "not-configured";
      case "scheduling":
        return availabilityEnabled ? "completed" : "not-configured";
      case "branding":
        return assistantName || primaryColor !== "#0d9488" ? "completed" : "not-configured";
      case "embed":
        return "completed";
      default:
        return "not-configured";
    }
  };

  const sLabel = (s: "completed" | "incomplete" | "not-configured") =>
    s === "completed" ? "Completed" : s === "incomplete" ? "Incomplete" : "Not configured";
  const sClass = (s: "completed" | "incomplete" | "not-configured") =>
    s === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s === "incomplete" ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
  const completedCount = [
    "clinic-info", "assistant-messages", "services", "hours", "faq",
    "google-sheets", "email-notifications", "scheduling", "branding", "embed"
  ].filter(k => getStatus(k) === "completed").length;

  return (
    <div className="max-w-3xl">
      {/* Sticky header with save */}
      <div className="sticky top-0 z-10 bg-slate-50 pb-4 -mt-2 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clinic Settings</h1>
            <p className="text-slate-500 text-sm mt-1">{completedCount}/10 sections configured</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.round((completedCount / 10) * 100)}%` }} />
        </div>
      </div>

      {saveMessage && (
        <div
          className={`mb-4 p-3 text-sm rounded-lg border ${
            saveMessage.includes("success") || saveMessage.includes("copied")
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-700 border-red-100"
          }`}
        >
          {saveMessage}
        </div>
      )}

      <div className="space-y-2">
        {/* 1. Clinic Information */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("clinic-info")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900">Clinic Information</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("clinic-info"))}`}>{sLabel(getStatus("clinic-info"))}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("clinic-info") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("clinic-info") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 mb-4">Your clinic&apos;s contact details shown to patients.</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="clinic-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Clinic Name
                  </label>
                  <input
                    id="clinic-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="clinic-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Phone
                    </label>
                    <input
                      id="clinic-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label htmlFor="clinic-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email
                    </label>
                    <input
                      id="clinic-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                      placeholder="contact@clinic.com"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="clinic-address" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Address
                  </label>
                  <input
                    id="clinic-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="123 Main St, Suite 100, City, State, ZIP"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 2. Assistant Messages */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("assistant-messages")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MessageCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900">Assistant Messages</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("assistant-messages"))}`}>{sLabel(getStatus("assistant-messages"))}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("assistant-messages") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("assistant-messages") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 mb-4">Customize how your AI assistant greets patients and handles uncertainty.</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="greeting" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Greeting Message
                  </label>
                  <p className="text-xs text-slate-500 mb-1.5">
                    The first message patients see when they open the chat.
                  </p>
                  <textarea
                    id="greeting"
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                  />
                </div>
                <div>
                  <label htmlFor="fallback" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Fallback Message
                  </label>
                  <p className="text-xs text-slate-500 mb-1.5">
                    Used when the AI is unsure how to respond.
                  </p>
                  <textarea
                    id="fallback"
                    value={fallback}
                    onChange={(e) => setFallback(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 3. Services */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("services")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900">Services</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("services"))}`}>{sLabel(getStatus("services"))}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("services") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("services") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 mb-4">List the services your clinic offers so the AI can inform patients.</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {services.map((s) => (
                  <span
                    key={`svc-${s}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm"
                  >
                    {s}
                    <button
                      onClick={() => removeService(services.indexOf(s))}
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
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }}
                  className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  placeholder="Add a service (e.g., General Checkup)"
                />
                <button
                  onClick={addService}
                  aria-label="Add service"
                  className="px-3 py-2.5 text-sm font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 4. Business Hours */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("hours")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900">Business Hours</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("hours"))}`}>{sLabel(getStatus("hours"))}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("hours") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("hours") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 mb-4">Set your clinic&apos;s hours so patients know when you&apos;re available.</p>
              <div className="space-y-3">
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
                      placeholder='e.g., 9:00 AM - 5:00 PM or "Closed"'
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 5. FAQ */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("faq")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900">FAQ</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("faq"))}`}>{sLabel(getStatus("faq"))}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("faq") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("faq") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 mb-4">Add questions and answers the AI assistant can use to help patients.</p>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-slate-500">
                  Add questions and answers that the AI assistant can use to help patients.
                </p>
                <button
                  onClick={addFaq}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors shrink-0 ml-4"
                >
                  <Plus className="w-4 h-4" />
                  Add FAQ
                </button>
              </div>
              {faq.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  No FAQs added yet. Click &quot;Add FAQ&quot; to get started.
                </p>
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
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={item.question}
                          onChange={(e) => updateFaq(i, "question", e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                          placeholder="Question (e.g., Do you accept insurance?)"
                        />
                        <textarea
                          value={item.answer}
                          onChange={(e) => updateFaq(i, "answer", e.target.value)}
                          rows={2}
                          className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                          placeholder="Answer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 6. Google Sheets */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("google-sheets")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Sheet className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900">Google Sheets</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("google-sheets"))}`}>{sLabel(getStatus("google-sheets"))}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("google-sheets") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("google-sheets") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 mb-4">
                Automatically sync new leads to your Google Sheet. Share as <b>Editor</b> with: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 select-all">clinic-ai-bot@clinic-ai-491503.iam.gserviceaccount.com</code>
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="google-sheet-id" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Spreadsheet ID or URL
                  </label>
                  <input
                    id="google-sheet-id"
                    type="text"
                    value={googleSheetId}
                    onChange={(e) => setGoogleSheetId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRYFa..."
                  />
                </div>
                <div>
                  <label htmlFor="google-sheet-tab" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tab / Sheet Name
                  </label>
                  <input
                    id="google-sheet-tab"
                    type="text"
                    value={googleSheetTab}
                    onChange={(e) => setGoogleSheetTab(e.target.value)}
                    className="w-full sm:max-w-xs px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder="Sheet1"
                  />
                </div>
                {googleSheetId.trim() && (
                  <button
                    onClick={handleValidateSheets}
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
                              Connected to &quot;{sheetsValidation.sheet_title}&quot;
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
                          <p className="text-red-700">{sheetsValidation.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 7. Email Notifications */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("email-notifications")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Send className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900">Email Notifications</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("email-notifications"))}`}>{sLabel(getStatus("email-notifications"))}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("email-notifications") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("email-notifications") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 mb-4">Receive immediate email alerts whenever a new patient lead is captured.</p>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${notificationsEnabled ? "bg-indigo-500" : "bg-slate-200"}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notificationsEnabled ? "translate-x-4" : ""}`}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-700">Enable new lead notifications</span>
                </label>
                {notificationsEnabled && (
                  <div className="pt-2 space-y-3">
                    <div>
                      <label htmlFor="notification-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Notification Email Address
                      </label>
                      <input
                        id="notification-email"
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        className="w-full sm:max-w-md px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="doctor@clinic.com (defaults to your account email if empty)"
                      />
                    </div>
                    <div>
                      <button
                        onClick={handleTestEmail}
                        disabled={testingEmail}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                      >
                        {testingEmail ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Send Test Email
                      </button>
                      {testEmailResult && (
                        <p className={`mt-2 text-sm ${testEmailResult.success ? "text-emerald-600" : "text-red-600"}`}>
                          {testEmailResult.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 8. Availability & Scheduling */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("scheduling")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900">Availability & Scheduling</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("scheduling"))}`}>{sLabel(getStatus("scheduling"))}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("scheduling") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("scheduling") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 mb-4">Connect a Google Sheet tab to offer real-time appointment slots in chat.</p>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={availabilityEnabled}
                      onChange={(e) => setAvailabilityEnabled(e.target.checked)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${availabilityEnabled ? "bg-teal-500" : "bg-slate-200"}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${availabilityEnabled ? "translate-x-4" : ""}`}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-700">Enable guided scheduling from Google Sheets</span>
                </label>
                {availabilityEnabled && (
                  <div className="pt-2 space-y-4">
                    <div>
                      <label htmlFor="availability-tab" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Availability Tab Name
                      </label>
                      <input
                        id="availability-tab"
                        type="text"
                        value={availabilitySheetTab}
                        onChange={(e) => setAvailabilitySheetTab(e.target.value)}
                        className="w-full sm:max-w-md px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        placeholder="e.g., Availability"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Default is &ldquo;Availability&rdquo;. Ensure this tab exists in your Google Sheet.
                      </p>
                    </div>
                    <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                      <h4 className="text-[10px] font-bold text-teal-800 uppercase tracking-wider mb-2">Required Sheet Format</h4>
                      <p className="text-xs text-teal-700 leading-relaxed font-medium">
                        Your tab must have these headers in the first row:
                      </p>
                      <code className="block mt-2 font-mono text-[10px] bg-white/80 p-2 rounded border border-teal-200/50 text-teal-900 select-all">
                        Date | Time | Status | Patient Name | Lead ID
                      </code>
                      <div className="mt-3 flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                        <p className="text-[10px] text-teal-600">Only rows with Status = <span className="font-bold">available</span> will be shown to patients.</p>
                      </div>
                      <div className="mt-1 flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                        <p className="text-[10px] text-teal-600">The AI will automatically handle the reservation flow.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 9. Branding */}
        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("branding")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Palette className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-900">Branding</span>
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("branding"))}`}>{sLabel(getStatus("branding"))}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("branding") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("branding") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 mb-4">Customize the chat widget appearance on your website.</p>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label htmlFor="assistant-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Assistant Name
                  </label>
                  <input
                    id="assistant-name"
                    type="text"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    placeholder='e.g., "Sarah from Smile Dental"'
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Displayed in the chat widget header. Leave blank for default.
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
                      aria-label="Primary color hex value"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                    />
                    <div
                      className="h-10 flex-1 rounded-lg"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 10. Embed on Website */}
        {clinic && (
          <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("embed")}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Code className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm font-medium text-slate-900">Embed on Website</span>
                <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(getStatus("embed"))}`}>{sLabel(getStatus("embed"))}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openSections.has("embed") ? "rotate-180" : ""}`} />
            </button>
            {openSections.has("embed") && (
              <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500 mb-4">
                  Add the AI assistant widget to your website with a single line of code.
                </p>
                <div className="relative group">
                  <pre className="bg-slate-50 p-4 rounded-lg text-xs text-slate-700 overflow-x-auto border border-slate-200 whitespace-pre-wrap">
                    {`<script src="${globalThis.window === undefined ? '' : globalThis.location.origin}/widget.js" data-clinic="${clinic.slug}"></script>`}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<script src="${globalThis.window === undefined ? '' : globalThis.location.origin}/widget.js" data-clinic="${clinic.slug}"></script>`);
                      setSaveMessage("Embed code copied to clipboard!");
                      setTimeout(() => setSaveMessage(""), 3000);
                      globalThis.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="absolute top-3 right-3 p-2 text-slate-400 hover:text-teal-600 bg-white border border-slate-200 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4">
                  <a
                    href={`/chat/${clinic.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview chat widget
                  </a>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
