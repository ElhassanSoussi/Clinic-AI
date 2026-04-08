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
import { isSafeExternalUrl, setupProgressPercent } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Clinic Info", icon: Building2 },
  { id: 2, title: "Services", icon: Stethoscope },
  { id: 3, title: "Hours", icon: Clock },
  { id: 4, title: "FAQ", icon: HelpCircle },
  { id: 5, title: "Spreadsheets", icon: Sheet },
  { id: 6, title: "Test Chat", icon: MessageSquare },
  { id: 7, title: "Embed Widget", icon: Code2 },
];

/** Shown under the stepper so owners know why each step exists. */
const STEP_GUIDANCE: Record<number, string> = {
  1: "Use the name and phone patients already know. This builds trust in chat and in follow-up.",
  2: "List what you actually book. The assistant uses this to answer “do you offer…” without guessing.",
  3: "Set weekly hours in plain language. Patients ask about open/closing times constantly.",
  4: "Optional: short Q&A the assistant can quote. Skip now and add later in settings if you prefer.",
  5: "Keep leads in Sheets or Excel, and get notified when someone requests an appointment. Quick connect is the fastest path.",
  6: "Run through booking and FAQs using the same API your website widget will use.",
  7: "Paste one snippet on your site. Patients chat here; your team works from the dashboard.",
};

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

function validateOnboardingStep(
  step: number,
  form: { name: string; phone: string; email: string; services: string[] }
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 1) {
    if (form.name.trim() === "") errors.name = "Clinic name is required";
    if (form.phone.trim() === "") errors.phone = "Phone number is required";
    if (form.email.trim() === "") {
      errors.email = "Email is required";
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) === false) {
      errors.email = "Enter a valid email address";
    }
  }

  if (step === 2 && form.services.length === 0) {
    errors.services = "Add at least one service";
  }

  return errors;
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function onboardingStepColorClass(isDone: boolean, isCurrent: boolean): string {
  if (isDone) return "bg-teal-600 text-white";
  if (isCurrent) return "bg-teal-100 text-teal-700 ring-2 ring-teal-600";
  return "bg-slate-100 text-slate-400";
}

function onboardingStepContainerClass(targetStep: number, currentStep: number): string {
  return targetStep > currentStep
    ? "opacity-40 cursor-not-allowed"
    : "cursor-pointer";
}

function onboardingStepLabelClass(isCurrent: boolean): string {
  return isCurrent ? "text-teal-700" : "text-slate-500";
}

function nextStepLabel(step: number): string {
  return step === 4 || step === 5 ? "Continue" : "Save & Continue";
}

function FaqStepContent({
  faq,
  addFaq,
  removeFaq,
  updateFaq,
}: Readonly<{
  faq: FaqEntry[];
  addFaq: () => void;
  removeFaq: (index: number) => void;
  updateFaq: (index: number, field: "question" | "answer", value: string) => void;
}>) {
  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-1">
        Frequently asked questions
      </h2>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        Short Q&amp;A pairs the assistant can quote when patients ask about parking, insurance, cancellation, or pricing.
        Optional — you can skip and add these later under Settings → FAQ.
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
                  <span className="text-sm font-medium text-[#64748B]">
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
  );
}

function GoogleSheetsStepContent({
  googleSheetId,
  setGoogleSheetId,
  setSheetsValidation,
  googleSheetTab,
  setGoogleSheetTab,
  availabilityEnabled,
  setAvailabilityEnabled,
  availabilitySheetTab,
  setAvailabilitySheetTab,
  notificationsEnabled,
  setNotificationsEnabled,
  notificationEmail,
  setNotificationEmail,
  validatingSheets,
  validateSheets,
  sheetsValidation,
  email,
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
  setSheetsValidation: (value: SheetsValidation | null) => void;
  googleSheetTab: string;
  setGoogleSheetTab: (value: string) => void;
  availabilityEnabled: boolean;
  setAvailabilityEnabled: (value: boolean) => void;
  availabilitySheetTab: string;
  setAvailabilitySheetTab: (value: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  notificationEmail: string;
  setNotificationEmail: (value: string) => void;
  validatingSheets: boolean;
  validateSheets: () => void;
  sheetsValidation: SheetsValidation | null;
  email: string;
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
  setShowManualSetup: (value: boolean) => void;
}>) {
  const connectedSheetUrl = googleSheetId
    ? `https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`
    : "";

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-1">
        Connect a spreadsheet
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        The fastest setup is Google quick connect. Clinic AI can create a starter
        sheet for you automatically and keep leads synced without the manual share
        steps.
      </p>

      <div className="max-w-lg space-y-6">
        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-emerald-800 mb-1">
                Google Sheets quick connect
              </h4>
              <p className="text-sm text-emerald-700">
                Sign in with Google, let Clinic AI create a starter spreadsheet,
                and continue setup. No spreadsheet ID or sharing steps needed.
              </p>
            </div>
            <Sheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          </div>
          <button
            onClick={startGoogleConnect}
            disabled={connectingGoogle}
            className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
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

        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">Microsoft Excel</h4>
              <p className="text-sm text-slate-500">
                Sign in with Microsoft and let Clinic AI create a starter Excel workbook in your OneDrive automatically.
              </p>
            </div>
            <Sheet className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          </div>
          <button
            onClick={startMicrosoftConnect}
            disabled={connectingExcel}
            className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {connectingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Connect with Microsoft
          </button>
          {excelConnectMessage ? (
            <p
              className={`mt-3 text-sm ${excelConnectTone === "error" ? "text-red-700" : "text-slate-700"
                }`}
            >
              {excelConnectMessage}
            </p>
          ) : null}
          {excelWorkbookId ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
              Microsoft Excel is connected.
              {excelWorkbookUrl ? (
                <div className="mt-2">
                  <a
                    href={excelWorkbookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-slate-700 hover:text-slate-900"
                  >
                    Open workbook
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50">
          <button
            onClick={() => setShowManualSetup(!showManualSetup)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Advanced manual setup</h4>
              <p className="text-xs text-slate-500 mt-1">
                Use your own spreadsheet ID if you do not want quick connect.
              </p>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showManualSetup ? "rotate-90" : ""}`} />
          </button>

          {showManualSetup ? (
            <div className="border-t border-slate-200 px-4 py-4 space-y-6 bg-white rounded-b-xl">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  Manual setup instructions
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
                    className={`block w-10 h-6 rounded-full transition-colors ${availabilityEnabled ? "bg-teal-500" : "bg-slate-200"
                      }`}
                  />
                  <div
                    className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${availabilityEnabled ? "translate-x-4" : ""
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
                      className={`block w-10 h-6 rounded-full transition-colors ${notificationsEnabled
                        ? "bg-indigo-500"
                        : "bg-slate-200"
                        }`}
                    />
                    <div
                      className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notificationsEnabled ? "translate-x-4" : ""
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TestChatStepContent({
  assistantName,
  name,
  chatMessages,
  chatSending,
  chatInput,
  setChatInput,
  sendChatMessage,
  chatEndRef,
}: Readonly<{
  assistantName: string;
  name: string;
  chatMessages: ChatMessage[];
  chatSending: boolean;
  chatInput: string;
  setChatInput: (value: string) => void;
  sendChatMessage: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}>) {
  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-1">
        Test the patient experience
      </h2>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-2xl">
        This preview uses your saved clinic slug and the same chat API as the live widget — not a canned demo transcript.
        Try “I&apos;d like to book an appointment” or ask about a service you added in step 2.
      </p>
      <div className="max-w-lg mx-auto border border-slate-200 rounded-2xl overflow-hidden shadow-md shadow-slate-200/40">
        <div
          className="onboarding-chat-header px-4 py-3.5 text-white flex items-center gap-2"
        >
          <Bot className="w-5 h-5 shrink-0 opacity-90" aria-hidden />
          <div className="min-w-0">
            <span className="text-sm font-semibold block truncate">
              {assistantName || name || "Assistant"}
            </span>
            <span className="text-[11px] text-white/75">Preview — same path as your embed</span>
          </div>
        </div>

        <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-50/90">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-white">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-3" aria-hidden />
              <p className="text-sm font-medium text-slate-700">Send a first message</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs">
                Confirm greetings, hours, and booking prompts feel right before you paste the widget on your site.
              </p>
            </div>
          )}
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                }`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${msg.role === "user"
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
            className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
            placeholder="Try: “What services do you offer?”"
          />
          <button
            onClick={sendChatMessage}
            disabled={chatSending || !chatInput.trim()}
            aria-label="Send chat message"
            className="px-3 py-2 text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 shadow-sm shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmbedWidgetStepContent({
  embedCode,
  copied,
  copyEmbed,
  directChatLink,
  clinic,
}: Readonly<{
  embedCode: string;
  copied: boolean;
  copyEmbed: () => void;
  directChatLink: string;
  clinic: Clinic | null;
}>) {
  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-1">
        Put the assistant on your website
      </h2>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed max-w-2xl">
        One script tag loads the widget; conversations and leads land in your Clinic AI inbox. After you go live from the
        dashboard, the same assistant answers here and on your site.
      </p>

      <div className="mb-6 rounded-xl border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm text-teal-900">
        <p className="font-semibold">You’re almost done</p>
        <p className="mt-1 text-teal-800/90 leading-relaxed">
          When you finish, you&apos;ll open the dashboard with a short next-steps guide. From there: confirm anything in
          Settings, watch the Inbox as traffic arrives, and use <span className="font-semibold">Go live</span> in the top
          bar when you want patients to see an active assistant on your public chat page.
        </p>
      </div>

      <div className="max-w-lg space-y-6">
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

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">
            Compatible with
          </h4>
          <p className="text-sm text-slate-500">
            WordPress, Squarespace, Wix, Webflow, Shopify, custom HTML,
            and any website that supports custom code.
          </p>
        </div>

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
                {directChatLink}
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
  );
}

async function validateOnboardingSheets({
  googleSheetId,
  googleSheetTab,
  availabilityEnabled,
  availabilitySheetTab,
  setValidatingSheets,
  setSheetsValidation,
}: Readonly<{
  googleSheetId: string;
  googleSheetTab: string;
  availabilityEnabled: boolean;
  availabilitySheetTab: string;
  setValidatingSheets: (value: boolean) => void;
  setSheetsValidation: (value: SheetsValidation | null) => void;
}>): Promise<void> {
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
}

async function sendOnboardingChatMessage({
  text,
  chatInput,
  chatSending,
  clinic,
  chatSessionId,
  setChatInput,
  setChatMessages,
  setChatSending,
}: Readonly<{
  text?: string;
  chatInput: string;
  chatSending: boolean;
  clinic: Clinic | null;
  chatSessionId: string;
  setChatInput: (value: string) => void;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setChatSending: (value: boolean) => void;
}>): Promise<void> {
  if (!clinic || chatSending) return;

  const message = (text || chatInput).trim();
  if (!message) return;

  setChatInput("");
  setChatMessages((prev) => [
    ...prev,
    { id: crypto.randomUUID(), role: "user", content: message },
  ]);
  setChatSending(true);

  try {
    const res = await api.chat.send({
      clinic_slug: clinic.slug,
      session_id: chatSessionId,
      message,
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
}

function OnboardingPageProgress({
  step,
  onSelectStep,
}: Readonly<{
  step: number;
  onSelectStep: (step: number) => void;
}>) {
  const pct = setupProgressPercent(Math.max(0, step - 1), STEPS.length - 1);
  const currentMeta = STEPS.find((s) => s.id === step);
  const guidance = STEP_GUIDANCE[step] ?? "";

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-800/80">Assistant setup</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 max-w-2xl">
            One guided pass per workspace. When you finish, we open the dashboard: preview Patient Chat from the sidebar,
            adjust anything in Settings, then use <span className="font-semibold text-slate-800">Go live</span> in the
            header so Inbox and Leads start filling with real traffic.
          </p>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 mt-3 tracking-tight">
            Step {step} of {STEPS.length}: {currentMeta?.title}
          </h1>
          {guidance ? <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">{guidance}</p> : null}
        </div>
        <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center sm:text-right shadow-sm">
          <p className="text-xs font-medium text-slate-500">Progress</p>
          <p className="text-lg font-semibold tabular-nums text-teal-700">{pct}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 gap-1">
        {STEPS.map((s) => {
          const StepIcon = s.icon;
          const isDone = step > s.id;
          const isCurrent = step === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (s.id < step) onSelectStep(s.id);
              }}
              disabled={s.id > step}
              className={`flex flex-col items-center gap-1.5 transition-colors ${onboardingStepContainerClass(s.id, step)}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${onboardingStepColorClass(isDone, isCurrent)}`}
              >
                {isDone ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-medium text-center max-w-[4.5rem] leading-tight hidden sm:block ${onboardingStepLabelClass(isCurrent)}`}
              >
                {s.title}
              </span>
            </button>
          );
        })}
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div className="onboarding-progress bg-teal-600 h-1.5 rounded-full transition-all duration-300" />
      </div>
    </div>
  );
}

function OnboardingPageNavigation({
  step,
  saving,
  onBack,
  onNext,
  onFinish,
}: Readonly<{
  step: number;
  saving: boolean;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}>) {
  if (step < 7) {
    return (
      <div className="px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between">
        {step > 1 ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
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
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {nextStepLabel(step)}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <button
        onClick={onFinish}
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
    </div>
  );
}

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
  const [excelWorkbookId, setExcelWorkbookId] = useState("");
  const [excelWorkbookUrl, setExcelWorkbookUrl] = useState("");
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
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleConnectMessage, setGoogleConnectMessage] = useState("");
  const [googleConnectTone, setGoogleConnectTone] = useState<"success" | "error" | "">("");
  const [connectingExcel, setConnectingExcel] = useState(false);
  const [excelConnectMessage, setExcelConnectMessage] = useState("");
  const [excelConnectTone, setExcelConnectTone] = useState<"success" | "error" | "">("");
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [queryParams, setQueryParams] = useState<URLSearchParams | null>(null);

  // Step 6 - Chat test
  const [chatMessages, setChatMessages] = useState<
    ChatMessage[]
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
      setExcelWorkbookId(data.excel_workbook_id || "");
      setExcelWorkbookUrl(data.excel_workbook_url || "");
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

  useEffect(() => {
    if (globalThis.window === undefined) return;
    setQueryParams(new URLSearchParams(globalThis.location.search));
  }, []);

  useEffect(() => {
    const requestedStep = Number(queryParams?.get("step") || "");
    if (Number.isFinite(requestedStep) && requestedStep >= 1 && requestedStep <= 7) {
      setStep(requestedStep);
    }
  }, [queryParams]);

  useEffect(() => {
    const connected = queryParams?.get("google_sheets_connected");
    const error = queryParams?.get("google_sheets_error");
    const excelConnected = queryParams?.get("excel_connected");
    const excelError = queryParams?.get("excel_connect_error");
    if (!connected && !error && !excelConnected && !excelError) {
      return;
    }

    setStep(5);
    if (connected === "1") {
      setGoogleConnectTone("success");
      setGoogleConnectMessage("Google Sheets connected. Your starter sheet is ready.");
      void loadClinic();
    } else if (error) {
      setGoogleConnectTone("error");
      setGoogleConnectMessage(error);
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
    router.replace(nextQuery ? `/onboarding?${nextQuery}` : "/onboarding");
    setQueryParams(nextParams);
  }, [loadClinic, queryParams, router]);

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
    const nextErrors = validateOnboardingStep(step, { name, phone, email, services });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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
    await validateOnboardingSheets({
      googleSheetId,
      googleSheetTab,
      availabilityEnabled,
      availabilitySheetTab,
      setValidatingSheets,
      setSheetsValidation,
    });
  };

  const startGoogleConnect = async () => {
    setConnectingGoogle(true);
    setGoogleConnectMessage("");
    setGoogleConnectTone("");

    try {
      const result = await api.clinics.startGoogleSheetsConnect({
        return_to: "/onboarding?step=5",
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
        return_to: "/onboarding?step=5",
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

  // Chat test
  const sendChatMessage = async () => {
    await sendOnboardingChatMessage({
      chatInput,
      chatSending,
      clinic,
      chatSessionId,
      setChatInput,
      setChatMessages,
      setChatSending,
    });
  };

  // Copy embed code
  const origin = globalThis.window === undefined ? "" : globalThis.location.origin;
  const embedCode = clinic
    ? `<script src="${origin}/widget.js" data-clinic="${clinic.slug}"></script>`
    : "";
  const directChatLink = clinic ? `${origin}/chat/${clinic.slug}` : "";
  const stepProgressWidth = `${setupProgressPercent(Math.max(0, step - 1), STEPS.length - 1)}%`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading || loading) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0F766E] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-shell-bg min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex h-[4.25rem] max-w-5xl items-center gap-3 px-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] shadow-sm shadow-teal-900/10">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block text-[0.9375rem] font-semibold leading-tight text-[#0F172A]">Clinic AI</span>
            <span className="text-sm text-[#64748B]">Front desk assistant setup</span>
          </div>
          <span className="ml-auto hidden shrink-0 tabular-nums text-sm font-medium text-[#64748B] sm:block">
            Step {step}/{STEPS.length}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 pb-16 sm:px-6">
        <OnboardingPageProgress step={step} onSelectStep={setStep} />

        {/* Step content */}
        <div className="ds-card overflow-hidden">
          {/* ==================== STEP 1: Clinic Info ==================== */}
          {step === 1 && (
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Clinic identity & contact
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Patients see this context in chat and in notifications. Use the same name and phone
                you list on Google, your site, or your front desk — inconsistency creates doubt.
              </p>
              <div className="space-y-5 max-w-lg">
                <div>
                  <label htmlFor="ob-clinic-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Clinic Name *
                  </label>
                  <input
                    id="ob-clinic-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white focus:ring-1 ${errors.name
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
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white focus:ring-1 ${errors.phone
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
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white focus:ring-1 ${errors.email
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
                        <div className="onboarding-color-preview h-10 flex-1 rounded-lg" />
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
                Services you book
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                The assistant won’t invent offerings. Add every service you want mentioned in chat — from hygiene to
                urgent visits — using patient-friendly wording.
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
                Public business hours
              </h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Free-text per day is fine (e.g. “9–5” or “Closed”). These values can surface in patient chat when
                someone asks if you’re open — keep them aligned with how you answer the phone.
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

          {step === 4 && (
            <FaqStepContent
              faq={faq}
              addFaq={addFaq}
              removeFaq={removeFaq}
              updateFaq={updateFaq}
            />
          )}

          {step === 5 && (
            <GoogleSheetsStepContent
              googleSheetId={googleSheetId}
              setGoogleSheetId={setGoogleSheetId}
              setSheetsValidation={setSheetsValidation}
              googleSheetTab={googleSheetTab}
              setGoogleSheetTab={setGoogleSheetTab}
              availabilityEnabled={availabilityEnabled}
              setAvailabilityEnabled={setAvailabilityEnabled}
              availabilitySheetTab={availabilitySheetTab}
              setAvailabilitySheetTab={setAvailabilitySheetTab}
              notificationsEnabled={notificationsEnabled}
              setNotificationsEnabled={setNotificationsEnabled}
              notificationEmail={notificationEmail}
              setNotificationEmail={setNotificationEmail}
              validatingSheets={validatingSheets}
              validateSheets={validateSheets}
              sheetsValidation={sheetsValidation}
              email={email}
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
          )}

          {step === 6 && (
            <TestChatStepContent
              assistantName={assistantName}
              name={name}
              chatMessages={chatMessages}
              chatSending={chatSending}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendChatMessage={sendChatMessage}
              chatEndRef={chatEndRef}
            />
          )}

          {step === 7 && (
            <EmbedWidgetStepContent
              embedCode={embedCode}
              copied={copied}
              copyEmbed={copyEmbed}
              directChatLink={directChatLink}
              clinic={clinic}
            />
          )}

          <OnboardingPageNavigation
            step={step}
            saving={saving}
            onBack={goBack}
            onNext={goNext}
            onFinish={finishOnboarding}
          />
        </div>
      </div>

      <style jsx>{`
        .onboarding-progress {
          width: ${stepProgressWidth};
        }

        .onboarding-color-preview,
        .onboarding-chat-header {
          background-color: ${primaryColor || "#0d9488"};
        }
      `}</style>
    </div>
  );
}
