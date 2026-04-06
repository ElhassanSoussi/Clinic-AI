export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
