"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  MessageSquare,
  ExternalLink,
  CreditCard,
  UserCircle,
  Activity,
  Rocket,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AccountDrawer } from "@/components/shared/AccountDrawer";
import { SettingsDrawer } from "@/components/shared/SettingsDrawer";
import { FloatingSetupPopup } from "@/components/shared/FloatingSetupPopup";
import { OnboardingFlow } from "@/components/shared/OnboardingFlow";
import { computeSystemStatus, STATUS_CONFIG } from "@/lib/system-status";
import type { BillingStatus, Clinic } from "@/types";

const sidebarNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [newLeadCount, setNewLeadCount] = useState(0);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<"account" | "settings" | null>(null);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [goLiveModal, setGoLiveModal] = useState(false);
  const [goLiveLoading, setGoLiveLoading] = useState(false);
  const [goLiveSuccess, setGoLiveSuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchNewLeadCount = useCallback(async () => {
    try {
      const leads = await api.leads.list("new");
      setNewLeadCount(leads.length);
    } catch {
      // Silently ignore — badge is a convenience, not critical
    }
  }, []);

  const fetchBilling = useCallback(async () => {
    try {
      const data = await api.billing.getStatus();
      setBilling(data);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchClinic = useCallback(async () => {
    try {
      const data = await api.clinics.getMyClinic();
      setClinic(data);
    } catch {
      // Non-critical for status badge
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && !onboardingChecked) {
      api.clinics
        .getMyClinic()
        .then((data) => {
          setClinic(data);
          setOnboardingChecked(true);
        })
        .catch(() => setOnboardingChecked(true));
    }
  }, [isAuthenticated, onboardingChecked]);

  useEffect(() => {
    if (isAuthenticated && onboardingChecked) {
      const timeoutId = window.setTimeout(() => {
        void fetchNewLeadCount();
        void fetchBilling();
        void fetchClinic();
      }, 0);
      const interval = window.setInterval(() => {
        void fetchNewLeadCount();
      }, 60000);
      return () => {
        window.clearTimeout(timeoutId);
        window.clearInterval(interval);
      };
    }
  }, [isAuthenticated, onboardingChecked, fetchNewLeadCount, fetchBilling, fetchClinic]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  /** Open settings drawer and auto-expand a specific section */
  const openSettingsTo = useCallback((section?: string | null) => {
    setSettingsSection(section ?? null);
    setActiveDrawer("settings");
  }, []);

  // Listen for custom event from child pages (e.g., dashboard "Fix now" button)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      openSettingsTo(detail);
    };
    window.addEventListener("open-settings-drawer", handler);
    return () => window.removeEventListener("open-settings-drawer", handler);
  }, [openSettingsTo]);

  if (isLoading || !onboardingChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Show guided onboarding for users who haven't gone live yet
  const setupStatus = clinic ? computeSystemStatus(clinic) : null;
  const showSetupFlow =
    clinic &&
    !clinic.is_live &&
    !clinic.onboarding_completed &&
    setupStatus &&
    (setupStatus.status === "NOT_READY" || setupStatus.status === "SETUP_INCOMPLETE");

  if (showSetupFlow) {
    return <OnboardingFlow clinic={clinic} onComplete={fetchClinic} />;
  }

  const planLabel = !billing
    ? null
    : billing.subscription_status === "trialing"
      ? "Free Trial"
      : billing.plan_name;

  const userInitial = (user?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase();

  const systemStatus = clinic ? computeSystemStatus(clinic) : null;
  const statusCfg = systemStatus ? STATUS_CONFIG[systemStatus.status] : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full">
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-slate-900">Clinic AI</span>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {sidebarNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
                {item.label === "Leads" && newLeadCount > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-semibold min-w-5 text-center">
                    {newLeadCount}
                  </span>
                )}
              </Link>
            );
          })}


          {user?.clinic_slug && (
            <Link
              href={`/chat/${user.clinic_slug}`}
              target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              Patient Chat
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-slate-400" />
            </Link>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64 flex flex-col h-screen">
        {/* Top bar */}
        <header className="shrink-0 h-14 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-end px-8 z-30">
          {/* System status CTA */}
          {statusCfg && systemStatus && (
            systemStatus.status === "READY" ? (
              <button
                onClick={() => setGoLiveModal(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mr-4 transition-colors bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                title="All setup complete — go live!"
              >
                <Rocket className="w-3.5 h-3.5" />
                Go Live
              </button>
            ) : systemStatus.status === "LIVE" ? (
              <span
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium mr-4 ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} cursor-default`}
                title="All systems configured — you're live"
              >
                <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            ) : (
              <button
                onClick={() => {
                  const first = systemStatus.items.find((i) => !i.completed);
                  openSettingsTo(first?.drawerSection ?? null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium mr-4 transition-colors ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} hover:opacity-80 cursor-pointer`}
                title={`${systemStatus.completedCount}/${systemStatus.totalCount} sections complete — click to fix`}
              >
                <span className={`w-2 h-2 rounded-full ${statusCfg.dot} animate-pulse`} />
                Complete setup
              </button>
            )
          )}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold select-none">
                {userInitial}
              </div>
            </button>

            {/* Dropdown */}
            <div
              className={`absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-2 transition-all origin-top-right ${
                menuOpen
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
              role="menu"
            >
              {/* User info */}
              <div className="px-3 py-2.5 mb-1">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                {planLabel && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      {planLabel}
                    </span>
                    {billing?.plan !== "premium" && (
                      <Link
                        href="/dashboard/billing"
                        onClick={() => setMenuOpen(false)}
                        className="px-2 py-0.5 text-[10px] font-medium text-teal-700 border border-teal-200 rounded-full hover:bg-teal-50 transition-colors"
                      >
                        Upgrade
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 my-1" />

              {/* Menu items */}
              <button
                onClick={() => { setMenuOpen(false); setActiveDrawer("account"); }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                role="menuitem"
              >
                <UserCircle className="w-4 h-4" />
                Account
              </button>
              <button
                onClick={() => { setMenuOpen(false); setActiveDrawer("settings"); }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                role="menuitem"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <Link
                href="/dashboard/billing"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                role="menuitem"
              >
                <CreditCard className="w-4 h-4" />
                Billing
              </Link>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                role="menuitem"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>

      {/* Right-side drawers */}
      <AccountDrawer open={activeDrawer === "account"} onClose={() => setActiveDrawer(null)} />
      <SettingsDrawer
        open={activeDrawer === "settings"}
        onClose={() => { setActiveDrawer(null); setSettingsSection(null); fetchClinic(); }}
        initialSection={settingsSection}
      />

      {/* Floating setup assistant */}
      <FloatingSetupPopup clinic={clinic} onGoLive={() => setGoLiveModal(true)} />

      {/* Go Live confirmation modal */}
      {goLiveModal && !goLiveSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-teal-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Go Live</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your AI assistant is ready to start receiving real patients. Once live, the chat widget will show as active and conversations will generate real leads.
              </p>
            </div>
            <div className="px-6 pb-6 flex items-center gap-3">
              <button
                onClick={() => setGoLiveModal(false)}
                disabled={goLiveLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Not yet
              </button>
              <button
                onClick={async () => {
                  setGoLiveLoading(true);
                  try {
                    await api.clinics.goLive();
                    await fetchClinic();
                    setGoLiveModal(false);
                    setGoLiveSuccess(true);
                    setTimeout(() => setGoLiveSuccess(false), 4000);
                  } catch { /* keep modal open on error */ }
                  setGoLiveLoading(false);
                }}
                disabled={goLiveLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-70"
              >
                {goLiveLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    Go Live
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Go Live success celebration */}
      {goLiveSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 text-center px-8 py-10">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">You&apos;re Live! 🎉</h2>
            <p className="text-sm text-slate-500 mb-6">
              Your AI assistant is now receiving patients. Appointment requests will appear on your dashboard.
            </p>
            <button
              onClick={() => setGoLiveSuccess(false)}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
