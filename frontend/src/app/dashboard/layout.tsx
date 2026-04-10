"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bot,
  BriefcaseMedical,
  CalendarDays,
  CreditCard,
  Inbox,
  LayoutGrid,
  LogOut,
  Settings,
  Sparkles,
  TriangleAlert,
  UserCog,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { computeSystemStatus } from "@/lib/system-status";
import { LoadingState } from "@/components/shared/LoadingState";
import type { Clinic } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: TriangleAlert },
  { href: "/dashboard/operations", label: "Operations", icon: BriefcaseMedical },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/training", label: "AI Training", icon: Sparkles },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function pathToTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Command center";
  return pathname
    .split("/")
    .filter(Boolean)
    .slice(1)
    .map((segment) => segment.replaceAll("-", " "))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ");
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    void api.clinics
      .getMyClinic()
      .then((data) => {
        if (!mounted) return;
        setClinic(data);
        if (data.onboarding_completed === false && pathname !== "/onboarding") {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setClinic(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingClinic(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, pathname, router]);

  const systemStatus = useMemo(
    () => (clinic ? computeSystemStatus(clinic).status.replaceAll("_", " ") : null),
    [clinic]
  );

  if (isLoading || !isAuthenticated || loadingClinic) {
    return <LoadingState message="Loading workspace..." detail="Restoring your clinic dashboard" />;
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        {/* Brand */}
        <div className="panel-surface rounded-[1.8rem] px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-app-primary text-white shadow-[0_14px_32px_-18px_rgba(17,133,121,0.72)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-app-text">Clinic AI</p>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-app-text-muted">
                Operating shell
              </p>
            </div>
          </Link>
        </div>

        {/* Clinic card */}
        <div className="panel-surface mt-3 rounded-[1.8rem] p-4">
          <p className="panel-section-head">Clinic</p>
          <p className="mt-2.5 text-base font-bold tracking-[-0.03em] text-app-text">
            {clinic?.name || user?.clinic_slug || "Workspace"}
          </p>
          <p className="mt-1 truncate text-sm text-app-text-muted">{user?.email}</p>
          {systemStatus ? (
            <p className="mt-3 inline-flex rounded-full bg-app-accent-wash px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-app-primary-deep">
              {systemStatus}
            </p>
          ) : null}
        </div>

        {/* Nav */}
        <nav className="mt-3 grid gap-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="sidebar-link"
                data-active={active}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Account / logout */}
        <div className="panel-surface mt-3 rounded-[1.8rem] p-3">
          <Link
            href="/dashboard/account"
            className="sidebar-link"
            data-active={pathname.startsWith("/dashboard/account")}
          >
            <UserCog className="h-4 w-4 shrink-0" />
            Account
          </Link>
          <button
            type="button"
            className="sidebar-link mt-1 w-full text-left"
            data-active={false}
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log out
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <div className="dashboard-topbar">
          <div>
            <p className="panel-section-head">Clinic workspace</p>
            <p className="mt-1 text-lg font-bold tracking-[-0.04em] text-app-text">
              {pathToTitle(pathname)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {clinic?.slug ? (
              <Link href={`/chat/${clinic.slug}`} className="app-btn app-btn-secondary text-sm">
                Preview chat
              </Link>
            ) : null}
            <Link href="/dashboard/settings" className="app-btn app-btn-primary text-sm">
              Configure clinic
            </Link>
          </div>
        </div>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
