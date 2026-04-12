import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Check, Building, Clock, Zap, Copy, CheckCircle, ChevronRight, Sparkles, MessageSquare } from "lucide-react";
import { BusinessHoursEditor } from "@/app/components/BusinessHoursEditor";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchClinicMe, goLiveClinic, updateClinicMe } from "@/lib/api/services";
import type { Clinic } from "@/lib/api/types";
import { getPublicOrigin } from "@/lib/site";
import type { DaySchedule, Weekday } from "@/lib/business-hours";
import {
  defaultBusinessHours,
  parseBusinessHours,
  serializeBusinessHours,
  validateBusinessHours,
} from "@/lib/business-hours";
import { notifyError, notifySuccess } from "@/lib/feedback";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [greeting, setGreeting] = useState("");
  const [fallback, setFallback] = useState("");
  const [hoursSchedule, setHoursSchedule] = useState<Record<Weekday, DaySchedule>>(() => defaultBusinessHours());

  const load = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }
    setLoading(true);
    try {
      const c = await fetchClinicMe(session.accessToken);
      setClinic(c);
      setName(c.name || "");
      setPhone(c.phone || "");
      setGreeting(c.greeting_message || "");
      setFallback(c.fallback_message || "");
      setHoursSchedule(parseBusinessHours(c.business_hours));
      const s = c.onboarding_step && c.onboarding_step >= 1 && c.onboarding_step <= 3 ? c.onboarding_step : 1;
      setStep(c.onboarding_completed ? 3 : s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clinic");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveStep1 = async () => {
    if (!session?.accessToken) {
      return;
    }
    if (!name.trim()) {
      const msg = "Clinic name is required.";
      setError(msg);
      notifyError(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateClinicMe(session.accessToken, {
        name: name.trim(),
        phone: phone.trim(),
        greeting_message: greeting.trim(),
        fallback_message: fallback.trim(),
        onboarding_step: 2,
      });
      setClinic(updated);
      setStep(2);
      notifySuccess("Step 1 saved");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Save failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveStep2 = async () => {
    if (!session?.accessToken) {
      return;
    }
    const hoursErr = validateBusinessHours(hoursSchedule);
    if (hoursErr) {
      setError(hoursErr);
      notifyError(hoursErr);
      return;
    }
    const business_hours = serializeBusinessHours(hoursSchedule);
    setSaving(true);
    setError(null);
    try {
      const updated = await updateClinicMe(session.accessToken, {
        business_hours,
        onboarding_step: 3,
      });
      setClinic(updated);
      setStep(3);
      notifySuccess("Business hours saved");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Save failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!session?.accessToken) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await goLiveClinic(session.accessToken);
      await updateClinicMe(session.accessToken, { onboarding_completed: true, onboarding_step: 3 });
      notifySuccess("Welcome aboard", "Your clinic is live. Redirecting to the dashboard.");
      navigate("/app/dashboard");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not finish onboarding";
      setError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, title: "Clinic info", icon: Building },
    { number: 2, title: "Hours", icon: Clock },
    { number: 3, title: "Go live", icon: Zap },
  ];

  const progressPercentage = (step / 3) * 100;
  const chatUrl = clinic ? `${getPublicOrigin()}/chat?slug=${encodeURIComponent(clinic.slug)}` : "";

  const hoursSummary = useMemo(() => {
    const open = (["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).filter(
      (d) => !hoursSchedule[d].closed,
    ).length;
    return `${open} day(s) open · stored as structured JSON`;
  }, [hoursSchedule]);

  if (loading && !clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Loading onboarding…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl min-w-0">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-border mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Welcome to Clinic AI</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-3">Let&apos;s get you set up</h1>
          <p className="text-base sm:text-lg text-muted-foreground px-1">
            Connect real clinic data — no placeholder configuration
          </p>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </div>

        <div className="mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex items-center justify-between mb-4 min-w-[min(100%,520px)] sm:min-w-0">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.number;
              const isComplete = step > s.number;
              return (
                <div key={s.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isComplete
                        ? "bg-primary text-white ring-4 ring-primary/20"
                        : isActive
                          ? "bg-primary text-white ring-4 ring-primary/30 scale-110"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {isComplete ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <p className={`text-sm font-medium mt-2 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-4 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${step > s.number ? "bg-primary w-full" : "w-0"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-8 border border-border shadow-xl">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Clinic profile</h2>
              <p className="text-muted-foreground mb-6">These fields map directly to `/api/clinics/me`.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Clinic name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Greeting message</label>
                  <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3} className="w-full px-4 py-3 border border-border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Fallback message</label>
                  <textarea value={fallback} onChange={(e) => setFallback(e.target.value)} rows={2} className="w-full px-4 py-3 border border-border rounded-lg" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Business hours</h2>
              <p className="text-muted-foreground mb-4">Set open days and times. We save the same structured JSON your clinic record expects.</p>
              <BusinessHoursEditor value={hoursSchedule} onChange={setHoursSchedule} disabled={saving} />
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Review & go live</h2>
              <p className="text-muted-foreground mb-6">
                Confirm details below, then enable your assistant. This uses the real go-live endpoint and marks onboarding complete.
              </p>
              <div className="p-4 bg-slate-50 border border-border rounded-xl mb-4 text-sm space-y-2">
                <p>
                  <span className="font-semibold">Clinic:</span> {name.trim() || "—"} · {phone.trim() || "no phone"}
                </p>
                <p>
                  <span className="font-semibold">Hours:</span> {hoursSummary}
                </p>
                <p className="text-muted-foreground">
                  After go-live, you can pause automation anytime from Settings without losing configuration.
                </p>
              </div>
              <div className="p-5 border border-border rounded-xl mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Public chat</h3>
                </div>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs break-all relative">
                  {chatUrl}
                  <button
                    type="button"
                    onClick={() => chatUrl && navigator.clipboard.writeText(chatUrl)}
                    className="absolute top-2 right-2 p-2 bg-slate-700 rounded text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 border border-border rounded-xl flex gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  SMS numbers and advanced channel setup appear under Settings → Channels after your workspace is provisioned.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-8 pt-6 border-t border-slate-200">
            {step > 1 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium w-full sm:w-auto">
                Back
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}
            {step === 1 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveStep1()}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto sm:ml-auto"
              >
                Save & continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveStep2()}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto sm:ml-auto"
              >
                Save & continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void finish()}
                className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium flex items-center justify-center gap-2 text-base sm:text-lg disabled:opacity-50 w-full sm:w-auto sm:ml-auto"
              >
                <Zap className="w-5 h-5" />
                {saving ? "Finishing…" : "Go live & open dashboard"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
