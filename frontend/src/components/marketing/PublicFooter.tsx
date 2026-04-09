import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-900/20 bg-[radial-gradient(ellipse_at_top_left,rgba(20,184,166,0.18),transparent_34%),radial-gradient(ellipse_at_top_right,rgba(124,99,243,0.12),transparent_30%),linear-gradient(180deg,#09111f_0%,#0f172a_100%)] text-slate-300">
      <div className="marketing-container pt-14 pb-16 sm:pt-16 sm:pb-20">
        <div className="mb-12 rounded-[2.2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(20,184,166,0.2)_0%,rgba(124,99,243,0.12)_46%,rgba(15,23,42,0.06)_100%)] p-8 shadow-[0_36px_68px_-34px_rgb(8_15_28/0.82)] sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-xl">
            <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-teal-200/90">Ready when you are</p>
            <p className="mt-3 text-[1.35rem] font-semibold leading-snug tracking-[-0.03em] text-white">
              Put a calmer front desk on your site this week.
            </p>
            <p className="mt-2 text-[1rem] leading-relaxed text-slate-400">
              Start free, configure your real clinic data, and see the full workspace before you commit.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-[0.9375rem] font-semibold text-[#0F766E] shadow-md transition-colors hover:bg-teal-50"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/chat/demo"
              className="inline-flex items-center justify-center rounded-full border border-teal-400/35 bg-teal-950/30 px-6 py-3.5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-teal-950/50"
            >
              Try live demo
            </Link>
          </div>
        </div>

        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-16">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(180deg,#14b8a6_0%,#0f766e_100%)] shadow-lg shadow-teal-950/40">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="text-[1.0625rem] font-semibold text-white">Clinic AI</span>
            </Link>
            <p className="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-slate-400">
              AI front-desk operating system for clinics and private practices. Visible, controllable, and built for real patient communication.
            </p>
          </div>

          <div>
            <p className="text-[0.84375rem] font-semibold uppercase tracking-[0.11em] text-slate-500">Product</p>
            <ul className="mt-6 space-y-4">
              {[
                { href: "/product", label: "Product overview" },
                { href: "/pricing", label: "Pricing" },
                { href: "/faq", label: "FAQ" },
                { href: "/chat/demo", label: "Live demo" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[1rem] text-slate-400 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[0.84375rem] font-semibold uppercase tracking-[0.11em] text-slate-500">
              Trust &amp; Safety
            </p>
            <ul className="mt-6 space-y-4">
              {[
                { href: "/trust", label: "Trust approach" },
                { href: "/privacy", label: "Privacy policy" },
                { href: "/terms", label: "Terms of service" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[1rem] text-slate-400 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[0.84375rem] font-semibold uppercase tracking-[0.11em] text-slate-500">Get started</p>
            <ul className="mt-6 space-y-4">
              {[
                { href: "/login", label: "Sign in" },
                { href: "/register", label: "Start free trial" },
                { href: "/contact", label: "Contact" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[1rem] text-slate-400 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-800 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.875rem] text-slate-500">&copy; {year} Clinic AI. All rights reserved.</p>
          <div className="flex gap-8">
            <Link href="/privacy" className="text-[0.875rem] text-slate-500 transition-colors hover:text-slate-300">
              Privacy
            </Link>
            <Link href="/terms" className="text-[0.875rem] text-slate-500 transition-colors hover:text-slate-300">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
