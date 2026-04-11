import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="bg-card w-full max-w-xl rounded-[2rem] p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Compass className="h-6 w-6" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Page not found
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-foreground">
          This route no longer exists in the old layout.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          The frontend is on a new foundation. Use the main routes below to continue.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="app-btn app-btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
          <Link href="/dashboard" className="app-btn app-btn-primary">
            Open dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
