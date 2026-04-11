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
    <nav className="sticky top-0 z-40 border-b border-border/80 bg-card/80 backdrop-blur-xl">
      <div className="marketing-container flex items-center justify-between gap-4 py-4">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[-0.03em] text-foreground">Clinic AI</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Front-desk OS</p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 rounded-xl border border-border/80 bg-card px-1.5 py-1.5 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${isActivePath(pathname, link.href) ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground lg:hidden"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/80 bg-card/96 lg:hidden">
          <div className="marketing-container grid gap-2 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-medium ${isActivePath(pathname, link.href) ? "bg-accent text-primary" : "text-muted-foreground"}`}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground">
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
