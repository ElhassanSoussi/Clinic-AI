import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router";
import { useAuth } from "@/lib/auth-context";
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
} from "lucide-react";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, ready, logout } = useAuth();

  const navItems = [
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
  ];

  const handleLogout = () => {
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
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

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-1">
          <Link
            to="/app/account"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === "/app/account"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
          >
            <UserCircle className="w-5 h-5" />
            Account
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
