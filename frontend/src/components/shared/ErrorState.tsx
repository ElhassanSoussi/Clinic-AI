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
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${calm ? "border-amber-100 bg-amber-50" : "border-red-100 bg-red-50"
          }`}
      >
        {calm ? (
          <AlertCircle className="h-5 w-5 text-amber-700" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-[#DC2626]" />
        )}
      </div>
      <h3 className="text-base font-semibold text-[var(--color-app-text)]">{resolvedTitle}</h3>
      <p className="ds-help-text mt-3 max-w-md">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-xl bg-[#0F766E] px-5 py-2.5 text-[0.9375rem] font-semibold text-white shadow-md shadow-teal-900/15 transition-colors hover:bg-[#115E59]"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
