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
    <Link href={href} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}
