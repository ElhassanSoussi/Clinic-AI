import { getApiBaseUrl } from "./env";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Maps API/network errors to short, staff-friendly copy (toast + inline). */
export function userFacingApiError(error: unknown, fallback = "Something went wrong. Try again."): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Your session expired. Sign in again to continue.";
    }
    if (error.status === 403) {
      return "You don't have permission to do that.";
    }
    if (error.status === 404) {
      return "We couldn't find that. It may have been removed or the link is out of date.";
    }
    if (error.message) {
      return error.message;
    }
    return fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export async function parseApiErrorMessage(res: Response): Promise<string> {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const raw = await res.text();
  if (ct.includes("text/html") || /^\s*</.test(raw)) {
    return "Server returned HTML instead of API JSON. Check NEXT_PUBLIC_API_URL points at the Clinic AI API and that CORS allows this site.";
  }
  if (!raw.trim()) {
    return res.statusText || `HTTP ${res.status}`;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === "string") {
        return detail;
      }
      if (Array.isArray(detail)) {
        return detail
          .map((item) =>
            typeof item === "object" && item && "msg" in item
              ? String((item as { msg: unknown }).msg)
              : JSON.stringify(item),
          )
          .join("; ");
      }
    }
  } catch {
    /* not JSON */
  }
  const t = raw.trim();
  return t.length > 220 ? `${t.slice(0, 220)}…` : t;
}

function joinUrl(base: string, path: string): string {
  if (!base) {
    throw new ApiError(
      "API is not configured: set NEXT_PUBLIC_API_URL to your backend base URL (must include /api).",
      0,
    );
  }
  if (path.startsWith("http")) {
    return path;
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export type ApiFetchOptions = RequestInit & { accessToken?: string | null };

/** Dispatched when an authenticated request returns 401 (handled in AuthProvider). */
export const CLINIC_AI_SESSION_EXPIRED_EVENT = "clinic-ai:session-expired";

/** Set before session clear so `/login` can show a one-time notice. */
export const CLINIC_AI_SESSION_EXPIRED_STORAGE_KEY = "clinic_ai_session_expired_notice";

export async function apiFetch(path: string, init: ApiFetchOptions = {}): Promise<Response> {
  const { accessToken, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  const body = rest.body;
  if (
    body !== undefined &&
    body !== null &&
    typeof body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  const url = joinUrl(getApiBaseUrl(), path);
  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers });
  } catch (e) {
    const hint =
      e instanceof TypeError
        ? "Network error: could not reach the API. Check NEXT_PUBLIC_API_URL, HTTPS, and CORS."
        : "Network error: could not reach the API.";
    throw new ApiError(e instanceof Error ? `${hint} (${e.message})` : hint, 0);
  }
  if (accessToken && res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(CLINIC_AI_SESSION_EXPIRED_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new Event(CLINIC_AI_SESSION_EXPIRED_EVENT));
    }
  }
  return res;
}

export async function apiJson<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    throw new ApiError(await parseApiErrorMessage(res), res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined as T;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new ApiError(
      "The server returned data we couldn't read. Check your connection and API URL, then try again.",
      502,
    );
  }
}
