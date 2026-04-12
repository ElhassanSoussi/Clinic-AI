/** Public API base including `/api` — matches backend mount and README. */
export function getApiBaseUrl(): string {
  const raw =
    import.meta.env.NEXT_PUBLIC_API_URL ?? import.meta.env.VITE_PUBLIC_API_URL ?? "";
  const trimmed = String(raw).trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, "");
  }
  return "http://127.0.0.1:7001/api";
}
