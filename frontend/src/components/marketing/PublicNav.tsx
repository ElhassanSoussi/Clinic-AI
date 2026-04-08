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
    <nav className="sticky top-0 z-40 border-b border-slate-200/90 bg-[rgb(255_255_255/0.88)] shadow-[0_1px_0_rgb(15_23_42/0.04),0_8px_32px_-16px_rgb(12_18_32/0.12)] backdrop-blur-xl backdrop-saturate-150">
      <div className="marketing-container flex h-[4.25rem] items-center justify-between sm:h-[4.5rem]">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F766E] shadow-md shadow-teal-900/15">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[0.9375rem] font-semibold leading-none text-[#0F172A]">Clinic AI</p>
            <p className="mt-1 text-[0.8125rem] leading-none font-medium text-[#64748B]">AI front-desk OS</p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2.5 text-[0.9375rem] font-medium transition-colors ${pathname === link.href || pathname.startsWith(link.href + "/")
                ? "bg-slate-100 text-[#0F172A]"
                : "text-[#475569] hover:bg-slate-50 hover:text-[#0F172A]"
                }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-lg px-4 py-2.5 text-[0.9375rem] font-medium text-[#475569] transition-colors hover:text-[#0F172A] sm:block"
          >
            Sign in
          </Link>
          <Link href="/register" className="marketing-cta-primary !py-2.5 !px-4 !text-[0.9375rem]">
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-[#475569] transition-colors hover:bg-slate-50 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-5 pb-6 pt-4 lg:hidden">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-4 py-3.5 text-[0.9375rem] font-medium transition-colors hover:bg-slate-50 ${pathname === link.href ? "bg-slate-50 text-[#0F172A]" : "text-[#475569]"
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
              className="block rounded-xl px-4 py-3.5 text-[0.9375rem] font-medium text-[#475569]"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
