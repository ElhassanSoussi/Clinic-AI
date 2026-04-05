"use client";

import { useState } from "react";
import { User, Lock, Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

export default function AccountPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<FeedbackState>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["profile"]));

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) return;
    setSavingProfile(true);
    setProfileFeedback(null);
    try {
      await api.auth.updateProfile({ full_name: fullName.trim() });
      setProfileFeedback({ type: "success", message: "Profile updated." });
      // Update localStorage so sidebar reflects the change
      const stored = localStorage.getItem("auth_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.full_name = fullName.trim();
          localStorage.setItem("auth_user", JSON.stringify(parsed));
        } catch { /* ignore */ }
      }
      setTimeout(() => setProfileFeedback(null), 3000);
    } catch (err) {
      setProfileFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordFeedback(null);
    if (!currentPassword || !newPassword) {
      setPasswordFeedback({ type: "error", message: "Please fill in all password fields." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: "error", message: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", message: "New passwords do not match." });
      return;
    }
    setSavingPassword(true);
    try {
      await api.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordFeedback({ type: "success", message: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordFeedback(null), 3000);
    } catch (err) {
      setPasswordFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to change password.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={
          <>
            <User className="h-3.5 w-3.5" />
            Account and security
          </>
        }
        title="Account & security"
        description="Profile information, password, and the operator identity displayed across the workspace."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[240px_1fr_240px]">
        {/* Left rail */}
        <aside className="hidden xl:block">
          <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Account overview</p>
            <div className="mt-3 space-y-2.5">
              <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <p className="text-[10px] text-slate-400">Signed in as</p>
                <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{user?.email || "Unknown"}</p>
              </div>
              <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <p className="text-[10px] text-slate-400">Role</p>
                <p className="mt-0.5 text-[13px] font-semibold text-slate-900">Owner</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="space-y-2">
        {/* Profile Section */}
        <section className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("profile")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.has("profile") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("profile") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              {profileFeedback && (
                <Feedback state={profileFeedback} />
              )}
              <div className="space-y-4">
                <div>
                  <label htmlFor="full-name" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Full name
                  </label>
                  <input
                    id="full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-100 rounded-lg bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <label htmlFor="account-email" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="account-email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-100 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>
                <div>
                  <span className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Role
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 text-[13px] font-medium text-teal-700 bg-teal-50 rounded-lg">
                    Owner
                  </span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile || !fullName.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Save profile"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Password Section */}
        <section className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("password")}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.has("password") ? "rotate-180" : ""}`} />
          </button>
          {openSections.has("password") && (
            <div className="px-5 pb-5 border-t border-slate-100 pt-4">
              {passwordFeedback && (
                <Feedback state={passwordFeedback} />
              )}
              <div className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Current password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-100 rounded-lg bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-100 rounded-lg bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-100 rounded-lg bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    autoComplete="new-password"
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={savingPassword}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Change password"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
        </div>

        {/* Right rail */}
        <aside className="hidden xl:block">
          <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Security note</p>
            <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-500">
              <p>Your account controls the operator identity shown across the workspace.</p>
              <p>Use this page to keep sign-in secure without changing the rest of the clinic configuration.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Feedback({ state }: Readonly<{ state: NonNullable<FeedbackState> }>) {
  return (
    <div
      className={`mb-4 p-3 text-sm rounded-lg border flex items-center gap-2 ${
        state.type === "success"
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : "bg-red-50 text-red-700 border-red-100"
      }`}
    >
      {state.type === "success" ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      {state.message}
    </div>
  );
}
