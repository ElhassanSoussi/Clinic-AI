import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv, isFrontendEnvError } from "@/lib/env";

const AUTH_ERROR_COOKIE = "clinic_ai_auth_error";

function normalizeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/auth/complete";
  }

  return nextPath;
}

function redirectToLoginWithError(
  origin: string,
  errorDescription: string
) {
  const response = NextResponse.redirect(new URL("/login", origin));
  response.cookies.set(AUTH_ERROR_COOKIE, errorDescription, {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

function getRequestOrigin(request: NextRequest): string {
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const resolvedHost = forwardedHost || host;

  if (resolvedHost) {
    const protocol = forwardedProto || (requestUrl.protocol === "https:" ? "https" : "http");
    return `${protocol}://${resolvedHost}`;
  }

  return requestUrl.origin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = searchParams.get("code");
  const next = normalizeNextPath(searchParams.get("next"));
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error || errorDescription) {
    return redirectToLoginWithError(
      origin,
      errorDescription ?? "OAuth sign-in failed. Please try again."
    );
  }

  if (code) {
    const response = NextResponse.redirect(new URL(next, origin));
    let supabaseUrl: string;
    let supabaseKey: string;

    try {
      const env = getSupabasePublicEnv();
      supabaseUrl = env.url;
      supabaseKey = env.anonKey;
    } catch (error) {
      if (isFrontendEnvError(error)) {
        return redirectToLoginWithError(origin, error.message);
      }
      throw error;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }

    return redirectToLoginWithError(
      origin,
      error.message || "OAuth sign-in failed. Please try again."
    );
  }

  return redirectToLoginWithError(
    origin,
    "Missing OAuth authorization code. Please try again."
  );
}
