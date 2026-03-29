import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv, isFrontendEnvError } from "@/lib/env";

const AUTH_ERROR_COOKIE = "clinic_ai_auth_error";

function redirectToLoginWithError(
  origin: string,
  errorDescription: string
) {
  const response = NextResponse.redirect(new URL("/login", origin));
  response.cookies.set(AUTH_ERROR_COOKIE, errorDescription, {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/complete";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error || errorDescription) {
    return redirectToLoginWithError(
      origin,
      errorDescription ?? "OAuth sign-in failed. Please try again."
    );
  }

  if (code) {
    const redirectUrl = `${origin}${next}`;
    const response = NextResponse.redirect(redirectUrl);
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
