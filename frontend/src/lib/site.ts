/**
 * Canonical browser origin for Stripe return URLs, patient chat links, and embed snippets.
 * Prefer `NEXT_PUBLIC_SITE_URL` in production so links match the marketing domain (not a preview URL).
 */
export function getPublicOrigin(): string {
  const env = import.meta.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) {
    return env.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://127.0.0.1:1201";
}
