"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  readonly message?: string;
  /** Optional subline; omit for a minimal loader. */
  readonly detail?: string;
}

export function LoadingState({ message = "Loading...", detail }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#CCFBF1]">
        <Loader2 className="h-5 w-5 animate-spin text-[#0F766E]" />
      </div>
      <p className="text-[0.9375rem] font-semibold text-[var(--color-app-text)]">{message}</p>
      {detail ? <p className="ds-muted-text mt-2 max-w-sm">{detail}</p> : null}
    </div>
  );
}
