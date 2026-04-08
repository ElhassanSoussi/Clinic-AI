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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { computeSystemStatus, STATUS_CONFIG } from "@/lib/system-status";
import type { BillingStatus, Clinic } from "@/types";
import { GoLiveModals } from "@/components/shared/GoLiveModals";

/* ─── Navigation config ─── */
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
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

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

  const activeNavItem =
    sidebarNav.find(
      (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
    ) ?? null;

  const topBarPageLabel = (() => {
    if (pathname.startsWith("/dashboard/account")) return "Account";
    if (pathname.startsWith("/dashboard/billing")) return "Billing";
    return activeNavItem?.label ?? "Dashboard";
  })();

  /* ═══════════════════════════════════════════════
     RENDER — Premium SaaS workspace shell
     ═══════════════════════════════════════════════ */
  return (
    <div className="dashboard-shell flex h-screen max-md:overflow-x-hidden">
      {/* ─── LEFT SIDEBAR (desktop) ─── */}
      <aside className="dashboard-sidebar hidden flex-col lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 pb-4 pt-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F766E] shadow-md shadow-teal-900/20">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="block text-[0.9375rem] font-semibold tracking-tight text-[#0F172A]">Clinic AI</span>
            <span className="text-[0.8125rem] font-medium text-[#64748B]">Front Desk OS</span>
          </div>
        </div>

        {/* Clinic status card */}
        {clinic && (
          <div className="dashboard-side-card mx-3 mb-2 px-3 py-2.5">
            <p className="truncate text-[0.8125rem] font-semibold text-[#0F172A]">{clinic.name}</p>
            {statusCfg && systemStatus?.status !== "LIVE" && (
              <span className={`mt-1 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium ${statusCfg.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          <p className="workspace-section-label mb-2 px-2">Workspace</p>
          {sidebarNav.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="dashboard-nav-link group"
                data-active={isActive ? "true" : "false"}
              >
                <item.icon
                  className={`h-[1.125rem] w-[1.125rem] shrink-0 ${isActive ? "text-[#0F766E]" : "text-[#64748B] group-hover:text-[#475569]"}`}
                />
                {item.label}
                {item.label === "Leads" && newLeadCount > 0 && (
                  <span className="ml-auto min-w-[1.375rem] rounded-full bg-[#2563EB] px-1.5 py-0.5 text-center text-[0.6875rem] font-bold text-white">
                    {newLeadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Channels section */}
        <div className="border-t border-[#E2E8F0] px-3 py-3">
          <p className="workspace-section-label mb-2 px-2">Channels</p>
          {user?.clinic_slug && (
            <Link
              href={`/chat/${user.clinic_slug}`}
              target="_blank"
              className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[0.9375rem] font-medium text-[#475569] transition-colors hover:bg-[#f4f6f9] hover:text-[#0F172A]"
            >
              <MessageSquareMore className="h-[1.125rem] w-[1.125rem] text-[#64748B] group-hover:text-[#475569]" />
              Patient Chat
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-[#64748B]" />
            </Link>
          )}
        </div>

        {/* Operator control card */}
        <div className="dashboard-side-card mx-3 mb-3 px-3 py-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" />
            <div>
              <p className="text-[0.8125rem] font-semibold text-[#0F172A]">Operator control</p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[#64748B]">
                Review, takeover, and visibility stay with your team.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE SIDEBAR ─── */}
      <div
        className={`fixed inset-0 z-40 transition-opacity lg:hidden ${sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        {...(sidebarOpen ? {} : { "aria-hidden": true })}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          aria-label="Close navigation"
        />
        <aside
          className={`dashboard-sidebar relative flex h-full w-[min(20rem,88vw)] max-w-[85vw] flex-col shadow-2xl transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F766E] shadow-md">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="text-[0.9375rem] font-semibold text-[#0F172A]">Clinic AI</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            {sidebarNav.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="dashboard-nav-link"
                  data-active={isActive ? "true" : "false"}
                >
                  <item.icon className={`h-[1.125rem] w-[1.125rem] shrink-0 ${isActive ? "text-[#0F766E]" : "text-[#64748B]"}`} />
                  {item.label}
                  {item.label === "Leads" && newLeadCount > 0 && (
                    <span className="ml-auto min-w-[1.375rem] rounded-full bg-[#2563EB] px-1.5 py-0.5 text-center text-[0.6875rem] font-bold text-white">
                      {newLeadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* ─── MAIN AREA ─── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* ─── TOPBAR ─── */}
        <header className="dashboard-topbar flex min-h-[3.25rem] shrink-0 flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:gap-4 sm:px-5 lg:px-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page context */}
          <div className="hidden min-w-0 lg:block">
            <p className="text-xl font-bold tracking-tight text-[#0F172A]">{topBarPageLabel}</p>
          </div>

          {/* Quick nav to inbox */}
          <div className="flex min-w-0 flex-1 justify-center">
            <Link
              href="/dashboard/inbox"
              className="inline-flex min-h-10 shrink items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white/90 px-4 py-2 text-[0.9375rem] font-medium text-[#475569] shadow-sm transition-colors hover:border-[#CBD5E1] hover:bg-white"
            >
              <Inbox className="h-4 w-4 shrink-0 text-[#64748B]" />
              <span className="hidden sm:inline">Open inbox</span>
              <span className="sm:hidden">Inbox</span>
            </Link>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2.5">
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
                className="flex min-h-10 items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2 transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                aria-haspopup="true"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F766E] text-xs font-bold text-white">
                  {userInitial}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="max-w-32 truncate text-sm font-semibold text-[#0F172A]">
                    {user?.full_name || "Clinic user"}
                  </p>
                  <p className="max-w-32 truncate text-xs text-[#64748B]">
                    {planLabel || "Workspace"}
                  </p>
                </div>
              </button>

              {/* Profile dropdown menu */}
              <div
                className={`absolute right-0 mt-2 w-64 origin-top-right rounded-lg border border-[#E2E8F0] bg-white p-2 shadow-lg transition-all ${menuOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
                  }`}
                role="menu"
              >
                <div className="mb-1.5 rounded-md bg-[#F8FAFC] px-3 py-3">
                  <p className="truncate text-sm font-semibold text-[#0F172A]">{user?.full_name}</p>
                  <p className="truncate text-sm text-[#64748B]">{user?.email}</p>
                  {planLabel && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-md bg-[#CCFBF1] px-2 py-0.5 text-xs font-semibold text-[#0F766E]">
                        {planLabel}
                      </span>
                      {billing?.plan !== "premium" && (
                        <Link
                          href="/dashboard/billing"
                          onClick={() => setMenuOpen(false)}
                          className="text-xs font-semibold text-[#0F766E] hover:text-[#115E59]"
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
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[#475569] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  role="menuitem"
                >
                  <UserCog className="h-4 w-4" />
                  Account
                </Link>

                <div className="my-1 border-t border-[#E2E8F0]" />

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout().catch(() => { /* keep stable */ });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[#475569] transition-colors hover:bg-red-50 hover:text-[#DC2626]"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile system status CTA */}
        <div className="sm:hidden border-b border-[#E2E8F0] bg-white px-4 py-2.5">
          <SystemStatusCTA
            systemStatus={systemStatus}
            statusCfg={statusCfg}
            onGoLive={() => setGoLiveModal(true)}
            openSettingsPage={openSettingsPage}
          />
        </div>

        {/* ─── MAIN CANVAS ─── */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="dashboard-content-well min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* ══════════════════════════
         MODALS (unchanged logic)
         ══════════════════════════ */}

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
