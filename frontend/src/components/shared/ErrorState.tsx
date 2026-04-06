"use client";

import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
        <AlertTriangle className="h-4 w-4 text-rose-500" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-teal-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-teal-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
