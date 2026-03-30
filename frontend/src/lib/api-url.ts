import { getInternalApiEnv, getPublicApiEnv } from "@/lib/env";

function normalizeApiUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/\/$/, "");
  }
}

export function getPublicApiUrl(): string {
  return normalizeApiUrl(getPublicApiEnv());
}

export function getInternalApiUrl(): string {
  return normalizeApiUrl(getInternalApiEnv());
}
