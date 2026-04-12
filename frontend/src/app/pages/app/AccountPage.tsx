import { useCallback, useEffect, useMemo, useState } from "react";
import { User, Mail, Building, Shield, Key, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { userFacingApiError } from "@/lib/api";
import { fetchClinicMe, updateAuthProfile, changePassword } from "@/lib/api/services";
import type { Clinic } from "@/lib/api/types";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { cn } from "@/app/components/ui/utils";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleClass, appSectionTitleClass } from "@/lib/page-layout";

export function AccountPage() {
  const { session, patchSession } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clinicLoadError, setClinicLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyPw, setBusyPw] = useState(false);

  useEffect(() => {
    if (session?.fullName) {
      setFullName(session.fullName);
    }
  }, [session?.fullName]);

  const loadClinic = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }
    setLoading(true);
    setClinicLoadError(null);
    try {
      const c = await fetchClinicMe(session.accessToken);
      setClinic(c);
    } catch (e) {
      setClinic(null);
      setClinicLoadError(userFacingApiError(e, "Could not load clinic details"));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void loadClinic();
  }, [loadClinic]);

  const profileDirty = useMemo(
    () => fullName.trim() !== (session?.fullName ?? "").trim(),
    [fullName, session?.fullName],
  );

  const saveProfile = async () => {
    if (!session?.accessToken) {
      return;
    }
    setBusyProfile(true);
    setError(null);
    setOk(null);
    try {
      const nextName = fullName.trim();
      await updateAuthProfile(session.accessToken, { full_name: nextName });
      patchSession({ fullName: nextName });
      setOk("Profile updated.");
      notifySuccess("Profile updated");
    } catch (e) {
      const msg = userFacingApiError(e, "Profile update failed");
      setError(msg);
      notifyError(msg);
    } finally {
      setBusyProfile(false);
    }
  };

  const savePassword = async () => {
    if (!session?.accessToken) {
      return;
    }
    setBusyPw(true);
    setError(null);
    setOk(null);
    try {
      await changePassword(session.accessToken, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setOk("Password updated.");
      notifySuccess("Password updated");
    } catch (e) {
      const msg = userFacingApiError(e, "Password change failed");
      setError(msg);
      notifyError(msg);
    } finally {
      setBusyPw(false);
    }
  };

  const initial = (fullName || session?.email || "?").charAt(0).toUpperCase();

  return (
    <div className={cn(appPagePaddingClass, "max-w-3xl")}>
      <div className="mb-8">
        <h1 className={appPageTitleClass}>Account</h1>
        <p className={appPageSubtitleClass}>
          Your name, email, and password for this login. Branding, chat, and automation for the whole practice are under Settings.
        </p>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        {ok && <p className="text-sm text-emerald-700 mt-2">{ok}</p>}
      </div>

      <div className="space-y-6">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-border">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-sm ring-4 ring-primary/10">
              <span className="text-2xl font-bold text-primary-foreground">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={cn(appSectionTitleClass, "text-xl flex items-center gap-2")}>
                <User className="w-5 h-5 text-primary" />
                Profile summary
              </h2>
              <p className="text-sm font-medium text-foreground mt-1 truncate">{session?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Used for sign-in and operational notifications to you as a user.</p>
            </div>
          </div>
          <label htmlFor="account-full-name" className="block text-sm font-medium mb-2">
            Full name
          </label>
          <input
            id="account-full-name"
            type="text"
            data-testid="account-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg mb-4"
          />
          <button
            type="button"
            data-testid="account-save-profile"
            disabled={busyProfile || !profileDirty}
            onClick={() => void saveProfile()}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50 shadow-sm"
          >
            {busyProfile ? "Saving…" : profileDirty ? "Save profile" : "No changes"}
          </button>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className={cn(appSectionTitleClass, "text-lg mb-1 flex items-center gap-2")}>
            <Building className="w-5 h-5 text-primary" />
            Clinic membership
          </h2>
          <p className="text-sm text-muted-foreground mb-4">The practice you&apos;re signed into (read-only here).</p>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && clinicLoadError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive space-y-2">
              <p>{clinicLoadError}</p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadClinic()}
                className="px-3 py-1.5 rounded-md border border-border bg-white text-foreground text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && clinic && (
            <div className="rounded-lg border border-border bg-slate-50/80 p-4 text-sm">
              <div className="flex items-start gap-2 text-foreground">
                <Mail className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold">{clinic.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5 font-mono">slug · {clinic.slug}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Update branding, channels, and automation under <span className="font-semibold text-foreground">Settings</span> in the sidebar.
              </p>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className={cn(appSectionTitleClass, "text-lg mb-1 flex items-center gap-2")}>
            <Shield className="w-5 h-5 text-primary" />
            Security
          </h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Session list, device management, and audit history are not exposed by this API — password rotation is managed here.
          </p>
          <div className="space-y-4 max-w-md">
            <div>
              <label htmlFor="account-current-password" className="block text-sm font-medium mb-1">
                Current password
              </label>
              <div className="relative">
                <input
                  id="account-current-password"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg"
                />
                <button
                  type="button"
                  aria-label={showCurrent ? "Hide current password" : "Show current password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="account-new-password" className="block text-sm font-medium mb-1">
                New password
              </label>
              <div className="relative">
                <input
                  id="account-new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg"
                />
                <button
                  type="button"
                  aria-label={showNew ? "Hide new password" : "Show new password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={busyPw || !currentPassword || !newPassword}
              onClick={() => void savePassword()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50 shadow-sm"
            >
              <Key className="w-4 h-4" />
              {busyPw ? "Updating…" : "Update password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
