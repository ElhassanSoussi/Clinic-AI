"use client";

import { KeyRound, LogOut, Shield, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AccountPage() {
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Account"
        title="Profile & session"
        description="Account identity, clinic association, and secure sign-out controls."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold tracking-tight text-foreground truncate">{user?.full_name || "—"}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email || "—"}</p>
            </div>
          </div>

          <dl className="grid gap-3">
            {[
              { label: "Full name", value: user?.full_name || "—", icon: User },
              { label: "Clinic slug", value: user?.clinic_slug || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="row-card">
                <dt className="text-[0.72rem] font-bold uppercase tracking-[0.13em] text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-5 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Security</span>
          </div>

          <div className="row-card mb-4">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Password</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  Managed through your authentication provider. Use the sign-in flow to rotate credentials.
                </p>
              </div>
            </div>
          </div>

          <div className="row-card mb-6">
            <div className="flex items-start gap-3">
              <LogOut className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Active session</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  You are currently signed in. Signing out will clear this session.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="app-btn app-btn-secondary w-full"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
