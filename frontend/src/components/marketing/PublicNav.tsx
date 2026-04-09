"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/product", label: "Product" },
  { href: "/trust", label: "Trust" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-white/60 bg-[rgb(248_250_253/0.86)] shadow-[0_1px_0_rgb(255_255_255/0.8)_inset,0_18px_44px_-28px_rgb(12_18_32/0.28)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="marketing-container flex h-[4.5rem] items-center justify-between gap-4 sm:h-[4.85rem]">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#14b8a6_0%,#0f766e_100%)] shadow-[0_18px_30px_-18px_rgb(15_118_110/0.55)]">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[1rem] font-semibold leading-none tracking-[-0.02em] text-[#08111F]">Clinic AI</p>
            <p className="mt-1 text-[0.75rem] leading-none font-semibold uppercase tracking-[0.12em] text-[#6B7280]">AI front-desk OS</p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/80 bg-white/88 p-1.5 shadow-[0_18px_34px_-24px_rgb(12_18_32/0.42)] lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
            className={`rounded-full px-4 py-2.5 text-[0.9375rem] font-semibold transition-all ${pathname === link.href || pathname.startsWith(link.href + "/")
                ? "bg-[#f1edff] text-[#3d2c84] shadow-[0_10px_20px_-18px_rgb(124_99_243/0.7)]"
                : "text-[#475569] hover:bg-slate-50 hover:text-[#0F172A]"
                }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden rounded-full px-4 py-2.5 text-[0.9375rem] font-semibold text-[#475569] transition-colors hover:bg-white/70 hover:text-[#0F172A] sm:block">
            Sign in
          </Link>
          <Link href="/register" className="marketing-cta-primary !rounded-full !px-5 !py-2.5 !text-[0.9375rem] shadow-[0_18px_36px_-18px_rgb(15_118_110/0.58)]">
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-[#475569] transition-colors hover:bg-slate-50 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 pb-6 pt-4 lg:hidden">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-2xl px-4 py-3.5 text-[0.9375rem] font-semibold transition-colors hover:bg-slate-50 ${pathname === link.href ? "bg-[#f1edff] text-[#3d2c84]" : "text-[#475569]"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3.5 text-[0.9375rem] font-semibold text-[#475569]"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
