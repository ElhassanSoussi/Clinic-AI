/**
 * Shared layout tokens for authenticated app pages.
 * Single source of truth for responsive page padding and primary headings.
 */
export const appPagePaddingClass = "p-4 sm:p-6 md:p-8";

/** Standard H1 on most app pages (dashboard, settings, billing, etc.). */
export const appPageTitleClass = "text-3xl font-bold text-foreground mb-2";

/** Smaller H1 for list-heavy routes; add `mb-2` / `mb-1` at call site. */
export const appPageTitleCompactClass = "text-2xl font-bold text-foreground";
