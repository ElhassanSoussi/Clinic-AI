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
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { computeSystemStatus, STATUS_CONFIG } from "@/lib/system-status";
import type { BillingStatus, Clinic } from "@/types";

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
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
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
        className="flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
      >
        <Rocket className="w-3.5 h-3.5" />
        Go Live
      </button>
    );
  }

  if (systemStatus.status === "LIVE") {
    return (
      <span className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
        <span>Live</span>
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        const first = systemStatus.items.find((item) => item.completed === false);
        openSettingsPage(first?.drawerSection ?? null);
      }}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} hover:opacity-80 cursor-pointer`}
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
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

  /* ═══════════════════════════════════════════════
     RENDER — Premium SaaS workspace shell
     ═══════════════════════════════════════════════ */
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ─── LEFT SIDEBAR (desktop) ─── */}
      <aside className="hidden w-56 flex-col border-r border-slate-200 bg-white lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-linear-to-br from-teal-600 to-violet-600 shadow-sm">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <span className="block text-[13px] font-bold tracking-tight text-slate-900">Clinic AI</span>
            <span className="text-[10px] text-slate-500">Front Desk OS</span>
          </div>
        </div>

        {/* Clinic status card */}
        {clinic && (
          <div className="mx-3 mb-1.5 rounded-md border border-slate-200/70 bg-slate-50/70 px-2.5 py-2">
            <p className="truncate text-xs font-semibold text-slate-800">{clinic.name}</p>
            {statusCfg && (
              <span className={`mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-medium ${statusCfg.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-1.5">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Workspace</p>
          {sidebarNav.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${isActive
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-teal-600" />
                )}
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-500"
                  }`} />
                {item.label}
                {item.label === "Leads" && newLeadCount > 0 && (
                  <span className="ml-auto min-w-[18px] rounded-full bg-blue-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                    {newLeadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Channels section */}
        <div className="border-t border-slate-200/70 px-2.5 py-2.5">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Channels</p>
          {user?.clinic_slug && (
            <Link
              href={`/chat/${user.clinic_slug}`}
              target="_blank"
              className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
              <MessageSquareMore className="h-4 w-4 text-slate-400 group-hover:text-slate-500" />
              Patient Chat
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-400" />
            </Link>
          )}
        </div>

        {/* Operator control card */}
        <div className="mx-2.5 mb-2.5 rounded-md border border-slate-200/70 bg-slate-50/60 px-2.5 py-2.5">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
            <div>
              <p className="text-[11px] font-semibold text-slate-700">Operator control</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
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
          className={`relative flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-100 bg-white shadow-xl transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-linear-to-br from-teal-600 to-violet-600">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[13px] font-bold text-slate-900">Clinic AI</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
            {sidebarNav.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all ${isActive
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-teal-600" />
                  )}
                  <item.icon className={`h-4 w-4 ${isActive ? "text-teal-600" : ""}`} />
                  {item.label}
                  {item.label === "Leads" && newLeadCount > 0 && (
                    <span className="ml-auto min-w-[18px] rounded-full bg-blue-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
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
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ─── TOPBAR ─── */}
        <header className="flex h-13 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm lg:px-5">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page context */}
          <div className="hidden min-w-0 lg:block">
            <p className="text-sm font-semibold text-slate-800">{activeNavItem?.label ?? "Dashboard"}</p>
          </div>

          {/* Quick nav to inbox */}
          <div className="flex-1 flex justify-center">
            <Link
              href="/dashboard/inbox"
              className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2 transition-colors hover:border-slate-300 hover:bg-white"
            >
              <Inbox className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[13px] text-slate-500">Open inbox</span>
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
                className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-haspopup="true"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-teal-600 to-violet-600 text-[11px] font-bold text-white">
                  {userInitial}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="max-w-32 truncate text-[13px] font-semibold text-slate-700">
                    {user?.full_name || "Clinic user"}
                  </p>
                  <p className="max-w-32 truncate text-[11px] text-slate-500">
                    {planLabel || "Workspace"}
                  </p>
                </div>
              </button>

              {/* Profile dropdown menu */}
              <div
                className={`absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg transition-all ${menuOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                  }`}
                role="menu"
              >
                <div className="mb-1.5 rounded-lg bg-slate-50 px-3.5 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{user?.full_name}</p>
                  <p className="truncate text-[13px] text-slate-500">{user?.email}</p>
                  {planLabel && (
                    <div className="mt-2 flex items-center gap-2.5">
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                        {planLabel}
                      </span>
                      {billing?.plan !== "premium" && (
                        <Link
                          href="/dashboard/billing"
                          onClick={() => setMenuOpen(false)}
                          className="text-[11px] font-semibold text-teal-600 hover:text-teal-700"
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
                  className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  role="menuitem"
                >
                  <UserCog className="h-4 w-4" />
                  Account
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout().catch(() => { /* keep stable */ });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
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
        <div className="sm:hidden border-b border-slate-50 bg-white px-4 py-2.5">
          <SystemStatusCTA
            systemStatus={systemStatus}
            statusCfg={statusCfg}
            onGoLive={() => setGoLiveModal(true)}
            openSettingsPage={openSettingsPage}
          />
        </div>

        {/* ─── MAIN CANVAS ─── */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-5 lg:px-6">
            {children}
          </div>
        </main>
      </div>

      {/* ══════════════════════════
         MODALS (unchanged logic)
         ══════════════════════════ */}

      {/* Go Live confirmation */}
      {goLiveModal && !goLiveSuccess && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="px-6 pt-6 pb-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                  <Rocket className="h-5 w-5 text-teal-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Go Live</h2>
              </div>
              <p className="text-sm leading-relaxed text-slate-500">
                Your AI assistant is ready to start receiving real patients. Once live, the chat widget will
                show as active and conversations will generate real leads.
              </p>
            </div>
            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                onClick={() => setGoLiveModal(false)}
                disabled={goLiveLoading}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50"
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
                    /* keep modal open on error */
                  }
                  setGoLiveLoading(false);
                }}
                disabled={goLiveLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-70"
              >
                {goLiveLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Go Live
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Go Live success */}
      {goLiveSuccess && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">You&apos;re Live!</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your AI assistant is now receiving patients. Appointment requests will appear on your dashboard.
            </p>
            <button
              onClick={() => setGoLiveSuccess(false)}
              className="mt-5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
