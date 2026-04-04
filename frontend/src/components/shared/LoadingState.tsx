"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  readonly message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <p className="mt-1 text-[11px] text-slate-400">Preparing workspace data</p>
    </div>
  );
}
