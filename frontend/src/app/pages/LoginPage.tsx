import { Link, useNavigate, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError, CLINIC_AI_SESSION_EXPIRED_STORAGE_KEY } from "@/lib/api";

function safeInternalReturnPath(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("://")) {
    return null;
  }
  return decoded;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = safeInternalReturnPath(searchParams.get("from"));
  const { login, session, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLINIC_AI_SESSION_EXPIRED_STORAGE_KEY)) {
        sessionStorage.removeItem(CLINIC_AI_SESSION_EXPIRED_STORAGE_KEY);
        setSessionExpiredNotice("Your session expired or was revoked. Sign in again to continue.");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (ready && session) {
      navigate(returnTo ?? "/app/dashboard", { replace: true });
    }
  }, [ready, session, navigate, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(returnTo ?? "/app/dashboard", { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Sign in failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold text-white mb-6">
            Welcome back to Clinic AI
          </h1>
          <p className="text-xl text-white/90">
            Your intelligent front desk assistant is ready to help manage patient conversations and appointments.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-50/80">
        <div className="w-full max-w-lg">
          <div className="bg-white border border-border rounded-2xl shadow-sm p-6 sm:p-10">
            <div className="mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground font-bold">CA</span>
                </div>
                <span className="font-bold text-xl text-foreground tracking-tight">Clinic AI</span>
              </Link>
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Log in to your account</h2>
              <p className="text-muted-foreground text-[15px] leading-relaxed">
                Staff sign-in for the front-desk operating system. You will land back on the page you were viewing when the session expired.
              </p>
            </div>

            {sessionExpiredNotice && (
              <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-950 leading-relaxed">
                {sessionExpiredNotice}
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Work email</label>
                <input
                  type="email"
                  data-testid="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none bg-white text-foreground"
                  placeholder="you@clinic.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Password</label>
                <input
                  type="password"
                  data-testid="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none bg-white text-foreground"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-sm text-foreground">Keep me signed in on this device</span>
                </label>
                <Link to="/contact" className="text-sm font-semibold text-primary hover:underline shrink-0">
                  Need help?
                </Link>
              </div>

              <button
                type="submit"
                data-testid="login-submit"
                disabled={submitting}
                className="w-full px-6 py-3.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold disabled:opacity-60 shadow-sm"
              >
                {submitting ? "Signing in…" : "Log in"}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
              New to Clinic AI?{" "}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Create a workspace
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
