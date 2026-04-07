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
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
        <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
      </div>
      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#64748B]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#115E59]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
