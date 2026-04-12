/**
 * Shared layout tokens for authenticated app pages.
 * Single source of truth for responsive page padding and primary headings.
 */
export const appPagePaddingClass = "p-4 sm:p-6 md:p-8";

/** Standard H1 on most app pages (dashboard, settings, billing, etc.). */
export const appPageTitleClass =
  "text-3xl font-bold tracking-tight text-slate-950 dark:text-foreground mb-2";

/** Smaller H1 for list-heavy routes; add `mb-2` / `mb-1` at call site. */
export const appPageTitleCompactClass =
  "text-2xl font-bold tracking-tight text-slate-950 dark:text-foreground";

/** Section title inside a page (card group header). */
export const appSectionTitleClass = "text-lg font-semibold text-slate-950 dark:text-foreground";

/** Muted explainer under page title. */
export const appPageSubtitleClass = "text-[15px] text-slate-600 dark:text-muted-foreground leading-relaxed";
