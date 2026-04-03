import { getInternalApiEnv, getPublicApiEnv } from "@/lib/env";

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveDevelopmentBrowserApiUrl(value: string): string {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return value;
  }

  try {
    const apiUrl = new URL(value);
    const browserUrl = new URL(window.location.origin);
    if (!isLoopbackHostname(apiUrl.hostname) || isLoopbackHostname(browserUrl.hostname)) {
      return value;
    }
    apiUrl.hostname = browserUrl.hostname;
    return apiUrl.toString();
  } catch {
    return value;
  }
}

function normalizeApiUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/\/$/, "");
  }
}

export function getPublicApiUrl(): string {
  return normalizeApiUrl(resolveDevelopmentBrowserApiUrl(getPublicApiEnv()));
}

export function getInternalApiUrl(): string {
  return normalizeApiUrl(getInternalApiEnv());
}
