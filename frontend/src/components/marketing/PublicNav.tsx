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
    <nav className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-[#FFFFFF]">
      <div className="mx-auto flex h-[4.5rem] max-w-[1280px] items-center justify-between px-5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] shadow-sm">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-[#0F172A]">Clinic AI</p>
            <p className="mt-0.5 text-[11px] leading-none text-[#64748B]">AI front-desk OS</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "bg-[#F8FAFC] text-[#0F172A]"
                  : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-4 py-2 text-sm font-medium text-[#475569] transition-colors hover:text-[#0F172A] sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#115E59]"
          >
            Start free
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {/* Mobile toggle */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#475569] transition-colors hover:bg-[#F8FAFC] lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[#E2E8F0] bg-[#FFFFFF] px-5 pb-5 pt-3 lg:hidden">
          <div className="space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] ${
                  pathname === link.href
                    ? "bg-[#F8FAFC] text-[#0F172A]"
                    : "text-[#64748B]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 space-y-1 border-t border-[#E2E8F0] pt-4">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-[#475569] transition-colors hover:bg-[#F8FAFC]"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
