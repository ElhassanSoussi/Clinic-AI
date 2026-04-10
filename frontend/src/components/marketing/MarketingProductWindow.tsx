import type { ReactNode } from "react";

type MarketingProductWindowProps = {
  pathLabel: string;
  children: ReactNode;
  caption?: string;
  className?: string;
};

export function MarketingProductWindow({
  pathLabel,
  children,
  caption,
  className = "",
}: MarketingProductWindowProps) {
  return (
    <figure className={`panel-surface rounded-4xl p-3 ${className}`.trim()}>
      <div className="rounded-[1.65rem] border border-app-border/70 bg-[#f8fbfc] p-3 shadow-inner">
        <div className="mb-3 flex items-center gap-3 rounded-[1.15rem] border border-app-border/70 bg-white/92 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="rounded-full bg-app-surface-alt px-3 py-1 text-xs font-semibold text-app-text-muted">
            {pathLabel}
          </div>
        </div>
        <div className="rounded-[1.35rem] border border-app-border/70 bg-white/86 p-4">
          {children}
        </div>
      </div>
      {caption ? (
        <figcaption className="px-2 pt-4 text-sm leading-7 text-app-text-muted">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
