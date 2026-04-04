"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-18 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-teal-100 bg-white shadow-sm shadow-teal-500/10">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <p className="mt-1 text-xs text-slate-500">Clinic AI is preparing the latest workspace data.</p>
    </div>
  );
}
