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
    <nav className="sticky top-0 z-40 border-b border-white/70 bg-white/72 backdrop-blur-xl">
      <div className="marketing-container flex items-center justify-between gap-4 py-4">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-primary text-white shadow-[0_18px_40px_-26px_rgba(17,133,121,0.72)]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[-0.03em] text-app-text">Clinic AI</p>
            <p className="text-xs uppercase tracking-[0.22em] text-app-text-muted">Front-desk OS</p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-app-border/70 bg-white/78 px-2 py-2 shadow-sm lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${isActivePath(pathname, link.href) ? "bg-app-accent-wash text-app-primary-deep" : "text-app-text-secondary hover:text-app-text"}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="app-btn app-btn-ghost">
            Sign in
          </Link>
          <Link href="/register" className="app-btn app-btn-primary">
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-app-border/80 bg-white/80 text-app-text lg:hidden"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-app-border/70 bg-white/92 lg:hidden">
          <div className="marketing-container grid gap-2 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isActivePath(pathname, link.href) ? "bg-app-accent-wash text-app-primary-deep" : "text-app-text-secondary"}`}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-semibold text-app-text-secondary">
              Sign in
            </Link>
            <Link href="/register" onClick={() => setOpen(false)} className="app-btn app-btn-primary mt-1">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
