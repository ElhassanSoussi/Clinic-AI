"use client";

import { AlertCircle, AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly onRetry?: () => void;
  /** Calmer styling for recoverable / network issues — default uses stronger alert styling. */
  readonly variant?: "default" | "calm";
}

export function ErrorState({
  title,
  message = "Please try again. If this keeps happening, check your connection and refresh the page.",
  onRetry,
  variant = "default",
}: ErrorStateProps) {
  const calm = variant === "calm";
  const resolvedTitle =
    title ?? (calm ? "Couldn’t load this view" : "Something went wrong");

  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg border ${calm ? "border-amber-100 bg-amber-50" : "border-red-100 bg-red-50"
          }`}
      >
        {calm ? (
          <AlertCircle className="h-4 w-4 text-amber-700" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
        )}
      </div>
      <h3 className="text-sm font-semibold text-[#0F172A]">{resolvedTitle}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#64748B]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#115E59]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
