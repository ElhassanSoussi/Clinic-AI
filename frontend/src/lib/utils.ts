export function formatDateTime(dateStr: string): string {
  if (!dateStr?.trim()) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string): string {
  if (!dateStr?.trim()) return "—";
  const now = new Date();
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (!Number.isFinite(seconds)) return "—";

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Non-negative integer for counts in cards and lists — avoids NaN from odd API payloads. */
export function safeCount(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n)) return Math.max(0, Math.floor(n));
  return 0;
}

/** Integer percent 0–100 for progress labels and readouts. */
export function clampPercentInt(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Setup checklist progress bar: completed / total sections → 0–100. */
export function setupProgressPercent(completed: number, total: number): number {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

/** Returns true when `url` is an absolute HTTP(S) URL pointing at the current origin. */
export function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (globalThis.window !== undefined) {
      return parsed.origin === globalThis.location.origin;
    }
    return true; // server-side: accept any http(s)
  } catch {
    return false;
  }
}

/** Returns true for any absolute HTTPS URL (for third-party redirects like Stripe/OAuth). */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns true when `path` is a safe relative path (starts with / but not //, no traversal). */
export function isSafeRelativePath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes(":")) {
    return false;
  }
  // Reject path traversal attempts (.. segments or encoded variants)
  const decoded = decodeURIComponent(path);
  return !decoded.split("/").some((seg) => seg === ".." || seg === ".");
}

/** Basic email format check for client-side validation. */
export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}
