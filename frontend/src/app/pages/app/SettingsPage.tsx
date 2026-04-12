import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Building,
  Users,
  Bell,
  Shield,
  Globe,
  Palette,
  Clock,
  AlertCircle,
  Copy,
  Save,
  Zap,
  PauseCircle,
} from "lucide-react";
import { ConfirmModal } from "@/app/components/Modal";
import { BusinessHoursEditor } from "@/app/components/BusinessHoursEditor";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  fetchChannels,
  fetchClinicMe,
  fetchSystemReadiness,
  goLiveClinic,
  testNotificationEmail,
  updateClinicMe,
} from "@/lib/api/services";
import type { ChannelReadiness, Clinic, SystemReadiness } from "@/lib/api/types";
import type { DaySchedule, Weekday } from "@/lib/business-hours";
import { getPublicOrigin } from "@/lib/site";
import {
  defaultBusinessHours,
  parseBusinessHours,
  serializeBusinessHours,
  validateBusinessHours,
} from "@/lib/business-hours";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { cn } from "@/app/components/ui/utils";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleClass, appSectionTitleClass } from "@/lib/page-layout";

export function SettingsPage() {
  const { session } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [channels, setChannels] = useState<ChannelReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [goLiveBusy, setGoLiveBusy] = useState(false);
  const [systemReadiness, setSystemReadiness] = useState<SystemReadiness | null>(null);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d9488");
  const [hoursSchedule, setHoursSchedule] = useState<Record<Weekday, DaySchedule>>(() => defaultBusinessHours());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderLeadHours, setReminderLeadHours] = useState(24);
  const [followUpAutomation, setFollowUpAutomation] = useState(false);
  const [followUpDelayMinutes, setFollowUpDelayMinutes] = useState(45);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(false);
  const [availabilitySheetTab, setAvailabilitySheetTab] = useState("Availability");

  const hydrate = useCallback((c: Clinic) => {
    setClinic(c);
    setName(c.name ?? "");
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setAddress(c.address ?? "");
    setGreetingMessage(c.greeting_message ?? "");
    setFallbackMessage(c.fallback_message ?? "");
    setAssistantName(c.assistant_name ?? "");
    setPrimaryColor(c.primary_color || "#0d9488");
    setHoursSchedule(parseBusinessHours(c.business_hours));
    setNotificationsEnabled(Boolean(c.notifications_enabled));
    setNotificationEmail(c.notification_email ?? "");
    setReminderEnabled(Boolean(c.reminder_enabled));
    setReminderLeadHours(c.reminder_lead_hours ?? 24);
    setFollowUpAutomation(Boolean(c.follow_up_automation_enabled));
    setFollowUpDelayMinutes(c.follow_up_delay_minutes ?? 45);
    setAvailabilityEnabled(Boolean(c.availability_enabled));
    setAvailabilitySheetTab(c.availability_sheet_tab || "Availability");
  }, []);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [me, ch, readiness] = await Promise.all([
          fetchClinicMe(session.accessToken),
          fetchChannels(session.accessToken),
          fetchSystemReadiness(session.accessToken).catch(() => null),
        ]);
        if (!cancelled) {
          hydrate(me);
          setChannels(ch || []);
          setSystemReadiness(readiness);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load settings");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, hydrate]);

  const baseline = useMemo(() => {
    if (!clinic) {
      return "";
    }
    return JSON.stringify({
      name,
      phone,
      email,
      address,
      greetingMessage,
      fallbackMessage,
      assistantName,
      primaryColor,
      businessHours: JSON.stringify(serializeBusinessHours(hoursSchedule)),
      notificationsEnabled,
      notificationEmail,
      reminderEnabled,
      reminderLeadHours,
      followUpAutomation,
      followUpDelayMinutes,
      availabilityEnabled,
      availabilitySheetTab,
    });
  }, [
    clinic,
    name,
    phone,
    email,
    address,
    greetingMessage,
    fallbackMessage,
    assistantName,
    primaryColor,
    hoursSchedule,
    notificationsEnabled,
    notificationEmail,
    reminderEnabled,
    reminderLeadHours,
    followUpAutomation,
    followUpDelayMinutes,
    availabilityEnabled,
    availabilitySheetTab,
  ]);

  const initialBaseline = useMemo(() => {
    if (!clinic) {
      return "";
    }
    return JSON.stringify({
      name: clinic.name ?? "",
      phone: clinic.phone ?? "",
      email: clinic.email ?? "",
      address: clinic.address ?? "",
      greetingMessage: clinic.greeting_message ?? "",
      fallbackMessage: clinic.fallback_message ?? "",
      assistantName: clinic.assistant_name ?? "",
      primaryColor: clinic.primary_color || "#0d9488",
      businessHours: JSON.stringify(serializeBusinessHours(parseBusinessHours(clinic.business_hours))),
      notificationsEnabled: Boolean(clinic.notifications_enabled),
      notificationEmail: clinic.notification_email ?? "",
      reminderEnabled: Boolean(clinic.reminder_enabled),
      reminderLeadHours: clinic.reminder_lead_hours ?? 24,
      followUpAutomation: Boolean(clinic.follow_up_automation_enabled),
      followUpDelayMinutes: clinic.follow_up_delay_minutes ?? 45,
      availabilityEnabled: Boolean(clinic.availability_enabled),
      availabilitySheetTab: clinic.availability_sheet_tab || "Availability",
    });
  }, [clinic]);

  const hasChanges = baseline !== initialBaseline && clinic !== null;

  const chatUrl = clinic ? `${getPublicOrigin()}/chat?slug=${encodeURIComponent(clinic.slug)}` : "";
  const iframeSnippet = clinic
    ? `<iframe src="${chatUrl}" title="Clinic chat" style="width:380px;height:640px;border:0;border-radius:12px" loading="lazy"></iframe>`
    : "";

  const handleSave = async () => {
    if (!session?.accessToken || !clinic) {
      return;
    }
    setSaveError(null);
    const hoursErr = validateBusinessHours(hoursSchedule);
    if (hoursErr) {
      setSaveError(hoursErr);
      notifyError(hoursErr);
      return;
    }
    const business_hours = serializeBusinessHours(hoursSchedule);
    setSaving(true);
    try {
      const updated = await updateClinicMe(session.accessToken, {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        greeting_message: greetingMessage.trim() || undefined,
        fallback_message: fallbackMessage.trim() || undefined,
        assistant_name: assistantName.trim() || undefined,
        primary_color: primaryColor.trim() || undefined,
        business_hours,
        notifications_enabled: notificationsEnabled,
        notification_email: notificationEmail.trim() || undefined,
        reminder_enabled: reminderEnabled,
        reminder_lead_hours: reminderLeadHours,
        follow_up_automation_enabled: followUpAutomation,
        follow_up_delay_minutes: followUpDelayMinutes,
        availability_enabled: availabilityEnabled,
        availability_sheet_tab: availabilitySheetTab.trim() || undefined,
      });
      hydrate(updated);
      notifySuccess("Settings saved");
      try {
        setSystemReadiness(await fetchSystemReadiness(session.accessToken));
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Save failed";
      setSaveError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleGoLive = async () => {
    if (!session?.accessToken) {
      return;
    }
    setGoLiveBusy(true);
    setSaveError(null);
    try {
      await goLiveClinic(session.accessToken);
      const me = await fetchClinicMe(session.accessToken);
      hydrate(me);
      notifySuccess("Clinic is live", "Patient-facing automation is active.");
      try {
        setSystemReadiness(await fetchSystemReadiness(session.accessToken));
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Go-live failed";
      setSaveError(msg);
      notifyError(msg);
    } finally {
      setGoLiveBusy(false);
    }
  };

  const handlePauseLive = async () => {
    if (!session?.accessToken) {
      return;
    }
    setPauseBusy(true);
    setSaveError(null);
    try {
      const updated = await updateClinicMe(session.accessToken, { is_live: false });
      hydrate(updated);
      notifySuccess("Assistant paused", "Go live again when you want automation back on.");
      setShowPauseConfirm(false);
      try {
        setSystemReadiness(await fetchSystemReadiness(session.accessToken));
      } catch {
        /* non-fatal */
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not pause";
      setSaveError(msg);
      notifyError(msg);
    } finally {
      setPauseBusy(false);
    }
  };

  const copyChatUrl = async () => {
    if (!chatUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(chatUrl);
      notifySuccess("Chat link copied");
    } catch {
      notifyError("Could not copy. Select the text in the box manually.");
    }
  };

  const copyEmbedSnippet = async () => {
    if (!iframeSnippet) {
      return;
    }
    try {
      await navigator.clipboard.writeText(iframeSnippet);
      notifySuccess("Embed HTML copied");
    } catch {
      notifyError("Could not copy. Select the snippet manually.");
    }
  };

  const handleTestEmail = async () => {
    if (!session?.accessToken) {
      return;
    }
    setTestBusy(true);
    setSaveError(null);
    try {
      const r = await testNotificationEmail(session.accessToken);
      if (!r.success) {
        const msg = r.error || "Test email failed";
        setSaveError(msg);
        notifyError(msg);
      } else {
        notifySuccess("Test email sent", "Check the notification inbox you configured.");
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Test email failed";
      setSaveError(msg);
      notifyError(msg);
    } finally {
      setTestBusy(false);
    }
  };

  if (loading && !clinic) {
    return (
      <div className={appPagePaddingClass}>
        <p className="text-muted-foreground">Loading clinic settings…</p>
      </div>
    );
  }

  if (loadError && !clinic) {
    return (
      <div className={appPagePaddingClass}>
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  const isLive = Boolean(clinic?.is_live);
  const readinessIssues =
    systemReadiness?.items?.filter((i) => {
      const s = (i.status || "").toLowerCase();
      return s.includes("fail") || s.includes("error") || s === "warning" || s === "not_ready" || s === "blocked";
    }) ?? [];

  return (
    <div className={appPagePaddingClass}>
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className={appPageTitleClass}>Settings</h1>
            <p className={appPageSubtitleClass}>
              Clinic control center — profile, channels, automation, and embed code share one save flow. Keep the assistant live only when you
              are ready for patient-facing automation.
            </p>
            {!hasChanges && clinic ? (
              <p className="text-sm font-medium text-emerald-800 mt-2">All changes saved to the server.</p>
            ) : null}
            {saveError && <p className="text-sm text-destructive mt-2">{saveError}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isLive ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <span className="text-sm font-medium">{isLive ? "Live" : "Not live"}</span>
            </div>
            {hasChanges && (
              <button
                type="button"
                data-testid="settings-save-changes"
                disabled={saving}
                onClick={() => void handleSave()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </div>

      {systemReadiness ? (
        <div
          className={`rounded-xl border p-6 mb-8 ${readinessIssues.length ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-border"
            }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">System readiness</h3>
              <p className="text-sm text-muted-foreground capitalize">
                Overall: {systemReadiness.overall_status.replace(/_/g, " ")}
                {readinessIssues.length ? ` · ${readinessIssues.length} item(s) need attention` : " · no blocking checks flagged here"}
              </p>
              {readinessIssues.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {readinessIssues.map((i) => (
                    <li key={i.key} className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <span className="font-medium">{i.label}</span>
                        {i.summary ? <span className="text-muted-foreground"> — {i.summary}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isLive ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Assistant is live</h3>
                <p className="text-sm text-muted-foreground">
                  Automated patient-facing channels are active. Pause if you need to stop new automation without changing other settings.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={pauseBusy}
              onClick={() => setShowPauseConfirm(true)}
              className="px-4 py-2 border border-emerald-300 bg-white text-emerald-900 rounded-lg hover:bg-emerald-100/80 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <PauseCircle className="w-4 h-4" />
              Pause assistant
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Assistant not live</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Patients only reach automated channels when your clinic is marked live. Fix readiness issues above if any, then go live.
              </p>
              <button
                type="button"
                disabled={goLiveBusy}
                onClick={() => void handleGoLive()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {goLiveBusy ? "Enabling…" : "Go live"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <Building className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <h2 className={cn(appSectionTitleClass, "text-xl")}>Clinic information</h2>
                <p className="text-sm text-muted-foreground">Public-facing practice details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="settings-clinic-name" className="block text-sm font-medium mb-2">
                  Clinic name
                </label>
                <input
                  id="settings-clinic-name"
                  type="text"
                  data-testid="settings-clinic-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-phone" className="block text-sm font-medium mb-2">
                    Phone
                  </label>
                  <input
                    id="settings-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="settings-email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="settings-address" className="block text-sm font-medium mb-2">
                  Address
                </label>
                <input
                  id="settings-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-assistant-name" className="block text-sm font-medium mb-2">
                    Assistant display name
                  </label>
                  <input
                    id="settings-assistant-name"
                    type="text"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <span className="block text-sm font-medium mb-2">Primary color</span>
                  <div className="flex gap-2 items-center">
                    <input
                      id="settings-primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      aria-label="Primary brand color picker"
                      className="h-10 w-14 rounded border border-border bg-white cursor-pointer"
                    />
                    <label htmlFor="settings-primary-color-hex" className="sr-only">
                      Primary color hex value
                    </label>
                    <input
                      id="settings-primary-color-hex"
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-4 py-2 border border-border rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="settings-greeting-message" className="block text-sm font-medium mb-2">
                  Greeting message
                </label>
                <textarea
                  id="settings-greeting-message"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label htmlFor="settings-fallback-message" className="block text-sm font-medium mb-2">
                  Fallback message
                </label>
                <textarea
                  id="settings-fallback-message"
                  value={fallbackMessage}
                  onChange={(e) => setFallbackMessage(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <h2 className={cn(appSectionTitleClass, "text-xl")}>Business hours</h2>
                <p className="text-sm text-muted-foreground">Weekly schedule stored as structured data on your clinic record</p>
              </div>
            </div>
            <BusinessHoursEditor value={hoursSchedule} onChange={setHoursSchedule} disabled={saving} />
          </div>

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <h2 className={cn(appSectionTitleClass, "text-xl")}>Team</h2>
                <p className="text-sm text-muted-foreground">Additional staff seats and roles are not exposed via this API yet.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your signed-in account is tied to this clinic. To add or remove users, use clinic owner tools or support.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <Globe className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <h2 className={cn(appSectionTitleClass, "text-xl")}>Channels & embed</h2>
                <p className="text-sm text-muted-foreground">Live readiness from the front-desk service plus shareable entry points</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Public chat link</label>
                <div className="relative">
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto break-all">
                    {chatUrl || "—"}
                  </div>
                  <button
                    type="button"
                    aria-label="Copy public chat link"
                    disabled={!chatUrl}
                    onClick={() => void copyChatUrl()}
                    className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Embed snippet (iframe)</label>
                <div className="mb-3 rounded-lg border border-border bg-slate-50 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                  Paste this HTML into your marketing site or patient portal. It loads the hosted chat widget for your clinic slug — no API keys
                  in the browser. Adjust width/height to match your layout; keep the{" "}
                  <span className="font-mono text-xs">title</span> attribute for accessibility.
                </div>
                <div className="relative">
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all border border-slate-700">
                    {iframeSnippet || "—"}
                  </div>
                  <button
                    type="button"
                    aria-label="Copy iframe embed HTML"
                    disabled={!iframeSnippet}
                    onClick={() => void copyEmbedSnippet()}
                    className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Channel readiness</label>
                <div className="space-y-2">
                  {channels.length === 0 && <p className="text-sm text-muted-foreground">No channel data returned.</p>}
                  {channels.map((ch) => (
                    <div key={ch.id} className="flex items-center justify-between p-3 bg-slate-50 border border-border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{ch.display_name}</p>
                        <p className="text-xs text-muted-foreground">{ch.summary || ch.connection_status}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded border ${ch.live ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-600 border-border"
                          }`}
                      >
                        {ch.live ? "Live" : ch.connection_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-border">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-sm font-medium">Availability scheduling</span>
                  <input
                    type="checkbox"
                    checked={availabilityEnabled}
                    onChange={(e) => setAvailabilityEnabled(e.target.checked)}
                    aria-label="Enable availability scheduling"
                    className="w-4 h-4 rounded border-border"
                  />
                </label>
                <div>
                  <label htmlFor="settings-availability-sheet-tab" className="block text-xs font-medium mb-1 text-muted-foreground">
                    Availability sheet tab
                  </label>
                  <input
                    id="settings-availability-sheet-tab"
                    type="text"
                    value={availabilitySheetTab}
                    onChange={(e) => setAvailabilitySheetTab(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <Bell className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <h2 className={cn(appSectionTitleClass, "text-xl")}>Notifications & automation</h2>
                <p className="text-sm text-muted-foreground">Backed by clinic notification settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-sm text-muted-foreground">Operational emails to your clinic</p>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  aria-label="Enable email notifications"
                  className="w-4 h-4 rounded border-border"
                />
              </label>
              <div>
                <label htmlFor="settings-notification-email" className="block text-sm font-medium mb-2">
                  Notification email
                </label>
                <input
                  id="settings-notification-email"
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                />
              </div>
              <button
                type="button"
                disabled={testBusy}
                onClick={() => void handleTestEmail()}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {testBusy ? "Sending…" : "Send test notification"}
              </button>

              <label className="flex items-center justify-between gap-3 cursor-pointer pt-2 border-t border-border">
                <div>
                  <p className="font-medium">Appointment reminders</p>
                  <p className="text-sm text-muted-foreground">Uses reminder_lead_hours from your clinic</p>
                </div>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  aria-label="Enable appointment reminders"
                  className="w-4 h-4 rounded border-border"
                />
              </label>
              <div>
                <label htmlFor="settings-reminder-lead-hours" className="block text-sm font-medium mb-2">
                  Hours before appointment
                </label>
                <input
                  id="settings-reminder-lead-hours"
                  type="number"
                  min={1}
                  value={reminderLeadHours}
                  onChange={(e) => setReminderLeadHours(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                />
              </div>

              <label className="flex items-center justify-between gap-3 cursor-pointer pt-2 border-t border-border">
                <div>
                  <p className="font-medium">Follow-up automation</p>
                  <p className="text-sm text-muted-foreground">Clinic-level automation toggle</p>
                </div>
                <input
                  type="checkbox"
                  checked={followUpAutomation}
                  onChange={(e) => setFollowUpAutomation(e.target.checked)}
                  aria-label="Enable follow-up automation"
                  className="w-4 h-4 rounded border-border"
                />
              </label>
              <div>
                <label htmlFor="settings-follow-up-delay" className="block text-sm font-medium mb-2">
                  Follow-up delay (minutes)
                </label>
                <input
                  id="settings-follow-up-delay"
                  type="number"
                  min={5}
                  value={followUpDelayMinutes}
                  onChange={(e) => setFollowUpDelayMinutes(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Security</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Password and profile details are managed from your account page.</p>
            <Link to="/app/account" className="text-sm font-semibold text-primary hover:underline">
              Open account →
            </Link>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Appearance</h3>
            </div>
            <p className="text-sm text-muted-foreground">Widget color is edited in clinic information.</p>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm sticky top-8">
            <h3 className={cn(appSectionTitleClass, "mb-4")}>Save & publish</h3>
            <div className="space-y-2">
              <button
                type="button"
                data-testid="settings-save-changes"
                disabled={!hasChanges || saving}
                onClick={() => void handleSave()}
                className={`w-full px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${hasChanges && !saving ? "bg-primary text-white hover:bg-primary/90" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : hasChanges ? "Save changes" : "No changes"}
              </button>
            </div>
            {hasChanges && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-700">You have unsaved changes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showPauseConfirm}
        onClose={() => !pauseBusy && setShowPauseConfirm(false)}
        onConfirm={() => void handlePauseLive()}
        title="Pause assistant?"
        description="This sets your clinic to not live. Existing conversations are unchanged; new patient automation stops until you go live again."
        confirmLabel={pauseBusy ? "Pausing…" : "Pause"}
        variant="danger"
      />
    </div>
  );
}
