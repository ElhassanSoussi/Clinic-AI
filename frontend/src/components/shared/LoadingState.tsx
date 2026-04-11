"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  readonly message?: string;
  readonly detail?: string;
}

export function LoadingState({ message = "Loading...", detail }: LoadingStateProps) {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-xl border border-border/90 bg-card px-6 py-10 text-center shadow-[var(--shadow-soft)]">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="mt-4 text-base font-semibold tracking-[-0.03em] text-foreground">{message}</p>
      {detail ? <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
