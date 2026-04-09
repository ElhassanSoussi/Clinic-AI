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
  Inbox,
  Sparkles,
  TriangleAlert,
  BriefcaseMedical,
  CalendarDays,
  Menu,
  X,
  ShieldCheck,
  UserCog,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { computeSystemStatus, STATUS_CONFIG } from "@/lib/system-status";
import type { BillingStatus, Clinic } from "@/types";
import { GoLiveModals } from "@/components/shared/GoLiveModals";

/* ─── Navigation config ─── */
const sidebarNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, group: "Operate" },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, group: "Operate" },
  { href: "/dashboard/leads", label: "Leads", icon: Users, group: "Operate" },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays, group: "Operate" },
  { href: "/dashboard/customers", label: "Customers", icon: ContactRound, group: "Operate" },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: TriangleAlert, group: "Operate" },
  { href: "/dashboard/operations", label: "Operations", icon: BriefcaseMedical, group: "Operate" },
  { href: "/dashboard/activity", label: "Activity", icon: Activity, group: "Operate" },
  { href: "/dashboard/training", label: "AI Training", icon: Sparkles, group: "Configure" },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, group: "Configure" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, group: "Configure" },
];

const sidebarGroups = [
  { label: "Operate", items: sidebarNav.filter((item) => item.group === "Operate") },
  { label: "Configure", items: sidebarNav.filter((item) => item.group === "Configure") },
] as const;

function settingsHref(section?: string | null): string {
  if (!section) return "/dashboard/settings";
  return `/dashboard/settings?section=${encodeURIComponent(section)}`;
}

/* ─── System status CTA ─── */
function SystemStatusCTA({
  systemStatus,
  statusCfg,
  onGoLive,
  openSettingsPage,
}: {
  readonly systemStatus: ReturnType<typeof computeSystemStatus> | null;
  readonly statusCfg: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG] | null;
  readonly onGoLive: () => void;
  readonly openSettingsPage: (section?: string | null) => void;
}) {
  if (!statusCfg || !systemStatus) return null;

  if (systemStatus.status === "READY") {
    return (
      <button
        onClick={onGoLive}
        type="button"
        className="flex min-h-10 items-center gap-2 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-900/20 transition-colors hover:bg-[#115E59]"
      >
        <Rocket className="w-3.5 h-3.5" />
        Go Live
      </button>
    );
  }

  if (systemStatus.status === "LIVE") {
    return (
      <span className="flex items-center gap-2 rounded-lg bg-green-50 px-3.5 py-2 text-sm font-semibold text-green-800">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A] animate-pulse" />
        <span>Live</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        const first = systemStatus.items.find((item) => item.completed === false);
        openSettingsPage(first?.drawerSection ?? null);
      }}
      className={`flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} hover:opacity-80 cursor-pointer`}
    >
      <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${statusCfg.dot} animate-pulse`} />
      <span>Complete setup</span>
    </button>
  );
}

/* ─── Main layout ─── */
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /* ─── State ─── */
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

  /* ─── Data fetching (UNCHANGED business logic) ─── */
  const fetchNewLeadCount = useCallback(async () => {
    try {
      const leads = await api.leads.list("new");
      setNewLeadCount(leads.length);
    } catch {
      /* badge is convenience, not critical */
    }
  }, []);

  const fetchBilling = useCallback(async () => {
    try {
      const data = await api.billing.getStatus();
      setBilling(data);
    } catch {
      /* non-critical */
    }
  }, []);

  const fetchClinic = useCallback(async () => {
    try {
      const data = await api.clinics.getMyClinic();
      setClinic(data);
    } catch {
      /* non-critical */
    }
  }, []);

  const openSettingsPage = useCallback(
    (section?: string | null) => {
      setMenuOpen(false);
      router.push(settingsHref(section));
    },
    [router],
  );

  /* ─── Auth redirect ─── */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  /* ─── Onboarding check ─── */
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

  /* ─── Periodic data refresh ─── */
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

  /* ─── Close menu on outside click ─── */
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

  /* ─── Lock body scroll when mobile sidebar open ─── */
  useEffect(() => {
    if (!sidebarOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [sidebarOpen]);

  /* ─── Escape key to close menu ─── */
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  /* ─── Onboarding redirect ─── */
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

  /* ─── Loading / auth guard ─── */
  if (isLoading || showSetupFlow) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  /* ─── Derived state ─── */
  let planLabel: string | null = null;
  if (billing) {
    planLabel = billing.subscription_status === "trialing" ? "Free Trial" : billing.plan_name;
  }
  const userInitial = (user?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase();
  const systemStatus = clinic ? computeSystemStatus(clinic) : null;
  const statusCfg = systemStatus ? STATUS_CONFIG[systemStatus.status] : null;
  const firstSetupGap = systemStatus?.items.find((item) => !item.completed) ?? null;

  const activeNavItem =
    sidebarNav.find(
      (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
    ) ?? null;

  const topBarPageLabel = (() => {
    if (pathname.startsWith("/dashboard/account")) return "Account";
    if (pathname.startsWith("/dashboard/billing")) return "Billing";
    return activeNavItem?.label ?? "Dashboard";
  })();

  /* ═══ Shared sidebar content renderer ═══ */
  const renderSidebarNav = (onNavigate?: () => void) => (
    <>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {sidebarGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-app-text-muted">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className="dashboard-nav-link group"
                    data-active={isActive ? "true" : "false"}
                  >
                    <item.icon
                      className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-app-primary" : "text-app-text-muted group-hover:text-app-text"}`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.label === "Leads" && newLeadCount > 0 && (
                      <span className="ml-auto min-w-5 rounded-full bg-blue-600 px-1.5 py-px text-center text-[0.6875rem] font-bold text-white">
                        {newLeadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Channels */}
      <div className="border-t border-app-border px-3 py-3">
        <p className="mb-1.5 px-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-app-text-muted">
          Channels
        </p>
        {user?.clinic_slug && (
          <Link
            href={`/chat/${user.clinic_slug}`}
            target="_blank"
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-alt hover:text-app-text"
          >
            <MessageSquareMore className="h-4 w-4 text-app-text-muted group-hover:text-app-text" />
            Patient Chat
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-app-text-muted" />
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="dashboard-shell flex h-screen max-md:overflow-x-hidden">
      {/* ═══ Desktop sidebar ═══ */}
      <aside className="dashboard-sidebar hidden w-60 flex-col border-r border-app-border bg-app-surface lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-b from-teal-400 to-teal-700 shadow-sm">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="block text-sm font-semibold tracking-tight text-app-text">Clinic AI</span>
            <span className="text-[0.6875rem] font-semibold uppercase tracking-widest text-app-text-muted">Front Desk OS</span>
          </div>
        </div>

        {/* Clinic context card */}
        {clinic && (
          <div className="dashboard-side-card mx-3 mb-2 rounded-lg border border-app-border bg-app-surface-alt px-3 py-2.5">
            <p className="truncate text-[0.8125rem] font-semibold text-app-text">{clinic.name}</p>
            {statusCfg && systemStatus?.status !== "LIVE" && (
              <span className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium ${statusCfg.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            )}
            {systemStatus?.status === "READY" && (
              <p className="mt-1.5 text-[0.6875rem] leading-snug text-app-text-muted">
                Use <span className="font-semibold text-app-text">Go live</span> when patients should see the assistant.
              </p>
            )}
            {systemStatus &&
              systemStatus.status !== "LIVE" &&
              systemStatus.status !== "READY" &&
              firstSetupGap && (
                <Link
                  href={settingsHref(firstSetupGap.drawerSection)}
                  className="mt-1.5 inline-flex max-w-full items-center gap-1 text-[0.6875rem] font-semibold text-app-primary hover:underline"
                >
                  <span className="truncate">Next: {firstSetupGap.label}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
                </Link>
              )}
          </div>
        )}

        {renderSidebarNav()}

        {/* Trust badge */}
        <div className="mx-3 mb-3 rounded-lg border border-app-border bg-app-surface-alt px-3 py-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-app-text-muted">Operator control</p>
              <p className="mt-0.5 text-xs leading-relaxed text-app-text-muted">
                Review, takeover, and visibility stay with your team.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ Mobile sidebar overlay ═══ */}
      <div
        className={`fixed inset-0 z-40 transition-opacity lg:hidden ${sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        {...(sidebarOpen ? {} : { "aria-hidden": true })}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          aria-label="Close navigation"
        />
        <aside
          className={`relative flex h-full w-[min(18rem,85vw)] flex-col border-r border-app-border bg-app-surface shadow-2xl transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-primary shadow-sm">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-app-text">Clinic AI</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-surface-alt hover:text-app-text"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {renderSidebarNav(() => setSidebarOpen(false))}
        </aside>
      </div>

      {/* ═══ Main content area ═══ */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* ─── Top bar ─── */}
        <header className="dashboard-topbar relative z-2 flex min-h-14 shrink-0 items-center gap-3 border-b border-app-border bg-app-surface px-4 lg:px-5">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-surface-alt hover:text-app-text lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight text-app-text">{topBarPageLabel}</h1>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/inbox"
              className="app-btn app-btn-secondary hidden gap-2 md:inline-flex"
            >
              <Inbox className="h-4 w-4" />
              Inbox
            </Link>

            <SystemStatusCTA
              systemStatus={systemStatus}
              statusCfg={statusCfg}
              onGoLive={() => setGoLiveModal(true)}
              openSettingsPage={openSettingsPage}
            />

            {/* Profile dropdown */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-2 py-1.5 shadow-sm transition-colors hover:bg-app-surface-alt focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary"
                aria-haspopup="true"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-b from-teal-400 to-teal-700 text-xs font-bold text-white">
                  {userInitial}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="max-w-28 truncate text-xs font-semibold text-app-text">
                    {user?.full_name || "Clinic user"}
                  </p>
                  <p className="max-w-28 truncate text-[0.6875rem] text-app-text-muted">
                    {planLabel || "Workspace"}
                  </p>
                </div>
              </button>

              {/* Dropdown menu */}
              <div
                className={`absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-app-border bg-app-surface p-1.5 shadow-lg transition-all ${menuOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
                role="menu"
              >
                <div className="mb-1.5 rounded-lg bg-app-surface-alt px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-app-text">{user?.full_name}</p>
                  <p className="truncate text-xs text-app-text-muted">{user?.email}</p>
                  {planLabel && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="rounded-md bg-teal-50 px-2 py-px text-xs font-semibold text-app-primary">
                        {planLabel}
                      </span>
                      {billing?.plan !== "premium" && (
                        <Link
                          href="/dashboard/billing"
                          onClick={() => setMenuOpen(false)}
                          className="text-xs font-semibold text-app-primary hover:underline"
                        >
                          Upgrade
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href="/dashboard/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-alt hover:text-app-text"
                  role="menuitem"
                >
                  <UserCog className="h-4 w-4" />
                  Account
                </Link>

                <div className="my-1 border-t border-app-border" />

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout().catch(() => { /* keep stable */ });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile system status */}
        <div className="border-b border-app-border bg-app-surface px-4 py-2.5 sm:hidden">
          <SystemStatusCTA
            systemStatus={systemStatus}
            statusCfg={statusCfg}
            onGoLive={() => setGoLiveModal(true)}
            openSettingsPage={openSettingsPage}
          />
        </div>

        {/* ─── Main canvas ─── */}
        <main className="ds-workspace-main-area relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-app-bg">
          <div className="dashboard-content-well relative z-1 min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Modals */}

      <GoLiveModals
        confirmOpen={goLiveModal && !goLiveSuccess}
        successOpen={goLiveSuccess}
        loading={goLiveLoading}
        onCancel={() => setGoLiveModal(false)}
        onConfirm={() => {
          void (async () => {
            setGoLiveLoading(true);
            try {
              await api.clinics.goLive();
              await fetchClinic();
              setGoLiveModal(false);
              setGoLiveSuccess(true);
              globalThis.setTimeout(() => setGoLiveSuccess(false), 4000);
            } catch {
              /* keep modal open on error */
            }
            setGoLiveLoading(false);
          })();
        }}
        onDismissSuccess={() => setGoLiveSuccess(false)}
      />
    </div>
  );
}