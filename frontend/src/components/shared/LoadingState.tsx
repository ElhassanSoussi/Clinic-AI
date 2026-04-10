"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  readonly message?: string;
  readonly detail?: string;
}

export function LoadingState({ message = "Loading...", detail }: LoadingStateProps) {
  return (
    <div className="panel-surface flex min-h-[18rem] flex-col items-center justify-center rounded-[2rem] px-6 py-10 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-app-primary" />
      <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-app-text">{message}</p>
      {detail ? <p className="mt-2 max-w-md text-sm leading-7 text-app-text-muted">{detail}</p> : null}
    </div>
  );
}
