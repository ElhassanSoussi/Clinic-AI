import { useEffect, useState } from "react";
import { User, Mail, Building, Shield, Key, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchClinicMe, updateAuthProfile, changePassword } from "@/lib/api/services";
import type { Clinic } from "@/lib/api/types";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { cn } from "@/app/components/ui/utils";
import { appPagePaddingClass, appPageTitleClass } from "@/lib/page-layout";

export function AccountPage() {
  const { session, patchSession } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyPw, setBusyPw] = useState(false);

  useEffect(() => {
    if (session?.fullName) {
      setFullName(session.fullName);
    }
  }, [session?.fullName]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const c = await fetchClinicMe(session.accessToken);
        if (!cancelled) {
          setClinic(c);
        }
      } catch {
        if (!cancelled) {
          setClinic(null);
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
  }, [session?.accessToken]);

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
      const msg = e instanceof ApiError ? e.message : "Profile update failed";
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
      const msg = e instanceof ApiError ? e.message : "Password change failed";
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
        <p className="text-muted-foreground">Profile and password for your signed-in user</p>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        {ok && <p className="text-sm text-emerald-700 mt-2">{ok}</p>}
      </div>

      <div className="space-y-6">
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{initial}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </h2>
              <p className="text-sm text-muted-foreground">{session?.email}</p>
            </div>
          </div>
          <label className="block text-sm font-medium mb-2">Full name</label>
          <input
            type="text"
            data-testid="account-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg mb-4"
          />
          <button
            type="button"
            data-testid="account-save-profile"
            disabled={busyProfile}
            onClick={() => void saveProfile()}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
          >
            {busyProfile ? "Saving…" : "Save profile"}
          </button>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Clinic
          </h2>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && clinic && (
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                {clinic.name} · {clinic.slug}
              </div>
              <p className="text-xs text-muted-foreground">Clinic-wide settings are under Settings in the app nav.</p>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Session list, device management, and audit history are not exposed by this API — only password change is available here.
          </p>
          <div className="space-y-3 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">Current password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={busyPw || !currentPassword || !newPassword}
              onClick={() => void savePassword()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
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
