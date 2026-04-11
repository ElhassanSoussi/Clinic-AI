import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/80 bg-card/92">
      <div className="marketing-container py-14">
        <div className="grid gap-10 rounded-[1.5rem] border border-border/80 bg-card p-8 shadow-[var(--shadow-soft)] lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Clinic AI</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Front-desk operating system</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">
              Patient conversations, bookings, follow-up, and launch controls in one clear operating layer.
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">© {year} Clinic AI</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Product</p>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <Link href="/product">How it works</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/trust">Trust</Link>
              <Link href="/faq">FAQ</Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Company</p>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <Link href="/contact">Contact</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Start</p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Use the real product from day one, then configure, preview, and publish from the same workspace.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login" className="text-sm font-medium text-muted-foreground">
                Sign in
              </Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
