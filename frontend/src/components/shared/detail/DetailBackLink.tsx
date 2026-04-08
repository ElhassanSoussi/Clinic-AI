"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type DetailBackLinkProps = {
  readonly href: string;
  readonly children: ReactNode;
};

export function DetailBackLink({ href, children }: DetailBackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#475569] shadow-sm transition-colors hover:text-[#0F172A]"
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
      {children}
    </Link>
  );
}
