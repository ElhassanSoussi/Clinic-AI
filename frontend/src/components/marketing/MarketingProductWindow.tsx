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
    <figure className={`rounded-[1.25rem] border border-border/90 bg-card p-3 shadow-[var(--shadow-card)] ${className}`.trim()}>
      <div className="rounded-lg border border-border/80 bg-muted p-3">
        <div className="mb-3 flex items-center gap-3 rounded-[0.9rem] border border-border/80 bg-card px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="rounded-full bg-card-alt px-3 py-1 text-xs font-medium text-muted-foreground">
            {pathLabel}
          </div>
        </div>
        <div className="rounded-[0.95rem] border border-border/80 bg-card p-4">
          {children}
        </div>
      </div>
      {caption ? (
        <figcaption className="px-2 pt-4 text-sm leading-7 text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
