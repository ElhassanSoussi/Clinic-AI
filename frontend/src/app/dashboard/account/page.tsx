"use client";

import { useState } from "react";
import {
  User,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Mail,
  UserCircle2,
} from "lucide-react";
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

      <div className="workspace-stage">
        <aside className="workspace-side-rail">
          <div className="wave-command-slab space-y-4 !py-4 xl:sticky xl:top-6">
            <div>
              <p className="workspace-section-label">Signed-in operator</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">
                {fullName.trim() || "Workspace owner"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#475569]">
                Manage your personal sign-in surface here. Clinic messaging, services, and embed settings stay in the main Settings control center.
              </p>
            </div>

            <div className="space-y-2">
              <div className="rounded-xl border border-[#DDE5EE] bg-white/90 px-3.5 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Email</p>
                <p className="mt-1 break-all text-sm font-semibold text-[#0F172A]">{user?.email || "Unknown"}</p>
              </div>
              <div className="rounded-xl border border-[#DDE5EE] bg-white/90 px-3.5 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Role</p>
                <p className="mt-1 text-sm font-semibold text-[#0F172A]">Owner</p>
              </div>
              <div className="rounded-xl border border-[#DDE5EE] bg-white/90 px-3.5 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Security model</p>
                <p className="mt-1 text-sm font-semibold text-[#0F172A]">Profile + password only</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#C7D2FE] bg-gradient-to-br from-white to-[#F5F3FF] px-4 py-4 shadow-sm">
              <p className="workspace-rail-title">Account guide</p>
              <p className="mt-2 text-sm leading-relaxed text-[#475569]">
                Update your name here so the workspace header and ownership metadata stay accurate. Password changes affect only this sign-in identity.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5 xl:col-span-2">
          <section className="ds-control-hero-panel p-5 sm:p-6">
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div>
                  <p className="workspace-section-label">Identity overview</p>
                  <h2 className="mt-2 text-[1.9rem] font-bold tracking-[-0.04em] text-[#0F172A] sm:text-[2.2rem]">
                    Keep owner access calm, clear, and recoverable.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#475569]">
                    This surface only controls the operator identity behind the workspace. It does not change live clinic messaging, services, or patient-facing settings.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#DDE5EE] bg-white/90 px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-2 text-[#0F766E]">
                      <UserCircle2 className="h-4 w-4" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Display name</p>
                    </div>
                    <p className="mt-3 text-base font-semibold text-[#0F172A]">
                      {fullName.trim() || "Not set yet"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#DDE5EE] bg-white/90 px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-2 text-[#0F766E]">
                      <Mail className="h-4 w-4" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Login email</p>
                    </div>
                    <p className="mt-3 truncate text-base font-semibold text-[#0F172A]">
                      {user?.email || "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#DDE5EE] bg-white/90 px-4 py-4 shadow-sm">
                    <div className="flex items-center gap-2 text-[#0F766E]">
                      <ShieldCheck className="h-4 w-4" />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Access</p>
                    </div>
                    <p className="mt-3 text-base font-semibold text-[#0F172A]">Workspace owner</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-[#DDE5EE] bg-white/92 p-5 shadow-[var(--ds-shadow-md)]">
                <p className="workspace-rail-title">Account boundaries</p>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#475569]">
                  <p>Clinic services, hours, FAQs, branding, and embed settings live in the Settings control center.</p>
                  <p>This page is only for your owner identity and login safety.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="ds-card overflow-hidden">
              <div className="border-b border-[#E2E8F0] px-5 py-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#475569]" />
                  <h2 className="text-base font-semibold text-[#0F172A]">Profile details</h2>
                </div>
                <p className="mt-2 text-sm text-[#475569]">
                  Keep the display name accurate so the workspace header and activity metadata always identify the correct owner.
                </p>
              </div>
              <div className="px-5 py-5">
                {profileFeedback && <Feedback state={profileFeedback} />}
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
                      className="w-full rounded-xl border border-[#DDE5EE] bg-white px-4 py-3 text-sm text-[#0F172A] shadow-sm focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="account-email" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                        Email
                      </label>
                      <input
                        id="account-email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569] shadow-sm cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-[#0F172A] mb-1.5">
                        Role
                      </span>
                      <span className="inline-flex min-h-[3rem] w-full items-center rounded-xl border border-[#99f6e4] bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-[#115E59] shadow-sm">
                        Workspace owner
                      </span>
                    </div>
                  </div>
                  <p className="ds-muted-text">
                    Email is tied to your login identity. If it ever needs to change, support should handle that with care.
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={savingProfile || !fullName.trim()}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0F8F83] via-[#0F8F83] to-[#14B8A6] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_34px_-22px_rgba(15,143,131,0.9)] transition-all hover:translate-y-[-1px] hover:from-[#0F766E] hover:to-[#0F8F83] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save profile"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="ds-card overflow-hidden">
              <div className="border-b border-[#E2E8F0] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#475569]" />
                  <h2 className="text-base font-semibold text-[#0F172A]">Password security</h2>
                </div>
                <p className="mt-2 text-sm text-[#475569]">
                  Change the owner password here without touching clinic setup. This action only affects how you sign in.
                </p>
              </div>
              <div className="px-5 py-5">
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
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0F8F83] via-[#0F8F83] to-[#14B8A6] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_34px_-22px_rgba(15,143,131,0.9)] transition-all hover:translate-y-[-1px] hover:from-[#0F766E] hover:to-[#0F8F83] disabled:cursor-not-allowed disabled:opacity-50"
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
            </section>
          </div>
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
