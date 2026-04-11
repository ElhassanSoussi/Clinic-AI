"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="bg-card w-full max-w-xl rounded-[2rem] p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Global error
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-foreground">
              The app shell needs a reset.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              We captured the failure. Try reloading the route, or head back to a stable entry point.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" className="app-btn app-btn-primary" onClick={() => reset()}>
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <Link href="/" className="app-btn app-btn-secondary">
                Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
