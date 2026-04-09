import type { ReactNode } from "react";

type MarketingProductWindowProps = {
  /** Real app route (e.g. /dashboard/inbox) — shown in the chrome, not a fake domain. */
  pathLabel: string;
  children: ReactNode;
  /** Optional caption below the frame for proof / illustration context. */
  caption?: string;
  /** Optional class on the root figure (e.g. grid column placement). */
  className?: string;
};

/**
 * Browser-style frame around marketing previews so reads as “in-app” without
 * implying a literal screenshot.
 */
export function MarketingProductWindow({
  pathLabel,
  children,
  caption,
  className = "",
}: MarketingProductWindowProps) {
  return (
    <figure className={`m-0 ${className}`.trim()}>
      <div className="marketing-showcase-card">
        <div className="overflow-hidden rounded-[inherit] border border-slate-300/70 bg-slate-200/60 shadow-xl shadow-slate-900/12 ring-1 ring-black/5">
          <div className="flex items-center gap-3 border-b border-slate-300/60 bg-slate-100/95 px-3 py-2.5 sm:px-4">
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400/50" />
            </div>
            <div className="min-w-0 flex-1 rounded-md border border-slate-300/70 bg-white px-3 py-1.5 text-center shadow-inner">
              <span className="font-mono text-[0.6875rem] font-medium tracking-tight text-[#475569] sm:text-xs">
                {pathLabel}
              </span>
            </div>
          </div>
          <div className="bg-[var(--color-app-bg)]">{children}</div>
        </div>
      </div>
      {caption ? (
        <figcaption className="mt-3 text-[0.8125rem] leading-relaxed text-slate-500">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
