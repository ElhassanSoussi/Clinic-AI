"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  readonly message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#CCFBF1]">
        <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
      </div>
      <p className="text-sm font-medium text-[#0F172A]">{message}</p>
      <p className="mt-1 text-xs text-[#64748B]">Preparing workspace data</p>
    </div>
  );
}
