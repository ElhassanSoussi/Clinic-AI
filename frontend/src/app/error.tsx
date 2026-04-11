"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

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
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="bg-card w-full max-w-2xl rounded-[2rem] p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Something went wrong
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-foreground">
          This view couldn’t finish loading.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          The product logic is still intact, but this route hit an error while rendering. Try the view again or move to a nearby workspace page.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="app-btn app-btn-primary" onClick={() => reset()}>
            <RefreshCw className="h-4 w-4" />
            Retry view
          </button>
          <Link href="/dashboard" className="app-btn app-btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
