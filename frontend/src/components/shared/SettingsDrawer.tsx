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
import { Drawer } from "@/components/shared/Drawer";
import { api } from "@/lib/api";
import type { Clinic, FaqEntry, SheetsValidation } from "@/types";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** If set, auto-expand this section when the drawer opens */
  initialSection?: string | null;
}

export function SettingsDrawer({ open, onClose, initialSection }: SettingsDrawerProps) {
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
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
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
      setHours(typeof data.business_hours === "object" && data.business_hours ? data.business_hours : {});
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
    if (open) loadClinic();
  }, [open, loadClinic]);

  // Auto-expand the requested section when drawer opens
  useEffect(() => {
    if (open && initialSection) {
      setOpenSection(initialSection);
    }
  }, [open, initialSection]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const updated = await api.clinics.updateMyClinic({
        name, phone, email, address,
        greeting_message: greeting, fallback_message: fallback,
        services, business_hours: hours, faq,
        google_sheet_id: googleSheetId, google_sheet_tab: googleSheetTab,
        notifications_enabled: notificationsEnabled, notification_email: notificationEmail,
        availability_enabled: availabilityEnabled, availability_sheet_tab: availabilitySheetTab,
        assistant_name: assistantName, primary_color: primaryColor,
      });
      setClinic(updated);
      setSaveMessage("Settings saved successfully.");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const addService = () => { if (newService.trim()) { setServices([...services, newService.trim()]); setNewService(""); } };
  const removeService = (idx: number) => setServices(services.filter((_, i) => i !== idx));
  const addFaq = () => setFaq([...faq, { question: "", answer: "" }]);
  const updateFaq = (idx: number, field: "question" | "answer", value: string) => { const u = [...faq]; u[idx] = { ...u[idx], [field]: value }; setFaq(u); };
  const removeFaq = (idx: number) => setFaq(faq.filter((_, i) => i !== idx));

  const handleValidateSheets = async () => {
    if (!googleSheetId.trim()) return;
    setValidatingSheets(true);
    setSheetsValidation(null);
    try {
      const result = await api.clinics.validateSheets({ sheet_id: googleSheetId, tab_name: googleSheetTab, availability_tab: availabilityEnabled ? availabilitySheetTab : "" });
      setSheetsValidation(result);
    } catch {
      setSheetsValidation({ connected: false, tab_found: false, availability_tab_found: false, availability_headers_ok: false, error: "Failed to validate. Check your connection." });
    } finally {
      setValidatingSheets(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const result = await api.clinics.testNotification();
      setTestEmailResult(result.success ? { success: true, message: `Test email sent to ${result.email}` } : { success: false, message: result.error || "Failed to send test email." });
    } catch (err) {
      setTestEmailResult({ success: false, message: err instanceof Error ? err.message : "Failed to send test email." });
    } finally {
      setTestingEmail(false);
    }
  };

  // Status helpers
  const getStatus = (key: string): "completed" | "incomplete" | "not-configured" => {
    switch (key) {
      case "clinic-info": return name && phone && email && address ? "completed" : (name || phone || email || address) ? "incomplete" : "not-configured";
      case "assistant-messages": return greeting && fallback ? "completed" : (greeting || fallback) ? "incomplete" : "not-configured";
      case "services": return services.length > 0 ? "completed" : "not-configured";
      case "hours": return Object.values(hours).some(v => v?.trim()) ? "completed" : "not-configured";
      case "faq": return faq.length > 0 ? "completed" : "not-configured";
      case "google-sheets": return googleSheetId ? "completed" : "not-configured";
      case "email-notifications": return notificationsEnabled ? (notificationEmail ? "completed" : "incomplete") : "not-configured";
      case "scheduling": return availabilityEnabled ? "completed" : "not-configured";
      case "branding": return assistantName || primaryColor !== "#0d9488" ? "completed" : "not-configured";
      case "embed": return "completed";
      default: return "not-configured";
    }
  };

  /** Return human-readable list of missing fields for a section */
  const getMissing = (key: string): string[] => {
    switch (key) {
      case "clinic-info": {
        const m: string[] = [];
        if (!name) m.push("clinic name");
        if (!phone) m.push("phone number");
        if (!email) m.push("email address");
        if (!address) m.push("address");
        return m;
      }
      case "assistant-messages": {
        const m: string[] = [];
        if (!greeting) m.push("greeting message");
        if (!fallback) m.push("fallback message");
        return m;
      }
      case "services": return services.length === 0 ? ["at least one service"] : [];
      case "hours": return Object.values(hours).some(v => v?.trim()) ? [] : ["business hours"];
      case "faq": return faq.length === 0 ? ["at least one FAQ"] : [];
      case "google-sheets": return googleSheetId ? [] : ["Google Sheet ID"];
      case "email-notifications": {
        if (!notificationsEnabled) return ["enable notifications"];
        if (!notificationEmail) return ["notification email"];
        return [];
      }
      case "scheduling": return availabilityEnabled ? [] : ["enable scheduling"];
      case "branding": return assistantName || primaryColor !== "#0d9488" ? [] : ["assistant name or color"];
      default: return [];
    }
  };

  const sLabel = (s: "completed" | "incomplete" | "not-configured") => s === "completed" ? "Completed" : s === "incomplete" ? "Incomplete" : "Not configured";
  const sClass = (s: "completed" | "incomplete" | "not-configured") =>
    s === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s === "incomplete" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-500 border-slate-200";

  const sectionKeys = ["clinic-info", "assistant-messages", "services", "hours", "faq", "google-sheets", "email-notifications", "scheduling", "branding", "embed"];
  const completedCount = sectionKeys.filter(k => getStatus(k) === "completed").length;

  const saveButton = (
    <button
      onClick={handleSave}
      disabled={saving || loading}
      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      Save
    </button>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Settings"
      subtitle={loading ? "Loading…" : `${completedCount}/10 configured`}
      headerAction={saveButton}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-5">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          <button onClick={loadClinic} className="mt-3 text-sm font-medium text-teal-600 hover:text-teal-700">Retry</button>
        </div>
      ) : (
        <div className="p-4">
          {/* Progress bar */}
          <div className="mb-4">
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.round((completedCount / 10) * 100)}%` }} />
            </div>
          </div>

          {saveMessage && (
            <div className={`mb-3 p-3 text-sm rounded-lg border ${saveMessage.includes("success") || saveMessage.includes("copied") ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"}`}>
              {saveMessage}
            </div>
          )}

          <div className="space-y-1.5">
            {/* 1. Clinic Information */}
            <SectionRow icon={Building2} label="Clinic Information" sectionKey="clinic-info" status={getStatus("clinic-info")} missingFields={getMissing("clinic-info")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
              <p className="text-xs text-slate-500 mb-4">Your clinic&apos;s contact details shown to patients.</p>
              <div className="space-y-4">
                <Field label="Clinic Name" id="d-clinic-name" value={name} onChange={setName} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone" id="d-phone" value={phone} onChange={setPhone} placeholder="(555) 123-4567" type="tel" />
                  <Field label="Email" id="d-email" value={email} onChange={setEmail} placeholder="contact@clinic.com" type="email" />
                </div>
                <Field label="Address" id="d-address" value={address} onChange={setAddress} placeholder="123 Main St, Suite 100" />
              </div>
            </SectionRow>

            {/* 2. Assistant Messages */}
            <SectionRow icon={MessageCircle} label="Assistant Messages" sectionKey="assistant-messages" status={getStatus("assistant-messages")} missingFields={getMissing("assistant-messages")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
              <p className="text-xs text-slate-500 mb-4">Customize how your AI assistant greets patients.</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="d-greeting" className="block text-sm font-medium text-slate-700 mb-1.5">Greeting Message</label>
                  <textarea id="d-greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" />
                </div>
                <div>
                  <label htmlFor="d-fallback" className="block text-sm font-medium text-slate-700 mb-1.5">Fallback Message</label>
                  <textarea id="d-fallback" value={fallback} onChange={(e) => setFallback(e.target.value)} rows={2} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" />
                </div>
              </div>
            </SectionRow>

            {/* 3. Services */}
            <SectionRow icon={Stethoscope} label="Services" sectionKey="services" status={getStatus("services")} missingFields={getMissing("services")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
              <p className="text-xs text-slate-500 mb-4">List the services your clinic offers.</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {services.map((s) => (
                  <span key={`svc-${s}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm">
                    {s}
                    <button onClick={() => removeService(services.indexOf(s))} aria-label={`Remove ${s}`} className="text-teal-400 hover:text-teal-700"><Trash2 className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newService} onChange={(e) => setNewService(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }} className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Add a service" />
                <button onClick={addService} aria-label="Add service" className="px-3 py-2.5 text-sm font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
            </SectionRow>

            {/* 4. Business Hours */}
            <SectionRow icon={Clock} label="Business Hours" sectionKey="hours" status={getStatus("hours")} missingFields={getMissing("hours")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
              <p className="text-xs text-slate-500 mb-4">Set your clinic&apos;s hours.</p>
              <div className="space-y-2.5">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-medium text-slate-700 capitalize">{day}</span>
                    <input type="text" value={hours[day] || ""} onChange={(e) => setHours({ ...hours, [day]: e.target.value })} className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder='9:00 AM - 5:00 PM or "Closed"' />
                  </div>
                ))}
              </div>
            </SectionRow>

            {/* 5. FAQ */}
            <SectionRow icon={HelpCircle} label="FAQ" sectionKey="faq" status={getStatus("faq")} missingFields={getMissing("faq")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-slate-500">Questions the AI can answer.</p>
                <button onClick={addFaq} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors shrink-0 ml-4"><Plus className="w-3.5 h-3.5" /> Add</button>
              </div>
              {faq.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No FAQs added yet.</p>
              ) : (
                <div className="space-y-3">
                  {faq.map((item, i) => (
                    <div key={`faq-${i}-${item.question.slice(0, 20)}`} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-slate-500">FAQ #{i + 1}</span>
                        <button onClick={() => removeFaq(i)} aria-label={`Remove FAQ ${i + 1}`} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="space-y-2">
                        <input type="text" value={item.question} onChange={(e) => updateFaq(i, "question", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Question" />
                        <textarea value={item.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" placeholder="Answer" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionRow>

            {/* 6. Google Sheets */}
            <SectionRow icon={Sheet} label="Google Sheets" sectionKey="google-sheets" status={getStatus("google-sheets")} missingFields={getMissing("google-sheets")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
              <p className="text-xs text-slate-500 mb-4">
                Sync leads to Google Sheets. Share as <b>Editor</b> with: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 text-[10px] select-all">clinic-ai-bot@clinic-ai-491503.iam.gserviceaccount.com</code>
              </p>
              <div className="space-y-4">
                <Field label="Spreadsheet ID or URL" id="d-sheet-id" value={googleSheetId} onChange={setGoogleSheetId} placeholder="https://docs.google.com/spreadsheets/d/..." />
                <Field label="Tab / Sheet Name" id="d-sheet-tab" value={googleSheetTab} onChange={setGoogleSheetTab} placeholder="Sheet1" />
                {googleSheetId.trim() && (
                  <button onClick={handleValidateSheets} disabled={validatingSheets} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">
                    {validatingSheets ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sheet className="w-4 h-4" />} Test Connection
                  </button>
                )}
                {sheetsValidation && (
                  <div className={`p-3 rounded-lg border text-sm ${sheetsValidation.connected ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-start gap-2">
                      {sheetsValidation.connected ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                      <div className="space-y-0.5 text-xs">
                        {sheetsValidation.connected ? (
                          <>
                            <p className="font-medium text-emerald-800">Connected to &quot;{sheetsValidation.sheet_title}&quot;</p>
                            <p className="text-emerald-700">Leads tab ({googleSheetTab}): {sheetsValidation.tab_found ? "Found" : "Not found"}</p>
                            {availabilityEnabled && (
                              <p className="text-emerald-700">Availability tab: {!sheetsValidation.availability_tab_found ? "Not found" : sheetsValidation.availability_headers_ok ? "OK" : "Missing headers"}</p>
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
            </SectionRow>

            {/* 7. Email Notifications */}
            <SectionRow icon={Send} label="Email Notifications" sectionKey="email-notifications" status={getStatus("email-notifications")} missingFields={getMissing("email-notifications")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
              <p className="text-xs text-slate-500 mb-4">Get notified when new leads arrive.</p>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${notificationsEnabled ? "bg-indigo-500" : "bg-slate-200"}`} />
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notificationsEnabled ? "translate-x-4" : ""}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Enable notifications</span>
                </label>
                {notificationsEnabled && (
                  <div className="pt-1 space-y-3">
                    <Field label="Notification Email" id="d-notif-email" value={notificationEmail} onChange={setNotificationEmail} type="email" placeholder="doctor@clinic.com" />
                    <div>
                      <button onClick={handleTestEmail} disabled={testingEmail} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors">
                        {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Test
                      </button>
                      {testEmailResult && <p className={`mt-2 text-xs ${testEmailResult.success ? "text-emerald-600" : "text-red-600"}`}>{testEmailResult.message}</p>}
                    </div>
                  </div>
                )}
              </div>
            </SectionRow>

            {/* 8. Availability */}
            <SectionRow icon={Calendar} label="Availability & Scheduling" sectionKey="scheduling" status={getStatus("scheduling")} missingFields={getMissing("scheduling")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
              <p className="text-xs text-slate-500 mb-4">Offer real-time appointment slots via Google Sheets.</p>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={availabilityEnabled} onChange={(e) => setAvailabilityEnabled(e.target.checked)} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${availabilityEnabled ? "bg-teal-500" : "bg-slate-200"}`} />
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${availabilityEnabled ? "translate-x-4" : ""}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Enable scheduling</span>
                </label>
                {availabilityEnabled && (
                  <div className="pt-1 space-y-3">
                    <Field label="Availability Tab Name" id="d-avail-tab" value={availabilitySheetTab} onChange={setAvailabilitySheetTab} placeholder="Availability" />
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-100 text-[10px] text-teal-700">
                      <p className="font-bold text-teal-800 uppercase tracking-wider mb-1">Required Headers</p>
                      <code className="block font-mono bg-white/80 p-1.5 rounded border border-teal-200/50 text-teal-900 select-all">Date | Time | Status | Patient Name | Lead ID</code>
                    </div>
                  </div>
                )}
              </div>
            </SectionRow>

            {/* 9. Branding */}
            <SectionRow icon={Palette} label="Branding" sectionKey="branding" status={getStatus("branding")} missingFields={getMissing("branding")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
              <p className="text-xs text-slate-500 mb-4">Customize the chat widget appearance.</p>
              <div className="space-y-4">
                <Field label="Assistant Name" id="d-asst-name" value={assistantName} onChange={setAssistantName} placeholder='"Sarah from Smile Dental"' />
                <div>
                  <span className="block text-sm font-medium text-slate-700 mb-1.5">Primary Color</span>
                  <div className="flex items-center gap-3">
                    <input type="color" aria-label="Choose primary color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                    <input type="text" aria-label="Primary color hex value" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono" />
                    <div className="h-10 flex-1 rounded-lg" style={{ backgroundColor: primaryColor }} />
                  </div>
                </div>
              </div>
            </SectionRow>

            {/* 10. Embed */}
            {clinic && (
              <SectionRow icon={Code} label="Embed on Website" sectionKey="embed" status={getStatus("embed")} missingFields={getMissing("embed")} sLabel={sLabel} sClass={sClass} openSection={openSection} toggle={toggleSection}>
                <p className="text-xs text-slate-500 mb-4">Add the chat widget to your site.</p>
                <div className="relative group">
                  <pre className="bg-slate-50 p-3 rounded-lg text-[10px] text-slate-700 overflow-x-auto border border-slate-200 whitespace-pre-wrap">
                    {`<script src="${typeof window === "undefined" ? "" : window.location.origin}/widget.js" data-clinic="${clinic.slug}"></script>`}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<script src="${window.location.origin}/widget.js" data-clinic="${clinic.slug}"></script>`);
                      setSaveMessage("Embed code copied!");
                      setTimeout(() => setSaveMessage(""), 3000);
                    }}
                    className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-teal-600 bg-white border border-slate-200 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-3">
                  <a href={`/chat/${clinic.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors">
                    <ExternalLink className="w-4 h-4" /> Preview chat widget
                  </a>
                </div>
              </SectionRow>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

/* ── Reusable sub-components ── */

function SectionRow({
  icon: Icon,
  label,
  sectionKey,
  status,
  missingFields,
  sLabel,
  sClass,
  openSection,
  toggle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sectionKey: string;
  status: "completed" | "incomplete" | "not-configured";
  missingFields?: string[];
  sLabel: (s: "completed" | "incomplete" | "not-configured") => string;
  sClass: (s: "completed" | "incomplete" | "not-configured") => string;
  openSection: string | null;
  toggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = openSection === sectionKey;
  const hasMissing = missingFields && missingFields.length > 0;
  return (
    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => toggle(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <Icon className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-900">{label}</span>
          <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${sClass(status)}`}>{sLabel(status)}</span>
          {hasMissing && !isOpen && (
            <span className="text-[11px] text-amber-600 truncate max-w-[180px]">Missing {missingFields.join(", ")}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          {children}
        </div>
      )}
    </section>
  );
}

function Field({ label, id, value, onChange, placeholder, type = "text" }: {
  label: string; id: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder={placeholder} />
    </div>
  );
}
