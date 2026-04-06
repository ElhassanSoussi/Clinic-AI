"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  readonly message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <p className="mt-0.5 text-xs text-slate-500">Preparing workspace data</p>
    </div>
  );
}
