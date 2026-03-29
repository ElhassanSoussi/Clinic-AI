const DEFAULT_DEV_API_URL = "http://127.0.0.1:7001/api";

const PUBLIC_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
} as const;

type PublicEnvName = keyof typeof PUBLIC_ENV;

export class FrontendEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrontendEnvError";
  }
}

function normalizeEnvValue(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readPublicEnv(name: PublicEnvName): string | undefined {
  return normalizeEnvValue(PUBLIC_ENV[name]);
}

function readServerEnv(value: string | undefined): string | undefined {
  return normalizeEnvValue(value);
}

function requirePublicEnv(name: PublicEnvName, helpText: string): string {
  const value = readPublicEnv(name);
  if (value) return value;

  throw new FrontendEnvError(`Missing ${name}. ${helpText}`);
}

export function isFrontendEnvError(error: unknown): error is FrontendEnvError {
  return error instanceof FrontendEnvError;
}

export function getSupabasePublicEnvError(): FrontendEnvError | null {
  const hasUrl = !!readPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const hasAnonKey = !!readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (hasUrl && hasAnonKey) {
    return null;
  }

  if (!hasUrl && hasAnonKey) {
    return new FrontendEnvError(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Set it to your Supabase project URL."
    );
  }

  if (hasUrl && !hasAnonKey) {
    return new FrontendEnvError(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Set it to your Supabase anon/public key."
    );
  }

  return new FrontendEnvError(
    "Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them to your Supabase project URL and anon/public key."
  );
}

export function hasSupabasePublicEnv(): boolean {
  return getSupabasePublicEnvError() === null;
}

export function getSupabasePublicEnv() {
  const envError = getSupabasePublicEnvError();
  if (envError) {
    throw envError;
  }

  return {
    url: requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", "Set it to your Supabase project URL."),
    anonKey: requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Set it to your Supabase anon/public key."),
  };
}

export function getPublicApiEnv(): string {
  const value = readPublicEnv("NEXT_PUBLIC_API_URL");
  if (value) return value;

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_DEV_API_URL;
  }

  throw new FrontendEnvError(
    "Missing NEXT_PUBLIC_API_URL. Set it to your deployed backend API URL, for example https://your-backend.onrender.com/api."
  );
}

export function getInternalApiEnv(): string {
  return readServerEnv(process.env.API_INTERNAL_URL) ?? getPublicApiEnv();
}
