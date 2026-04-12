/** Canonical browser origin for Stripe return URLs and public links. */
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
