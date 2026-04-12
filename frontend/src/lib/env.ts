/** Public API base including `/api` — matches backend mount and README. */
export function getApiBaseUrl(): string {
  const raw =
    import.meta.env.NEXT_PUBLIC_API_URL ?? import.meta.env.VITE_PUBLIC_API_URL ?? "";
  const trimmed = String(raw).trim().replace(/\/$/, "");
  if (trimmed) {
    return trimmed;
  }
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:7001/api";
  }
  console.error(
    "[Clinic AI] NEXT_PUBLIC_API_URL is not set. Production API calls will fail until you set it on your host (e.g. Vercel).",
  );
  return "";
}
