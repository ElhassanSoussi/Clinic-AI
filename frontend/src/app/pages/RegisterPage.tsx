import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, session, ready } = useAuth();
  const [formData, setFormData] = useState({
    clinicName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && session) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [ready, session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const body = await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.name,
        clinic_name: formData.clinicName,
      });
      if (body.requires_email_confirmation || !body.access_token) {
        setInfo(body.message || "Check your email to confirm your address before signing in.");
        return;
      }
      navigate("/app/onboarding");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Registration failed.";
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
            Start your free trial
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Set up your AI-powered front desk in minutes. No credit card required.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">✓</span>
              </div>
              <p className="text-white/90">14-day free trial with full features</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">✓</span>
              </div>
              <p className="text-white/90">Setup in under an hour</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">✓</span>
              </div>
              <p className="text-white/90">Cancel anytime, no questions asked</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold">CA</span>
              </div>
              <span className="font-bold text-xl">Clinic AI</span>
            </Link>
            <h2 className="text-3xl font-bold mb-2">Create your account</h2>
            <p className="text-muted-foreground">Get started with your free trial</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-sm text-destructive">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded-lg border border-border bg-muted/50 text-sm text-foreground">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Clinic Name</label>
              <input
                type="text"
                data-testid="register-clinic-name"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Your Clinic Name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                data-testid="register-full-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                data-testid="register-email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="you@clinic.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                data-testid="register-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              data-testid="register-submit"
              disabled={submitting}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Start Free Trial"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
