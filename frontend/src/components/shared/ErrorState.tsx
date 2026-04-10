"use client";

import { AlertCircle, AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  readonly title?: string;
  readonly message?: string;
  readonly onRetry?: () => void;
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
    <div className={`panel-surface flex min-h-[18rem] flex-col items-center justify-center rounded-[2rem] px-6 py-10 text-center ${calm ? "" : "ring-1 ring-rose-100"}`.trim()}>
      {calm ? (
        <AlertCircle className="h-8 w-8 text-app-text-muted" />
      ) : (
        <AlertTriangle className="h-8 w-8 text-rose-500" />
      )}
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-app-text">{resolvedTitle}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-app-text-secondary">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="app-btn app-btn-secondary mt-6">
          Try again
        </button>
      ) : null}
    </div>
  );
}
