import Link from "next/link";
import { Bot } from "lucide-react";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#E2E8F0] bg-[#FFFFFF]">
      <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E]">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-[#0F172A]">Clinic AI</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#64748B]">
              AI front-desk operating system for clinics and private practices. Visible, controllable, and built for real patient care.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
              Product
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { href: "/product", label: "How it works" },
                { href: "/pricing", label: "Pricing" },
                { href: "/faq", label: "FAQ" },
                { href: "/chat/demo", label: "Live demo" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#64748B] transition-colors hover:text-[#0F172A]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust & Safety */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
              Trust &amp; Safety
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { href: "/trust", label: "Our approach to trust" },
                { href: "/privacy", label: "Privacy policy" },
                { href: "/terms", label: "Terms of service" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#64748B] transition-colors hover:text-[#0F172A]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get started */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
              Get started
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { href: "/login", label: "Sign in" },
                { href: "/register", label: "Start free trial" },
                { href: "/contact", label: "Book a demo" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-[#64748B] transition-colors hover:text-[#0F172A]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-[#E2E8F0] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#94A3B8]">
            &copy; {year} Clinic AI. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link
              href="/privacy"
              className="text-xs text-[#94A3B8] transition-colors hover:text-[#64748B]"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-[#94A3B8] transition-colors hover:text-[#64748B]"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
