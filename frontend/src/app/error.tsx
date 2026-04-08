"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { Bot } from "lucide-react";

export default function Error({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  if (process.env.NODE_ENV === "development") {
    console.error(error);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16 bg-slate-50">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <Bot className="h-8 w-8 text-red-400" aria-hidden />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          Something went wrong
        </h1>
        <p className="mx-auto mb-6 max-w-sm text-slate-500">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
