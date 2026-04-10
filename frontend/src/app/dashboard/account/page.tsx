"use client";

import { Lock, UserCog } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AccountPage() {
  const { user, logout } = useAuth();

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Account"
        title="Profile and session"
        description="A simple account surface for profile context, team identity, and secure sign-out."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel-surface rounded-4xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-app-primary" />
            <span className="text-sm font-bold text-app-text">Profile</span>
          </div>
          <dl className="grid gap-4">
            {[
              ["Full name", user?.full_name || "Unknown user"],
              ["Email", user?.email || "Unknown email"],
              ["Clinic slug", user?.clinic_slug || "Unavailable"],
            ].map(([label, value]) => (
              <div key={label} className="metric-mini">
                <dt className="panel-section-head text-[0.68rem]">{label}</dt>
                <dd className="mt-1.5 text-sm font-semibold text-app-text">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="panel-surface rounded-4xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <Lock className="h-4 w-4 text-app-primary" />
            <span className="text-sm font-bold text-app-text">Security &amp; session</span>
          </div>
          <p className="text-sm leading-7 text-app-text-secondary">
            Password management is handled by the active authentication provider. If you signed in with email and password, use the auth flow to rotate credentials safely.
          </p>
          <button type="button" className="app-btn app-btn-secondary mt-6" onClick={() => void logout()}>
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
