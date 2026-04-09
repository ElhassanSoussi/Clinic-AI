"use client";

import {
  useEffect,
  useState,
  useCallback,
  type ComponentType,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
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
  ChevronRight,
  Building2,
  MessageCircle,
  Stethoscope,
  Clock,
  HelpCircle,
  Code,
  Sparkles,
  Settings,
  Rocket,
} from "lucide-react";
import { api } from "@/lib/api";
import { getPublicSiteUrl } from "@/lib/env";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { GoLiveModals } from "@/components/shared/GoLiveModals";
import { computeSystemStatus, STATUS_CONFIG } from "@/lib/system-status";
import type { Clinic, FaqEntry, SheetsValidation } from "@/types";
import { isSafeExternalUrl, setupProgressPercent } from "@/lib/utils";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

type SectionStatus = "completed" | "incomplete" | "not-configured";

type SettingsStatusInput = {
  name: string;
  phone: string;
  email: string;
  address: string;
  greeting: string;
  fallback: string;
  services: string[];
  hours: Record<string, string>;
  faq: FaqEntry[];
  googleSheetId: string;
  excelWorkbookId: string;
  notificationsEnabled: boolean;
  notificationEmail: string;
  availabilityEnabled: boolean;
  assistantName: string;
  primaryColor: string;
  isLive: boolean;
};

const SETTINGS_STATUS_RESOLVERS: Record<string, (state: SettingsStatusInput) => SectionStatus> = {
  "clinic-info": (state) => partialCompletionStatus([state.name, state.phone, state.email, state.address]),
  "assistant-messages": (state) => partialCompletionStatus([state.greeting, state.fallback]),
  services: (state) => (state.services.length > 0 ? "completed" : "not-configured"),
  hours: (state) => (Object.values(state.hours).some((value) => value?.trim()) ? "completed" : "not-configured"),
  faq: (state) => (state.faq.length > 0 ? "completed" : "not-configured"),
  "google-sheets": (state) => (state.googleSheetId || state.excelWorkbookId ? "completed" : "not-configured"),
  "email-notifications": (state) => {
    if (state.notificationsEnabled === false) return "not-configured";
    return state.notificationEmail ? "completed" : "incomplete";
  },
  scheduling: (state) => (state.availabilityEnabled ? "completed" : "not-configured"),
  branding: (state) => (state.assistantName || state.primaryColor !== "#0d9488" ? "completed" : "not-configured"),
  embed: (state) => (state.isLive ? "completed" : "incomplete"),
};

const SETTINGS_MODULES: ReadonlyArray<{
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  group: "Foundation" | "Knowledge" | "Channels" | "Go live";
}> = [
  { key: "clinic-info", label: "Clinic information", icon: Building2, group: "Foundation" },
  { key: "assistant-messages", label: "Assistant messages", icon: MessageCircle, group: "Foundation" },
  { key: "services", label: "Services", icon: Stethoscope, group: "Knowledge" },
  { key: "hours", label: "Business hours", icon: Clock, group: "Knowledge" },
  { key: "faq", label: "FAQ", icon: HelpCircle, group: "Knowledge" },
  { key: "google-sheets", label: "Spreadsheets", icon: Sheet, group: "Channels" },
  { key: "email-notifications", label: "Email notifications", icon: Send, group: "Channels" },
  { key: "scheduling", label: "Scheduling", icon: Calendar, group: "Channels" },
  { key: "branding", label: "Branding", icon: Palette, group: "Go live" },
  { key: "embed", label: "Embed", icon: Code, group: "Go live" },
];

function partialCompletionStatus(values: Array<string | boolean>): SectionStatus {
  const hasAnyValue = values.some(Boolean);
  if (hasAnyValue === false) return "not-configured";
  return values.every(Boolean) ? "completed" : "incomplete";
}

function getSectionStatus(key: string, state: SettingsStatusInput): SectionStatus {
  return SETTINGS_STATUS_RESOLVERS[key]?.(state) ?? "not-configured";
}

function sectionStatusLabel(status: SectionStatus): string {
  if (status === "completed") return "Completed";
  if (status === "incomplete") return "Incomplete";
  return "Not configured";
}

function sectionStatusClass(status: SectionStatus): string {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "incomplete") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]";
}

function availabilityValidationLabel(validation: SheetsValidation): string {
  if (!validation.availability_tab_found) return "Not found";
  if (validation.availability_headers_ok) return "Found with correct headers";
  return "Found but missing required headers";
}

function SettingsSection({
  sectionKey,
  label,
  icon: Icon,
  openSections,
  toggleSection,
  statusState,
  children,
}: Readonly<{
  sectionKey: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  openSections: Set<string>;
  toggleSection: (id: string) => void;
  statusState: SettingsStatusInput;
  children: ReactNode;
}>) {
  const isOpen = openSections.has(sectionKey);
  const status = getSectionStatus(sectionKey, statusState);

  return (
    <section id={`settings-section-${sectionKey}`} className="ds-card overflow-hidden">
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="ds-card-header flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--color-app-canvas)] sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] text-[var(--color-app-primary-hover)] shadow-sm">
            <Icon className="h-4 w-4" />
          </span>
          <span className="ds-section-title text-[1rem]">{label}</span>
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${sectionStatusClass(status)}`}>
            {sectionStatusLabel(status)}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform shrink-0 ml-3 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && children}
    </section>
  );
}

function ClinicInformationSectionContent({
  name,
  setName,
  phone,
  setPhone,
  email,
  setEmail,
  address,
  setAddress,
}: Readonly<{
  name: string;
  setName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
}>) {
  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <p className="ds-help-text mb-4">
        Shown on the public chat page (contact strip) and used when the assistant references your clinic. Accurate phone
        and hours reduce wrong answers and unnecessary callbacks.
      </p>
      <div className="space-y-4">
        <div>
          <label htmlFor="clinic-name" className="block text-sm font-medium text-[#0F172A] mb-1.5">
            Clinic Name
          </label>
          <input
            id="clinic-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="clinic-phone" className="block text-sm font-medium text-[#0F172A] mb-1.5">
              Phone
            </label>
            <input
              id="clinic-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label htmlFor="clinic-email" className="block text-sm font-medium text-[#0F172A] mb-1.5">
              Email
            </label>
            <input
              id="clinic-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
              placeholder="contact@clinic.com"
            />
          </div>
        </div>
        <div>
          <label htmlFor="clinic-address" className="block text-sm font-medium text-[#0F172A] mb-1.5">
            Address
          </label>
          <input
            id="clinic-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
            placeholder="123 Main St, Suite 100, City, State, ZIP"
          />
        </div>
      </div>
    </div>
  );
}

function AssistantMessagesSectionContent({
  greeting,
  setGreeting,
  fallback,
  setFallback,
}: Readonly<{
  greeting: string;
  setGreeting: (value: string) => void;
  fallback: string;
  setFallback: (value: string) => void;
}>) {
  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <p className="ds-help-text mb-4">
        These messages are injected by the assistant when patients send a simple greeting (including the first hidden handshake) and when the assistant has no confident answer. They are not a substitute for clinical advice.
      </p>
      <div className="space-y-4">
        <div>
          <label htmlFor="greeting" className="block text-sm font-medium text-[#0F172A] mb-1.5">
            Greeting Message
          </label>
          <p className="ds-help-text mb-1.5">
            Used for short greetings. If empty, the assistant uses a sensible default with your clinic name.
          </p>
          <textarea
            id="greeting"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1] resize-none"
          />
        </div>
        <div>
          <label htmlFor="fallback" className="block text-sm font-medium text-[#0F172A] mb-1.5">
            Fallback Message
          </label>
          <p className="ds-help-text mb-1.5">
            Shown when the assistant cannot answer from your FAQs, services, hours, and configured knowledge — instead of guessing.
          </p>
          <textarea
            id="fallback"
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1] resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function ServicesSectionContent({
  services,
  newService,
  setNewService,
  addService,
  removeService,
}: Readonly<{
  services: string[];
  newService: string;
  setNewService: (value: string) => void;
  addService: () => void;
  removeService: (idx: number) => void;
}>) {
  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <p className="ds-help-text mb-4">The assistant uses this list to answer patient questions about what your clinic offers. Only services listed here will be mentioned.</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {services.map((service, index) => (
          <span
            key={`svc-${service}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#CCFBF1] text-[#115E59] rounded-full text-sm"
          >
            {service}
            <button
              onClick={() => removeService(index)}
              aria-label={`Remove ${service}`}
              className="text-teal-400 hover:text-[#115E59]"
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
          className="flex-1 px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
          placeholder="Add a service (e.g., General Checkup)"
        />
        <button
          onClick={addService}
          aria-label="Add service"
          className="px-3 py-2.5 text-sm font-medium text-[#0F766E] border border-[#99f6e4] rounded-lg hover:bg-[#CCFBF1] transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function BusinessHoursSectionContent({
  hours,
  setHours,
}: Readonly<{
  hours: Record<string, string>;
  setHours: Dispatch<SetStateAction<Record<string, string>>>;
}>) {
  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <p className="ds-help-text mb-4">The assistant references these hours when patients ask about availability. Keep them current to avoid incorrect information.</p>
      <div className="space-y-3">
        {DAYS.map((day) => (
          <div key={day} className="flex items-center gap-3">
            <span className="w-24 text-sm font-medium text-[#0F172A] capitalize">
              {day}
            </span>
            <input
              type="text"
              value={hours[day] || ""}
              onChange={(e) =>
                setHours({ ...hours, [day]: e.target.value })
              }
              className="flex-1 px-3.5 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
              placeholder='e.g., 9:00 AM - 5:00 PM or "Closed"'
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqSectionContent({
  faq,
  addFaq,
  updateFaq,
  removeFaq,
}: Readonly<{
  faq: FaqEntry[];
  addFaq: () => void;
  updateFaq: (idx: number, field: "question" | "answer", value: string) => void;
  removeFaq: (idx: number) => void;
}>) {
  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="ds-help-text min-w-0 flex-1 pr-3">
          Common questions the assistant can answer directly instead of holding for staff.
        </p>
        <button
          onClick={addFaq}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0F766E] border border-[#99f6e4] rounded-lg hover:bg-[#CCFBF1] transition-colors shrink-0 ml-4"
        >
          <Plus className="w-4 h-4" />
          Add FAQ
        </button>
      </div>
      {faq.length === 0 ? (
        <p className="text-sm text-[#64748B] text-center py-6">
          No FAQs added yet. Add common questions so the assistant can answer them directly.
        </p>
      ) : (
        <div className="space-y-4">
          {faq.map((item, index) => (
            <div
              key={`faq-${index}-${item.question.slice(0, 20)}`}
              className="p-4 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium text-[#64748B]">
                  FAQ #{index + 1}
                </span>
                <button
                  onClick={() => removeFaq(index)}
                  aria-label={`Remove FAQ ${index + 1}`}
                  className="text-[#64748B] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => updateFaq(index, "question", e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                  placeholder="Question (e.g., Do you accept insurance?)"
                />
                <textarea
                  value={item.answer}
                  onChange={(e) => updateFaq(index, "answer", e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1] resize-none"
                  placeholder="Answer"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoogleSheetsSectionContent({
  googleSheetId,
  setGoogleSheetId,
  googleSheetTab,
  setGoogleSheetTab,
  handleValidateSheets,
  validatingSheets,
  sheetsValidation,
  availabilityEnabled,
  availabilitySheetTab,
  connectingGoogle,
  startGoogleConnect,
  googleConnectMessage,
  googleConnectTone,
  excelWorkbookId,
  excelWorkbookUrl,
  connectingExcel,
  startMicrosoftConnect,
  excelConnectMessage,
  excelConnectTone,
  showManualSetup,
  setShowManualSetup,
}: Readonly<{
  googleSheetId: string;
  setGoogleSheetId: (value: string) => void;
  googleSheetTab: string;
  setGoogleSheetTab: (value: string) => void;
  handleValidateSheets: () => Promise<void>;
  validatingSheets: boolean;
  sheetsValidation: SheetsValidation | null;
  availabilityEnabled: boolean;
  availabilitySheetTab: string;
  connectingGoogle: boolean;
  startGoogleConnect: () => Promise<void>;
  googleConnectMessage: string;
  googleConnectTone: "success" | "error" | "";
  excelWorkbookId: string;
  excelWorkbookUrl: string;
  connectingExcel: boolean;
  startMicrosoftConnect: () => Promise<void>;
  excelConnectMessage: string;
  excelConnectTone: "success" | "error" | "";
  showManualSetup: boolean;
  setShowManualSetup: Dispatch<SetStateAction<boolean>>;
}>) {
  const connectedSheetUrl = googleSheetId
    ? `https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`
    : "";

  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <div className="space-y-6">
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-emerald-800 mb-1">
                Google Sheets quick connect
              </h4>
              <p className="text-sm text-emerald-700">
                Sign in with Google and let Clinic AI create a starter spreadsheet for your clinic automatically.
              </p>
            </div>
            <Sheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          </div>
          <button
            onClick={startGoogleConnect}
            disabled={connectingGoogle}
            className="mt-4 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {connectingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Connect with Google
          </button>
          {googleConnectMessage ? (
            <p
              className={`mt-3 text-sm ${googleConnectTone === "error" ? "text-red-700" : "text-emerald-800"
                }`}
            >
              {googleConnectMessage}
            </p>
          ) : null}
          {googleSheetId ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-emerald-800">
              Google Sheets is connected.
              <div className="mt-2 flex flex-wrap gap-3">
                <code className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-900">{googleSheetId}</code>
                <a
                  href={connectedSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Open sheet
                </a>
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-4 rounded-xl border border-[#E2E8F0] bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[#0F172A] mb-1">Microsoft Excel</h4>
              <p className="text-sm text-[#475569]">
                Sign in with Microsoft and let Clinic AI create a starter Excel workbook in your OneDrive automatically.
              </p>
            </div>
            <Sheet className="w-5 h-5 text-[#475569] shrink-0 mt-0.5" />
          </div>
          <button
            onClick={startMicrosoftConnect}
            disabled={connectingExcel}
            className="mt-4 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#334155] disabled:opacity-50"
          >
            {connectingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Connect with Microsoft
          </button>
          {excelConnectMessage ? (
            <p
              className={`mt-3 text-sm ${excelConnectTone === "error" ? "text-red-700" : "text-[#0F172A]"
                }`}
            >
              {excelConnectMessage}
            </p>
          ) : null}
          {excelWorkbookId ? (
            <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#0F172A]">
              Microsoft Excel is connected.
              {excelWorkbookUrl ? (
                <div className="mt-2">
                  <a
                    href={excelWorkbookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#0F172A] hover:text-[#0F172A]"
                  >
                    Open workbook
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            onClick={() => setShowManualSetup((current) => !current)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <h4 className="text-sm font-semibold text-[#0F172A]">Advanced manual setup</h4>
              <p className="ds-help-text mt-1">
                Use your own spreadsheet ID if you do not want quick connect.
              </p>
            </div>
            <ChevronRight className={`w-4 h-4 text-[#64748B] transition-transform ${showManualSetup ? "rotate-90" : ""}`} />
          </button>

          {showManualSetup ? (
            <div className="border-t border-[#E2E8F0] px-3.5 py-3 space-y-4 bg-white rounded-b-xl">
              <p className="ds-help-text">
                If you prefer manual setup, share your sheet as <b>Editor</b> with{" "}
                <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-[#0F172A] select-all">
                  clinic-ai-bot@clinic-ai-491503.iam.gserviceaccount.com
                </code>
                {" "}and paste the sheet URL below.
              </p>
              <div>
                <label htmlFor="google-sheet-id" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                  Spreadsheet ID or URL
                </label>
                <input
                  id="google-sheet-id"
                  type="text"
                  value={googleSheetId}
                  onChange={(e) => setGoogleSheetId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRYFa..."
                />
              </div>
              <div>
                <label htmlFor="google-sheet-tab" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                  Tab / Sheet Name
                </label>
                <input
                  id="google-sheet-tab"
                  type="text"
                  value={googleSheetTab}
                  onChange={(e) => setGoogleSheetTab(e.target.value)}
                  className="w-full sm:max-w-xs px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                  placeholder="Sheet1"
                />
              </div>
              {googleSheetId.trim() && (
                <button
                  onClick={handleValidateSheets}
                  disabled={validatingSheets}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] disabled:opacity-50"
                >
                  {validatingSheets ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sheet className="w-4 h-4" />
                  )}
                  Test connection
                </button>
              )}
              {sheetsValidation && (
                <div
                  className={`p-4 rounded-lg border ${sheetsValidation.connected
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
                              {availabilityValidationLabel(sheetsValidation)}
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmailNotificationsSectionContent({
  notificationsEnabled,
  setNotificationsEnabled,
  notificationEmail,
  setNotificationEmail,
  handleTestEmail,
  testingEmail,
  testEmailResult,
}: Readonly<{
  notificationsEnabled: boolean;
  setNotificationsEnabled: Dispatch<SetStateAction<boolean>>;
  notificationEmail: string;
  setNotificationEmail: (value: string) => void;
  handleTestEmail: () => Promise<void>;
  testingEmail: boolean;
  testEmailResult: { success: boolean; message: string } | null;
}>) {
  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <p className="ds-help-text mb-4">Receive an email alert each time the assistant captures a new patient request, so nothing is missed.</p>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
            />
            <div className={`block w-10 h-6 rounded-full transition-colors ${notificationsEnabled ? "bg-[#0F766E]" : "bg-[#E2E8F0]"}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notificationsEnabled ? "translate-x-4" : ""}`}></div>
          </div>
          <span className="text-sm font-medium text-[#0F172A]">Enable new lead notifications</span>
        </label>
        {notificationsEnabled && (
          <div className="pt-2 space-y-3">
            <div>
              <label htmlFor="notification-email" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Notification Email Address
              </label>
              <input
                id="notification-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                className="w-full sm:max-w-md px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                placeholder="doctor@clinic.com (defaults to your account email if empty)"
              />
            </div>
            <div>
              <button
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0F766E] border border-[#99f6e4] rounded-lg hover:bg-[#CCFBF1] disabled:opacity-50 transition-colors"
              >
                {testingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send test email
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
  );
}

function SchedulingSectionContent({
  availabilityEnabled,
  setAvailabilityEnabled,
  availabilitySheetTab,
  setAvailabilitySheetTab,
}: Readonly<{
  availabilityEnabled: boolean;
  setAvailabilityEnabled: Dispatch<SetStateAction<boolean>>;
  availabilitySheetTab: string;
  setAvailabilitySheetTab: (value: string) => void;
}>) {
  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <p className="ds-help-text mb-4">
        When enabled, the assistant can offer slots from an <span className="font-medium text-[#0F172A]">Availability</span> tab in the same spreadsheet you connected (Google Sheets or the workbook from Microsoft Excel quick connect).
      </p>
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={availabilityEnabled}
              onChange={(e) => setAvailabilityEnabled(e.target.checked)}
            />
            <div className={`block w-10 h-6 rounded-full transition-colors ${availabilityEnabled ? "bg-[#0F766E]" : "bg-[#E2E8F0]"}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${availabilityEnabled ? "translate-x-4" : ""}`}></div>
          </div>
          <span className="text-sm font-medium text-[#0F172A]">Enable guided scheduling from spreadsheet availability</span>
        </label>
        {availabilityEnabled && (
          <div className="pt-2 space-y-4">
            <div>
              <label htmlFor="availability-tab" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                Availability tab name
              </label>
              <input
                id="availability-tab"
                type="text"
                value={availabilitySheetTab}
                onChange={(e) => setAvailabilitySheetTab(e.target.value)}
                className="w-full sm:max-w-md px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                placeholder="e.g., Availability"
              />
              <p className="ds-muted-text mt-1.5">
                Default is <span className="font-medium text-[#475569]">Availability</span>. Use &ldquo;Test connection&rdquo; under Spreadsheets to verify headers when using Google Sheets.
              </p>
            </div>
            <div className="p-4 bg-[#CCFBF1] rounded-lg border border-[#99f6e4]">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#115E59]">
                Required sheet format
              </h4>
              <p className="text-sm font-medium leading-relaxed text-[#115E59]">
                Your tab must have these headers in the first row:
              </p>
              <code className="block mt-2 font-mono text-xs bg-white/80 p-2 rounded border border-[#99f6e4]/50 text-[#115E59] select-all">
                Date | Time | Status | Patient Name | Lead ID
              </code>
              <div className="mt-3 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-[#0F766E] mt-1.5 shrink-0" />
                <p className="text-sm text-[#0F766E]">Only rows with Status = <span className="font-bold">available</span> will be shown to patients.</p>
              </div>
              <div className="mt-1 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-[#0F766E] mt-1.5 shrink-0" />
                <p className="text-sm text-[#0F766E]">
                  The assistant walks patients through the booking steps; your team confirms details in the dashboard.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandingSectionContent({
  assistantName,
  setAssistantName,
  primaryColor,
  setPrimaryColor,
}: Readonly<{
  assistantName: string;
  setAssistantName: (value: string) => void;
  primaryColor: string;
  setPrimaryColor: (value: string) => void;
}>) {
  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <p className="ds-help-text mb-4">
        Applies to the public patient page and embed widget header (<span className="font-medium text-[#0F172A]">/chat/your-clinic-slug</span>). Your clinic name still appears in context when it differs from the assistant name.
      </p>
      <div className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="assistant-name" className="block text-sm font-medium text-[#0F172A] mb-1.5">
            Assistant Name
          </label>
          <input
            id="assistant-name"
            type="text"
            value={assistantName}
            onChange={(e) => setAssistantName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
            placeholder='e.g., "Sarah from Smile Dental"'
          />
          <p className="ds-muted-text mt-1">
            Shown as the title in the chat header. Leave blank to use a short default label.
          </p>
        </div>
        <div>
          <span className="block text-sm font-medium text-[#0F172A] mb-1.5">
            Primary Color
          </span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              aria-label="Choose primary color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded-lg border border-[#E2E8F0] cursor-pointer p-0.5"
            />
            <input
              type="text"
              aria-label="Primary color hex value"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-28 px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg font-mono"
            />
            <div className="settings-color-preview h-10 flex-1 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmbedSectionContent({
  clinic,
  embedCode,
  setSaveMessage,
  isLive,
}: Readonly<{
  clinic: Clinic;
  embedCode: string;
  setSaveMessage: Dispatch<SetStateAction<string>>;
  isLive: boolean;
}>) {
  return (
    <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
      <p className="ds-help-text mb-4">
        Add this snippet to your site to load the same patient experience as{" "}
        <span className="font-medium text-[#0F172A]">/chat/{clinic.slug}</span>. The assistant only uses data you save
        here. Until you go live, patients still see a clear &ldquo;not live&rdquo; state on the public page.
      </p>
      {!isLive ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          Your clinic is not live yet — embed this anytime for staging, but expect the public chat to show a not-live notice until you go live from Settings or the dashboard header.
        </div>
      ) : null}
      <div className="relative group">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#0F172A]">
          {embedCode}
        </pre>
        <button
          onClick={() => {
            navigator.clipboard.writeText(embedCode);
            setSaveMessage("Embed code copied to clipboard!");
            setTimeout(() => setSaveMessage(""), 3000);
            globalThis.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="absolute top-3 right-3 p-2 text-[#64748B] hover:text-[#0F766E] bg-white border border-[#E2E8F0] rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all"
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
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0F766E] hover:text-[#115E59] transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open public patient chat (new tab)
        </a>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
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
  const [excelWorkbookId, setExcelWorkbookId] = useState("");
  const [excelWorkbookUrl, setExcelWorkbookUrl] = useState("");
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
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleConnectMessage, setGoogleConnectMessage] = useState("");
  const [googleConnectTone, setGoogleConnectTone] = useState<"success" | "error" | "">("");
  const [connectingExcel, setConnectingExcel] = useState(false);
  const [excelConnectMessage, setExcelConnectMessage] = useState("");
  const [excelConnectTone, setExcelConnectTone] = useState<"success" | "error" | "">("");
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [queryParams, setQueryParams] = useState<URLSearchParams | null>(null);
  const [goLiveModalOpen, setGoLiveModalOpen] = useState(false);
  const [goLiveLoading, setGoLiveLoading] = useState(false);
  const [goLiveSuccess, setGoLiveSuccess] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const focusSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (globalThis.window === undefined) return;
    globalThis.requestAnimationFrame(() => {
      const node = globalThis.document.getElementById(`settings-section-${id}`);
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

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
      setExcelWorkbookId(data.excel_workbook_id || "");
      setExcelWorkbookUrl(data.excel_workbook_url || "");
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

  useEffect(() => {
    if (globalThis.window === undefined) return;
    setQueryParams(new URLSearchParams(globalThis.location.search));
  }, []);

  useEffect(() => {
    const section = queryParams?.get("section");
    if (section) {
      setOpenSections((current) => {
        const next = new Set(current);
        next.add(section);
        return next;
      });
    }
  }, [queryParams]);

  useEffect(() => {
    const connected = queryParams?.get("google_sheets_connected");
    const errorValue = queryParams?.get("google_sheets_error");
    const excelConnected = queryParams?.get("excel_connected");
    const excelError = queryParams?.get("excel_connect_error");
    if (!connected && !errorValue && !excelConnected && !excelError) {
      return;
    }

    setOpenSections((current) => {
      const next = new Set(current);
      next.add("google-sheets");
      return next;
    });

    if (connected === "1") {
      setGoogleConnectTone("success");
      setGoogleConnectMessage("Google Sheets connected. Your starter sheet is ready.");
      void loadClinic();
    } else if (errorValue) {
      setGoogleConnectTone("error");
      setGoogleConnectMessage(errorValue);
    }
    if (excelConnected === "1") {
      setExcelConnectTone("success");
      setExcelConnectMessage("Microsoft Excel connected. Your starter workbook is ready.");
      void loadClinic();
    } else if (excelError) {
      setExcelConnectTone("error");
      setExcelConnectMessage(excelError);
    }

    const nextParams = new URLSearchParams(queryParams?.toString() || "");
    nextParams.delete("google_sheets_connected");
    nextParams.delete("google_sheet_id");
    nextParams.delete("google_sheets_error");
    nextParams.delete("excel_connected");
    nextParams.delete("excel_workbook_id");
    nextParams.delete("excel_connect_error");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/dashboard/settings?${nextQuery}` : "/dashboard/settings");
    setQueryParams(nextParams);
  }, [loadClinic, queryParams, router]);

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

  const startGoogleConnect = async () => {
    setConnectingGoogle(true);
    setGoogleConnectMessage("");
    setGoogleConnectTone("");

    try {
      const result = await api.clinics.startGoogleSheetsConnect({
        return_to: "/dashboard/settings?section=google-sheets",
        tab_name: googleSheetTab || "Leads",
        availability_enabled: availabilityEnabled,
        availability_tab: availabilitySheetTab || "Availability",
      });

      if (!result.available || !result.authorization_url) {
        setGoogleConnectTone("error");
        setGoogleConnectMessage(result.detail || "Google Sheets quick connect is not available yet.");
        return;
      }

      if (!isSafeExternalUrl(result.authorization_url)) {
        setGoogleConnectTone("error");
        setGoogleConnectMessage("Invalid authorization URL returned by server.");
        return;
      }

      globalThis.location.assign(result.authorization_url);
    } catch (err) {
      setGoogleConnectTone("error");
      setGoogleConnectMessage(err instanceof Error ? err.message : "Google Sheets quick connect failed.");
    } finally {
      setConnectingGoogle(false);
    }
  };

  const startMicrosoftConnect = async () => {
    setConnectingExcel(true);
    setExcelConnectMessage("");
    setExcelConnectTone("");

    try {
      const result = await api.clinics.startMicrosoftExcelConnect({
        return_to: "/dashboard/settings?section=google-sheets",
        tab_name: googleSheetTab || "Leads",
        availability_enabled: availabilityEnabled,
        availability_tab: availabilitySheetTab || "Availability",
      });

      if (!result.available || !result.authorization_url) {
        setExcelConnectTone("error");
        setExcelConnectMessage(result.detail || "Microsoft Excel quick connect is not available yet.");
        return;
      }

      if (!isSafeExternalUrl(result.authorization_url)) {
        setExcelConnectTone("error");
        setExcelConnectMessage("Invalid authorization URL returned by server.");
        return;
      }

      globalThis.location.assign(result.authorization_url);
    } catch (err) {
      setExcelConnectTone("error");
      setExcelConnectMessage(err instanceof Error ? err.message : "Microsoft Excel quick connect failed.");
    } finally {
      setConnectingExcel(false);
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

  if (loading) return <LoadingState message="Loading settings..." detail="Clinic configuration" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={loadClinic} />;
  const statusState: SettingsStatusInput = {
    name,
    phone,
    email,
    address,
    greeting,
    fallback,
    services,
    hours,
    faq,
    googleSheetId,
    excelWorkbookId,
    notificationsEnabled,
    notificationEmail,
    availabilityEnabled,
    assistantName,
    primaryColor,
    isLive: !!clinic?.is_live,
  };
  const systemStatus = clinic ? computeSystemStatus(clinic) : null;
  const systemStatusCfg = systemStatus ? STATUS_CONFIG[systemStatus.status] : null;

  const jumpToFirstSetupGap = () => {
    if (!systemStatus) return;
    const first = systemStatus.items.find((item) => !item.completed);
    if (first) {
      setOpenSections((prev) => new Set(prev).add(first.drawerSection));
    }
  };

  const setupSectionKeys = [
    "clinic-info", "assistant-messages", "services", "hours", "faq",
    "google-sheets", "email-notifications", "scheduling", "branding", "embed",
  ] as const;
  const completedCount = setupSectionKeys.filter((key) => getSectionStatus(key, statusState) === "completed").length;
  const progressWidth = `${setupProgressPercent(completedCount, setupSectionKeys.length)}%`;
  const embedCode = `<script src="${getPublicSiteUrl()}/widget.js" data-clinic="${clinic?.slug || ""}"></script>`;

  return (
    <div className="workspace-page">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <Settings className="h-3.5 w-3.5" />
            Clinic setup and configuration
          </>
        }
        title="Clinic settings"
        description="A configuration console: identity, channels, knowledge sources, embed readiness, and go-live—grouped into modules so setup feels sequential, not like one endless form."
      />
      <div className="wave-settings-deck settings-control-shell space-y-6">
        {clinic ? (
          <div className="ds-control-hero-panel workspace-command-hero relative p-5 sm:p-6">
            <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="workspace-section-label">Assistant visibility</p>
                <h2 className="mt-2 text-lg font-semibold text-[#0F172A]">Patient chat &amp; embed</h2>
                <p className="mt-1.5 text-sm leading-6 text-[#475569]">
                  Public page{" "}
                  <span className="font-mono text-sm text-[#0F172A]">
                    /chat/{clinic.slug?.trim() ? clinic.slug : "your-clinic-slug"}
                  </span>
                  {" — "}matches your saved clinic name, assistant name, accent color, hours, and phone on the patient
                  surface after you click &ldquo;Save settings.&rdquo;
                  {systemStatus?.status === "READY" && !clinic.is_live
                    ? " Your dashboard checklist is complete — go live when you want the assistant to show as active for patients."
                    : null}
                </p>
                {!clinic.is_live && systemStatus && systemStatus.status !== "READY" && systemStatus.status !== "LIVE" ? (
                  <p className="ds-muted-text mt-2">
                    The dashboard status chip and the checklist below share the same rules.{" "}
                    <button
                      type="button"
                      onClick={jumpToFirstSetupGap}
                      className="font-semibold text-[#0F766E] hover:underline"
                    >
                      Open the first incomplete section
                    </button>
                    .
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 shrink-0 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${clinic.is_live
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${clinic.is_live ? "bg-emerald-500" : "bg-amber-500"}`}
                      aria-hidden
                    />
                    {clinic.is_live ? "Live" : "Not live"}
                  </span>
                  {systemStatus && systemStatus.status !== "LIVE" && systemStatusCfg ? (
                    <span className={`text-sm font-medium ${systemStatusCfg.color}`}>
                      Dashboard: {systemStatusCfg.label}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/chat/${clinic.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    Preview patient chat
                  </a>
                  {systemStatus?.status === "READY" && !clinic.is_live ? (
                    <button
                      type="button"
                      onClick={() => setGoLiveModalOpen(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#115E59]"
                    >
                      <Rocket className="h-4 w-4 shrink-0" />
                      Go live
                    </button>
                  ) : null}
                  {!clinic.is_live && systemStatus && systemStatus.status !== "READY" ? (
                    <button
                      type="button"
                      onClick={jumpToFirstSetupGap}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC]"
                    >
                      Next setup section
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(["Foundation", "Knowledge", "Channels", "Go live"] as const).map((group) => {
            const modules = SETTINGS_MODULES.filter((module) => module.group === group);
            const completed = modules.filter((module) => getSectionStatus(module.key, statusState) === "completed").length;
            return (
              <button
                key={group}
                type="button"
                onClick={() => focusSection(modules[0]?.key ?? "clinic-info")}
                className="rounded-[1.35rem] border border-[#DDE5EE] bg-white/90 px-4 py-4 text-left shadow-sm transition-all hover:border-[#CBD5E1] hover:shadow-md"
              >
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[#64748B]">{group}</p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#0F172A]">
                  {completed}/{modules.length} configured
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#475569]">
                  {modules.map((module) => module.label).join(" · ")}
                </p>
              </button>
            );
          })}
        </div>
        <div className="workspace-stage">
          <div className="workspace-side-rail order-2 xl:order-none">
            <div className="ds-rail-panel workspace-immersive-rail relative p-5 xl:sticky xl:top-6">
              <p className="workspace-section-label">Configuration status</p>
              <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">{completedCount}/10</p>
              <p className="mt-1 text-sm text-[#475569]">Sections configured</p>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
                <div className="settings-progress h-full rounded-full bg-[#0F766E] transition-all" />
              </div>
              <p className="mt-4 text-sm leading-6 text-[#475569]">
                Save to update assistant behavior and the dashboard. The embed section stays &ldquo;incomplete&rdquo; until you
                go live so this meter matches what patients see as active vs staging.
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-5 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save settings
              </button>

              <div className="mt-5 border-t border-[var(--color-app-border)] pt-5">
                <p className="workspace-section-label">Modules</p>
                <div className="mt-3 space-y-3">
                  {(["Foundation", "Knowledge", "Channels", "Go live"] as const).map((group) => (
                    <div key={group}>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">{group}</p>
                      <div className="mt-2 space-y-1.5">
                        {SETTINGS_MODULES.filter((module) => module.group === group).map((module) => {
                          const status = getSectionStatus(module.key, statusState);
                          const active = openSections.has(module.key);
                          return (
                            <button
                              key={module.key}
                              type="button"
                              onClick={() => focusSection(module.key)}
                              className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${active
                                ? "border-[#d8cdfd] bg-[#f5f1ff] shadow-[0_18px_24px_-24px_rgb(124_99_243/0.75)]"
                                : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
                                }`}
                            >
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white text-[#7C63F3]" : "bg-[#F8FAFC] text-[#64748B]"}`}>
                                <module.icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-[#0F172A]">{module.label}</span>
                                <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                                  {sectionStatusLabel(status)}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 min-w-0 space-y-6 xl:order-none">
            <div className="wave-command-slab workspace-command-hero !py-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 max-w-2xl">
                  <p className="workspace-section-label">Control center map</p>
                  <h3 className="mt-2 text-[1.25rem] font-semibold tracking-[-0.03em] text-[#0F172A]">Configure the clinic in the same order patients experience it</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#475569]">
                    Foundation first, then knowledge, then channels, then go-live. Each module feeds the public chat surface, the inbox, and the dashboard readiness state.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:w-[22rem]">
                  <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[#64748B]">Public surface</p>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">/chat/{clinic?.slug || "your-clinic"}</p>
                  </div>
                  <div className="rounded-xl border border-[#d8cdfd] bg-[#f5f1ff] px-4 py-3">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[#6c58c9]">Readiness</p>
                    <p className="mt-1 text-sm font-semibold text-[#3d2c84]">{systemStatusCfg?.label || "Needs setup"}</p>
                  </div>
                </div>
              </div>
            </div>
            {saveMessage && (
              <div
                className={`p-3 text-sm rounded-lg border ${saveMessage.includes("success") || saveMessage.includes("copied")
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-red-50 text-red-700 border-red-100"
                  }`}
              >
                {saveMessage}
              </div>
            )}

            <div className="settings-module-stack space-y-2">
              <SettingsSection
                sectionKey="clinic-info"
                label="Clinic Information"
                icon={Building2}
                openSections={openSections}
                toggleSection={toggleSection}
                statusState={statusState}
              >
                <ClinicInformationSectionContent
                  name={name}
                  setName={setName}
                  phone={phone}
                  setPhone={setPhone}
                  email={email}
                  setEmail={setEmail}
                  address={address}
                  setAddress={setAddress}
                />
              </SettingsSection>

              <SettingsSection
                sectionKey="assistant-messages"
                label="Assistant Messages"
                icon={MessageCircle}
                openSections={openSections}
                toggleSection={toggleSection}
                statusState={statusState}
              >
                <AssistantMessagesSectionContent
                  greeting={greeting}
                  setGreeting={setGreeting}
                  fallback={fallback}
                  setFallback={setFallback}
                />
              </SettingsSection>

              <SettingsSection
                sectionKey="services"
                label="Services"
                icon={Stethoscope}
                openSections={openSections}
                toggleSection={toggleSection}
                statusState={statusState}
              >
                <ServicesSectionContent
                  services={services}
                  newService={newService}
                  setNewService={setNewService}
                  addService={addService}
                  removeService={removeService}
                />
              </SettingsSection>

              <SettingsSection
                sectionKey="hours"
                label="Business Hours"
                icon={Clock}
                openSections={openSections}
                toggleSection={toggleSection}
                statusState={statusState}
              >
                <BusinessHoursSectionContent hours={hours} setHours={setHours} />
              </SettingsSection>

              <SettingsSection
                sectionKey="faq"
                label="FAQ"
                icon={HelpCircle}
                openSections={openSections}
                toggleSection={toggleSection}
                statusState={statusState}
              >
                <FaqSectionContent
                  faq={faq}
                  addFaq={addFaq}
                  updateFaq={updateFaq}
                  removeFaq={removeFaq}
                />
              </SettingsSection>

              <SettingsSection
                sectionKey="google-sheets"
                label="Spreadsheets"
                icon={Sheet}
                openSections={openSections}
                toggleSection={toggleSection}
                statusState={statusState}
              >
                <GoogleSheetsSectionContent
                  googleSheetId={googleSheetId}
                  setGoogleSheetId={setGoogleSheetId}
                  googleSheetTab={googleSheetTab}
                  setGoogleSheetTab={setGoogleSheetTab}
                  handleValidateSheets={handleValidateSheets}
                  validatingSheets={validatingSheets}
                  sheetsValidation={sheetsValidation}
                  availabilityEnabled={availabilityEnabled}
                  availabilitySheetTab={availabilitySheetTab}
                  connectingGoogle={connectingGoogle}
                  startGoogleConnect={startGoogleConnect}
                  googleConnectMessage={googleConnectMessage}
                  googleConnectTone={googleConnectTone}
                  excelWorkbookId={excelWorkbookId}
                  excelWorkbookUrl={excelWorkbookUrl}
                  connectingExcel={connectingExcel}
                  startMicrosoftConnect={startMicrosoftConnect}
                  excelConnectMessage={excelConnectMessage}
                  excelConnectTone={excelConnectTone}
                  showManualSetup={showManualSetup}
                  setShowManualSetup={setShowManualSetup}
                />
              </SettingsSection>

              <SettingsSection
                sectionKey="email-notifications"
                label="Email Notifications"
                icon={Send}
                openSections={openSections}
                toggleSection={toggleSection}
                statusState={statusState}
              >
                <EmailNotificationsSectionContent
                  notificationsEnabled={notificationsEnabled}
                  setNotificationsEnabled={setNotificationsEnabled}
                  notificationEmail={notificationEmail}
                  setNotificationEmail={setNotificationEmail}
                  handleTestEmail={handleTestEmail}
                  testingEmail={testingEmail}
                  testEmailResult={testEmailResult}
                />
              </SettingsSection>

              <SettingsSection
                sectionKey="scheduling"
                label="Availability & Scheduling"
                icon={Calendar}
                openSections={openSections}
                toggleSection={toggleSection}
                statusState={statusState}
              >
                <SchedulingSectionContent
                  availabilityEnabled={availabilityEnabled}
                  setAvailabilityEnabled={setAvailabilityEnabled}
                  availabilitySheetTab={availabilitySheetTab}
                  setAvailabilitySheetTab={setAvailabilitySheetTab}
                />
              </SettingsSection>

              <SettingsSection
                sectionKey="branding"
                label="Branding"
                icon={Palette}
                openSections={openSections}
                toggleSection={toggleSection}
                statusState={statusState}
              >
                <BrandingSectionContent
                  assistantName={assistantName}
                  setAssistantName={setAssistantName}
                  primaryColor={primaryColor}
                  setPrimaryColor={setPrimaryColor}
                />
              </SettingsSection>

              {clinic && (
                <SettingsSection
                  sectionKey="embed"
                  label="Embed on Website"
                  icon={Code}
                  openSections={openSections}
                  toggleSection={toggleSection}
                  statusState={statusState}
                >
                  <EmbedSectionContent
                    clinic={clinic}
                    embedCode={embedCode}
                    setSaveMessage={setSaveMessage}
                    isLive={!!clinic.is_live}
                  />
                </SettingsSection>
              )}
            </div>
          </div>

          <div className="workspace-side-rail order-3 xl:order-none">
            <div className="workspace-rail-card p-5">
              <p className="workspace-section-label">Go-live guidance</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[#475569]">
                <p>
                  Foundation, services, hours, and FAQ control what the assistant can safely say. Spreadsheet and alert modules add workflow automation, but they do not replace the core clinic facts.
                </p>
                <p>
                  The dashboard header and this page use the same readiness logic. When this control center says you are ready, the patient surface is ready too.
                </p>
              </div>
            </div>
            <div className="workspace-rail-card p-5">
              <p className="workspace-section-label">Patient-facing output</p>
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[#64748B]">Assistant name</p>
                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">{assistantName || clinic?.assistant_name || "Clinic Assistant"}</p>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[#64748B]">Primary color</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="h-8 w-8 rounded-xl border border-white shadow-sm" style={{ backgroundColor: primaryColor }} />
                    <span className="text-sm font-semibold text-[#0F172A]">{primaryColor}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[#64748B]">Public state</p>
                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">{clinic?.is_live ? "Live for patients" : "Staging only"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-progress {
          width: ${progressWidth};
        }

        .settings-color-preview {
          background-color: ${primaryColor};
        }
      `}</style>

      <GoLiveModals
        confirmOpen={goLiveModalOpen && !goLiveSuccess}
        successOpen={goLiveSuccess}
        loading={goLiveLoading}
        onCancel={() => setGoLiveModalOpen(false)}
        onConfirm={() => {
          void (async () => {
            setGoLiveLoading(true);
            try {
              const res = await api.clinics.goLive();
              setClinic((prev) => (prev ? { ...prev, is_live: res.is_live } : null));
              setGoLiveModalOpen(false);
              setGoLiveSuccess(true);
              globalThis.setTimeout(() => setGoLiveSuccess(false), 4000);
            } catch {
              /* keep modal open */
            }
            setGoLiveLoading(false);
          })();
        }}
        onDismissSuccess={() => setGoLiveSuccess(false)}
      />
    </div>
  );
}
