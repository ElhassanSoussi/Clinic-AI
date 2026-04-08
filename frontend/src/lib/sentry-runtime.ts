/**
 * Shared Sentry bootstrap values for Node, Edge, and browser.
 * Keep DSN and environment resolution consistent across runtimes.
 */

export function getSentryDsn(): string {
  return (process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim();
}

export function isSentryEnabled(): boolean {
  return getSentryDsn().length > 0;
}

/** Vercel sets VERCEL_ENV on server/edge; omitted in the browser unless mirrored to NEXT_PUBLIC_. */
export function getSentryEnvironment(): string {
  return (
    process.env.VERCEL_ENV?.trim() ||
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.NODE_ENV ||
    "development"
  );
}
