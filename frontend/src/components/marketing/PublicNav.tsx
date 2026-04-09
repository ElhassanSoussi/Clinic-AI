"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Bot, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/product", label: "Product" },
  { href: "/trust", label: "Trust" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/65 bg-[linear-gradient(180deg,rgba(248,252,252,0.9)_0%,rgba(244,249,249,0.82)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_24px_52px_-34px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
      <div className="marketing-container flex h-[4.9rem] items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(180deg,#18c2ad_0%,#0f766e_100%)] text-white shadow-[0_20px_36px_-20px_rgba(15,118,110,0.72)]">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-[#08111F]">
              Clinic AI
            </p>
            <p className="mt-0.5 truncate text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
              Clinic front-desk OS
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/85 bg-white/88 p-1.5 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.28)] lg:flex">
          {NAV_LINKS.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2.5 text-[0.93rem] font-semibold transition-all ${
                  active
                    ? "bg-[linear-gradient(180deg,#ecfdfa_0%,#dff8f3_100%)] text-[#0F766E] shadow-[0_18px_30px_-26px_rgba(15,118,110,0.85)]"
                    : "text-[#475569] hover:bg-slate-50 hover:text-[#0F172A]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2.5 text-[0.93rem] font-semibold text-[#475569] transition-colors hover:bg-white/70 hover:text-[#0F172A] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,#14b8a6_0%,#0f766e_100%)] px-5 py-2.5 text-[0.93rem] font-semibold text-white shadow-[0_20px_36px_-18px_rgba(15,118,110,0.78)] transition-transform hover:-translate-y-0.5"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-[#475569] transition-colors hover:bg-slate-50 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbfb_100%)] px-5 pb-6 pt-4 lg:hidden">
          <div className="space-y-1.5">
            {NAV_LINKS.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-2xl px-4 py-3.5 text-[0.95rem] font-semibold transition-colors ${
                    active ? "bg-[#ecfdfa] text-[#0F766E]" : "text-[#475569] hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3.5 text-[0.95rem] font-semibold text-[#475569]"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
