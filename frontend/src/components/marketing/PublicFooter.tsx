import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/70 bg-white/55">
      <div className="marketing-container grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-primary text-white shadow-[0_18px_40px_-26px_rgba(17,133,121,0.72)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-app-text">Clinic AI</p>
              <p className="text-xs uppercase tracking-[0.22em] text-app-text-muted">Front-desk operating system</p>
            </div>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-7 text-app-text-muted">
            A clearer operating layer for patient conversations, booking pressure, follow-up, and clinic-wide visibility.
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.22em] text-app-text-muted">
            © {year} Clinic AI
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel-surface rounded-[1.75rem] p-5">
            <p className="text-sm font-bold text-app-text">Start with the real product</p>
            <p className="mt-2 text-sm leading-6 text-app-text-muted">
              No disposable demo funnel. Sign in, configure, preview, and publish from the same workspace.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/login" className="text-sm font-semibold text-app-text-secondary">
                Sign in
              </Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-app-primary">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="panel-surface rounded-[1.75rem] p-5">
            <div className="grid gap-2 text-sm">
              <Link href="/product" className="font-semibold text-app-text">Product</Link>
              <Link href="/pricing" className="font-semibold text-app-text">Pricing</Link>
              <Link href="/trust" className="font-semibold text-app-text">Trust</Link>
              <Link href="/privacy" className="font-semibold text-app-text">Privacy</Link>
              <Link href="/terms" className="font-semibold text-app-text">Terms</Link>
              <Link href="/contact" className="font-semibold text-app-text">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
