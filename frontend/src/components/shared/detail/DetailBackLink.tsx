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
    <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-app-text-secondary transition-colors hover:text-app-text">
      <ArrowLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}
