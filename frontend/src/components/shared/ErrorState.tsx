"use client";

import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-18 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-rose-100 bg-white shadow-sm shadow-rose-500/10">
        <AlertTriangle className="h-7 w-7 text-rose-500" />
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mb-5 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
