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
    <div className="workspace-page space-y-6">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <User className="h-3.5 w-3.5" />
            Account and security
          </>
        }
        title="Account & security"
        description="Identity and sign-in for this workspace owner—separate from clinic configuration in Settings."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(14rem,17.5rem)_1fr]">
        {/* Summary rail */}
        <aside className="order-2 xl:order-none xl:sticky xl:top-6 xl:self-start">
          <div className="wave-command-slab space-y-3 !py-4">
            <p className="workspace-section-label">Signed-in operator</p>
            <div className="rounded-lg border border-[#E2E8F0] bg-white/80 px-3 py-2.5 shadow-sm">
              <p className="text-xs text-[#64748B]">Email</p>
              <p className="mt-0.5 text-sm font-semibold text-[#0F172A] break-all">{user?.email || "Unknown"}</p>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] bg-white/80 px-3 py-2.5 shadow-sm">
              <p className="text-xs text-[#64748B]">Role</p>
              <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">Owner</p>
            </div>
            <p className="text-xs leading-relaxed text-[#64748B]">
              Use this page for profile and password only. Clinic hours, services, and embed live under Settings.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <div className="order-1 min-w-0 space-y-4 xl:order-none">
          {/* Profile Section */}
          <section className="ds-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("profile")}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-[#F8FAFC]"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#475569]" />
                <h2 className="text-base font-semibold text-[#0F172A]">Profile</h2>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform ${openSections.has("profile") ? "rotate-180" : ""}`} />
            </button>
            {openSections.has("profile") && (
              <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
                {profileFeedback && (
                  <Feedback state={profileFeedback} />
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="full-name" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                      Full name
                    </label>
                    <input
                      id="full-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                    />
                  </div>
                  <div>
                    <label htmlFor="account-email" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                      Email
                    </label>
                    <input
                      id="account-email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#475569] cursor-not-allowed"
                    />
                    <p className="ds-muted-text mt-1">
                      Email is tied to your login. Contact support to change it.
                    </p>
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-[#0F172A] mb-1.5">
                      Role
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-[#115E59] bg-[#CCFBF1] rounded-lg">
                      Owner
                    </span>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={savingProfile || !fullName.trim()}
                      className="flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <section className="ds-card overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("password")}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-[#F8FAFC]"
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#475569]" />
                <h2 className="text-base font-semibold text-[#0F172A]">Change password</h2>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform ${openSections.has("password") ? "rotate-180" : ""}`} />
            </button>
            {openSections.has("password") && (
              <div className="px-5 pb-5 border-t border-[#E2E8F0] pt-4">
                {passwordFeedback && (
                  <Feedback state={passwordFeedback} />
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="current-password" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                      Current password
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                      New password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                      Confirm new password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={savingPassword}
                      className="flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </div>
    </div>
  );
}

function Feedback({ state }: Readonly<{ state: NonNullable<FeedbackState> }>) {
  return (
    <div
      className={`mb-4 p-3 text-sm rounded-lg border flex items-center gap-2 ${state.type === "success"
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
