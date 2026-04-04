"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  LayoutGrid,
  Users,
  Settings,
  LogOut,
  MessageSquareMore,
  ExternalLink,
  CreditCard,
  ContactRound,
  Activity,
  Rocket,
  CheckCircle2,
  Inbox,
  Sparkles,
  TriangleAlert,
  BriefcaseMedical,
  CalendarDays,
  Menu,
  X,
  Bell,
  ShieldCheck,
  UserCog,
  Search,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { computeSystemStatus, STATUS_CONFIG } from "@/lib/system-status";
import type { BillingStatus, Clinic } from "@/types";

const sidebarNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/dashboard/customers", label: "Customers", icon: ContactRound },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: TriangleAlert },
  { href: "/dashboard/operations", label: "Operations", icon: BriefcaseMedical },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/training", label: "AI Training", icon: Sparkles },
];

function settingsHref(section?: string | null): string {
  if (!section) return "/dashboard/settings";
  return `/dashboard/settings?section=${encodeURIComponent(section)}`;
}

function renderSystemStatusAction(
  systemStatus: ReturnType<typeof computeSystemStatus> | null,
  statusCfg: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG] | null,
  onGoLive: () => void,
  openSettingsPage: (section?: string | null) => void,
): React.ReactNode {
  if (!statusCfg || !systemStatus) return null;

  if (systemStatus.status === "READY") {
    return (
      <button
        onClick={onGoLive}
        className="flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-teal-500/20 transition-colors hover:bg-teal-700"
        title="All setup complete — go live!"
      >
        <Rocket className="w-3.5 h-3.5" />
        Go Live
      </button>
    );
  }

  if (systemStatus.status === "LIVE") {
    return (
      <span
        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} cursor-default`}
        title="All systems configured — you're live"
      >
        <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} /> {statusCfg.label}
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        const first = systemStatus.items.find((item) => item.completed === false);
        openSettingsPage(first?.drawerSection ?? null);
      }}
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} hover:opacity-80 cursor-pointer`}
      title={`${systemStatus.completedCount}/${systemStatus.totalCount} sections complete — click to fix`}
    >
      <span className={`w-2 h-2 rounded-full ${statusCfg.dot} animate-pulse`} /> Complete setup
    </button>
  );
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const openSettingsPage = useCallback(
    (section?: string | null) => {
      setMenuOpen(false);
      router.push(settingsHref(section));
    },
    [router],
  );

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
    if (isAuthenticated) {
      globalThis.queueMicrotask(() => {
        void fetchNewLeadCount();
        void fetchBilling();
        void fetchClinic();
      });
      const interval = globalThis.setInterval(() => {
        void fetchNewLeadCount();
      }, 60000);
      return () => {
        globalThis.clearInterval(interval);
      };
    }
  }, [isAuthenticated, fetchNewLeadCount, fetchBilling, fetchClinic]);

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

  useEffect(() => {
    if (!sidebarOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  const setupStatus = clinic ? computeSystemStatus(clinic) : null;
  const showSetupFlow =
    clinic &&
    !clinic.is_live &&
    !clinic.onboarding_completed &&
    setupStatus &&
    (setupStatus.status === "NOT_READY" || setupStatus.status === "SETUP_INCOMPLETE");

  useEffect(() => {
    if (showSetupFlow) {
      router.replace("/onboarding");
    }
  }, [showSetupFlow, router]);

  if (isLoading || showSetupFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  let planLabel: string | null = null;
  if (billing) {
    planLabel = billing.subscription_status === "trialing" ? "Free Trial" : billing.plan_name;
  }
  const userInitial = (user?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase();
  const systemStatus = clinic ? computeSystemStatus(clinic) : null;
  const statusCfg = systemStatus ? STATUS_CONFIG[systemStatus.status] : null;
  const systemStatusAction = renderSystemStatusAction(
    systemStatus,
    statusCfg,
    () => setGoLiveModal(true),
    openSettingsPage,
  );

  const activeNavItem =
    sidebarNav.find(
      (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
    ) ?? null;

  const sidebarContent = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="workspace-sidebar-section min-h-0 flex-1">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-violet-700 shadow-sm">
            Live
          </span>
        </div>
        <nav className="space-y-1 overflow-y-auto">
          {sidebarNav.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-[1.35rem] px-3.5 py-3 text-[13px] font-semibold transition-all ${
                  isActive
                    ? "bg-white text-slate-950 shadow-[0_16px_32px_rgba(91,67,143,0.1)] ring-1 ring-violet-100/90"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-[1rem] border ${
                    isActive
                      ? "border-violet-100 bg-gradient-to-br from-violet-50 to-teal-50 text-violet-700"
                      : "border-transparent bg-white/70 text-slate-500 group-hover:border-violet-100 group-hover:bg-white"
                  }`}
                >
                  <item.icon className="h-4.5 w-4.5" />
                </span>
                {item.label}
                {item.label === "Leads" && newLeadCount > 0 && (
                  <span className="ml-auto min-w-5 rounded-full bg-blue-500 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                    {newLeadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="workspace-sidebar-section">
        <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Channels
        </p>
        {user?.clinic_slug && (
          <Link
            href={`/chat/${user.clinic_slug}`}
            target="_blank"
            onClick={() => setSidebarOpen(false)}
            className="group flex items-center gap-3 rounded-[1.35rem] px-3.5 py-3 text-[13px] font-semibold text-slate-600 transition-all hover:bg-white/80 hover:text-slate-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[1rem] bg-white/70 text-slate-500 group-hover:bg-white">
              <MessageSquareMore className="h-4.5 w-4.5" />
            </span>
            Patient Chat
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-400" />
          </Link>
        )}
      </div>

      <div className="workspace-sidebar-support px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-gradient-to-br from-violet-50 to-teal-50 text-violet-700">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Operator control</p>
            <p className="text-xs leading-5 text-slate-500">
              Review, manual takeover, and visibility stay with your clinic team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-shell-bg min-h-screen">
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-[19.5rem] flex-col lg:flex">
        <div className="workspace-sidebar-card px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1.15rem] bg-gradient-to-br from-teal-600 to-violet-600 shadow-[0_18px_36px_rgba(91,67,143,0.18)]">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-base font-semibold tracking-tight text-slate-950">
                Clinic AI
              </span>
              <span className="text-xs text-slate-500">Front-desk operating system</span>
            </div>
          </div>
          {clinic ? (
            <div className="mt-5 rounded-[1.25rem] border border-violet-100/90 bg-white/80 px-3.5 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Clinic status
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{clinic.name}</p>
              </div>
              {statusCfg ? (
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}
                >
                  <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
                  {statusCfg.label}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex min-h-0 flex-1 flex-col">{sidebarContent}</div>
      </aside>

      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity ${
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 bg-slate-950/45"
          aria-label="Close navigation"
        />
        <aside
          className={`workspace-sidebar relative flex h-full w-72 max-w-[85vw] flex-col px-4 py-4 shadow-2xl transition-transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="workspace-sidebar-card flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-gradient-to-br from-teal-600 to-violet-600 shadow-[0_18px_36px_rgba(91,67,143,0.18)]">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="block font-semibold text-slate-950">Clinic AI</span>
                <span className="text-xs text-slate-500">Operator workspace</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 flex-1 overflow-y-auto">{sidebarContent}</div>
        </aside>
      </div>

      <div className="relative min-h-screen lg:pl-[21rem]">
        <div className="px-3 py-3 sm:px-4 lg:px-5">
          <div className="workspace-main-frame flex min-h-[calc(100vh-1.5rem)] flex-col">
            <header className="workspace-topbar sticky top-0 z-30">
              <div className="px-4 py-4 sm:px-6 lg:px-7">
                <div className="workspace-header-stack">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-500 transition-colors hover:bg-white hover:text-slate-900 lg:hidden"
                      aria-label="Open navigation"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Clinic workspace
                      </p>
                      <p className="truncate text-lg font-semibold tracking-tight text-slate-950">
                        {activeNavItem?.label ?? "Dashboard"}
                      </p>
                    </div>
                  </div>

                  <Link href="/dashboard/inbox" className="workspace-search">
                    <Search className="h-4.5 w-4.5 text-violet-500" />
                    <span className="flex-1 text-sm font-medium text-slate-500">
                      Search inbox, requests, and patients
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                      /
                    </span>
                  </Link>

                  <div className="flex items-center justify-end gap-2 sm:gap-3">
                    <div className="hidden xl:flex xl:items-center xl:gap-2">
                      {systemStatusAction}
                    </div>
                    <button
                      className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition-colors hover:bg-white lg:inline-flex"
                      aria-label="Notifications"
                      type="button"
                    >
                      <Bell className="h-4.5 w-4.5" />
                    </button>
                    <div ref={menuRef} className="relative">
                      <button
                        onClick={() => setMenuOpen((value) => !value)}
                        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-2 py-1.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                        aria-haspopup="true"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-violet-600 text-xs font-bold text-white select-none">
                          {userInitial}
                        </div>
                        <div className="hidden text-left sm:block">
                          <p className="max-w-32 truncate text-xs font-semibold text-slate-900">
                            {user?.full_name || "Clinic user"}
                          </p>
                          <p className="max-w-32 truncate text-[11px] text-slate-500">
                            {planLabel || "Workspace"}
                          </p>
                        </div>
                      </button>

                      <div
                        className={`absolute right-0 mt-2 w-72 origin-top-right rounded-[1.5rem] border border-slate-200 bg-white/96 p-2 shadow-2xl shadow-slate-900/8 transition-all ${
                          menuOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                        }`}
                        role="menu"
                      >
                <div className="mb-1 rounded-2xl bg-slate-50 px-3.5 py-3">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  {planLabel && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                        {planLabel}
                      </span>
                      {billing?.plan !== "premium" && (
                        <Link
                          href="/dashboard/billing"
                          onClick={() => setMenuOpen(false)}
                          className="rounded-full border border-teal-200 px-2 py-0.5 text-[10px] font-medium text-teal-700 transition-colors hover:bg-teal-50"
                        >
                          Upgrade
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 my-1" />

                <Link
                  href="/dashboard/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  role="menuitem"
                >
                  <UserCog className="w-4 h-4" />
                  Account
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  role="menuitem"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <Link
                  href="/dashboard/billing"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  role="menuitem"
                >
                  <CreditCard className="w-4 h-4" />
                  Billing
                </Link>
                <Link
                  href="/dashboard/settings?section=google-sheets"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  role="menuitem"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Security & setup
                </Link>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout().catch(() => {
                      // Keep the menu state stable if logout fails.
                    });
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="relative flex-1 overflow-y-auto">
              <div className="sm:hidden px-4 pt-4">{systemStatusAction}</div>
              <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-7">{children}</div>
            </main>
          </div>
        </div>
      </div>

      {goLiveModal && !goLiveSuccess && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-900/15">
            <div className="px-6 pt-6 pb-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50">
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
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
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
                  } catch {
                    // keep modal open on error
                  }
                  setGoLiveLoading(false);
                }}
                disabled={goLiveLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-70"
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

      {goLiveSuccess && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-[28px] bg-white px-8 py-10 text-center shadow-2xl shadow-slate-900/15">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">You&apos;re Live! 🎉</h2>
            <p className="text-sm text-slate-500 mb-6">
              Your AI assistant is now receiving patients. Appointment requests will appear on your dashboard.
            </p>
            <button
              onClick={() => setGoLiveSuccess(false)}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
