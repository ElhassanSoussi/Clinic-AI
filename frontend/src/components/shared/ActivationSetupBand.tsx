"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, Rocket } from "lucide-react";
import type { Clinic } from "@/types";
import { computeSystemStatus, STATUS_CONFIG } from "@/lib/system-status";

function settingsHref(section: string): string {
  return `/dashboard/settings?section=${encodeURIComponent(section)}`;
}

export type ActivationSetupBandProps = {
  clinic: Clinic;
  conversationsTotal?: number;
};

export function ActivationSetupBand({
  clinic,
  conversationsTotal = 0,
}: ActivationSetupBandProps) {
  const { status, items, completedCount, totalCount } = computeSystemStatus(clinic);
  const firstIncomplete = items.find((i) => !i.completed);
  const cfg = STATUS_CONFIG[status];

  if (status === "LIVE") {
    if (conversationsTotal > 0) return null;
    return (
      <div className="panel-surface rounded-[1.9rem] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-app-text-muted">Activation</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-app-text">The assistant is live. Time to create first traffic.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-app-text-secondary">
          Share the widget or direct chat link with your team and test a first patient journey. No conversation volume yet is normal right after launch.
        </p>
      </div>
    );
  }

  if (status === "READY") {
    return (
      <div className="panel-surface rounded-[1.9rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-app-text-muted">Ready to launch</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-app-text">Configuration is complete. Publish when the clinic is ready.</h2>
            <p className="mt-3 text-sm leading-7 text-app-text-secondary">
              Every required setup section is complete. Review branding, preview chat, and go live from Settings.
            </p>
          </div>
          <Link href="/dashboard/settings?section=embed" className="app-btn app-btn-primary">
            <Rocket className="h-4 w-4" />
            Review go-live controls
          </Link>
        </div>
      </div>
    );
  }

  const blockers = firstIncomplete?.missing ?? [];
  const section = firstIncomplete?.drawerSection ?? "clinic-info";

  return (
    <div className="panel-surface rounded-[1.9rem] p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-app-text">
            {completedCount}/{totalCount} setup areas complete
          </h2>
          <p className="mt-3 text-sm leading-7 text-app-text-secondary">
            Complete the next section to move the clinic closer to a stable launch.
          </p>
          {blockers.length > 0 ? (
            <ul className="mt-4 grid gap-2 text-sm text-app-text-muted">
              {blockers.map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-app-primary" />
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={settingsHref(section)} className="app-btn app-btn-primary">
            <ArrowRight className="h-4 w-4" />
            Finish next section
          </Link>
        </div>
      </div>
    </div>
  );
}
