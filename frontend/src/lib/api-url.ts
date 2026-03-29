import { getInternalApiEnv, getPublicApiEnv } from "@/lib/env";

function normalizeLoopbackHost(value: string): string {
  try {
    const url = new URL(value);

    if (url.hostname === "localhost" || url.hostname === "[::1]" || url.hostname === "::1") {
      url.hostname = "127.0.0.1";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/\/$/, "");
  }
}

export function getPublicApiUrl(): string {
  return normalizeLoopbackHost(getPublicApiEnv());
}

export function getInternalApiUrl(): string {
  return normalizeLoopbackHost(getInternalApiEnv());
}
