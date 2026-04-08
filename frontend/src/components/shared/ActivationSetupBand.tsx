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
  /** From dashboard analytics; when live and zero, nudge first traffic */
  conversationsTotal?: number;
};

/**
 * Contextual activation banner driven only by `computeSystemStatus` + real counts.
 * Shown on the dashboard (not a fake checklist — items mirror Settings sections).
 */
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
      <div className="rounded-xl border border-teal-100 bg-[#F0FDFA]/80 px-4 py-3.5" role="status">
        <div className="flex flex-wrap items-start gap-3">
          <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-[#0F766E]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#0F172A]">You&apos;re live — waiting on first patient traffic</p>
            <p className="mt-1 text-sm leading-relaxed text-[#475569]">
              New messages land in{" "}
              <Link href="/dashboard/inbox" className="font-semibold text-[#115E59] hover:underline">
                Inbox
              </Link>
              ; captured booking requests in{" "}
              <Link href="/dashboard/leads" className="font-semibold text-[#115E59] hover:underline">
                Leads
              </Link>
              . Send a test from your public chat page to confirm the loop end-to-end.
            </p>
            {clinic.slug ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/chat/${clinic.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#115E59]"
                >
                  Open patient chat
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (status === "READY") {
    return (
      <div
        className={`rounded-xl border px-4 py-3.5 ${cfg.border} ${cfg.bg}`}
        role="status"
      >
        <div className="flex flex-wrap items-start gap-3">
          <ClipboardList className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${cfg.color}`}>Setup checklist complete — ready to go live</p>
            <p className="mt-1 text-sm leading-relaxed text-[#475569]">
              Preview your public chat, then use <span className="font-semibold text-[#0F172A]">Go live</span> in the top
              bar when you want patients to see an active assistant. Until then, the chat page stays in a clear not-live
              state.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {clinic.slug ? (
                <a
                  href={`/chat/${clinic.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#115E59]"
                >
                  Preview patient chat
                </a>
              ) : null}
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
              >
                Review settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const blockers = firstIncomplete?.missing ?? [];
  const section = firstIncomplete?.drawerSection ?? "clinic-info";

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${cfg.border} ${cfg.bg}`}
      role="status"
    >
      <div className="flex flex-wrap items-start gap-3">
        <ClipboardList className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${cfg.color}`}>
            {status === "NOT_READY" ? "Finish setup to unlock go-live" : "Almost there — finish remaining setup"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[#475569]">
            <span className="font-medium tabular-nums text-[#0F172A]">{completedCount}</span>
            <span className="text-[#64748B]">
              {" "}
              / {totalCount} checklist items complete in Settings (matches clinic info, services, spreadsheet,
              scheduling, embed).
            </span>
            {blockers.length > 0 ? (
              <>
                {" "}
                <span className="font-medium text-[#0F172A]">Next:</span> {blockers.join("; ")}.
              </>
            ) : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={settingsHref(section)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#115E59]"
            >
              Open Settings — {firstIncomplete?.label ?? "Clinic"}
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/dashboard/training"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
            >
              AI Training
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
