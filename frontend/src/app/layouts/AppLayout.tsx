import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router";
import { useAuth, type AuthSession } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Calendar,
  UserCircle,
  Target,
  Activity,
  Brain,
  CreditCard,
  Settings,
  LogOut,
  TrendingUp,
  Zap,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/app/components/ui/sheet";

const NAV_ITEMS = [
  { path: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/app/inbox", icon: Inbox, label: "Inbox" },
  { path: "/app/leads", icon: TrendingUp, label: "Leads" },
  { path: "/app/appointments", icon: Calendar, label: "Appointments" },
  { path: "/app/customers", icon: Users, label: "Customers" },
  { path: "/app/opportunities", icon: Target, label: "Opportunities" },
  { path: "/app/operations", icon: Zap, label: "Operations" },
  { path: "/app/activity", icon: Activity, label: "Activity" },
  { path: "/app/ai-training", icon: Brain, label: "AI Training" },
  { path: "/app/billing", icon: CreditCard, label: "Billing" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
] as const;

type AppSidebarNavProps = {
  session: AuthSession;
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
};

function AppSidebarNav({ session, pathname, onNavigate, onLogout }: AppSidebarNavProps) {
  return (
    <>
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">CA</span>
          </div>
          <div className="min-w-0">
            <span className="font-bold text-lg block truncate">Clinic AI</span>
            <span className="text-xs text-muted-foreground truncate block" title={session.email}>
              {session.fullName || session.email}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto min-h-0">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/");

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-1">
        <Link
          to="/app/account"
          onClick={onNavigate}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/app/account"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
        >
          <UserCircle className="w-5 h-5 flex-shrink-0" />
          Account
        </Link>
        <button
          type="button"
          data-testid="app-logout"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors text-left"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Log out
        </button>
      </div>
    </>
  );
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, ready, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobile = () => setMobileNavOpen(false);

  const handleLogout = () => {
    closeMobile();
    logout();
    navigate("/login");
  };

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-[100dvh] min-h-0 bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-3">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100vw-2rem,18rem)] p-0 flex flex-col bg-sidebar border-sidebar-border">
            <AppSidebarNav session={session} pathname={location.pathname} onNavigate={closeMobile} onLogout={handleLogout} />
          </SheetContent>
        </Sheet>
        <Link to="/app/dashboard" className="min-w-0 font-bold truncate" onClick={closeMobile}>
          Clinic AI
        </Link>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 min-w-[16rem] bg-sidebar border-r border-sidebar-border flex-col min-h-0">
        <AppSidebarNav session={session} pathname={location.pathname} onLogout={handleLogout} />
      </aside>

      <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
