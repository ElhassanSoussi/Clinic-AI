import type { Provider } from "@supabase/supabase-js";
import type { ReactNode } from "react";

export interface OAuthProvider {
  id: Provider;
  label: string;
  icon: () => ReactNode;
  enabled?: boolean;
  helpText?: string;
  scopes?: string;
  queryParams?: Record<string, string>;
}

/**
 * Ordered list of OAuth providers to display.
 * To disable a provider, remove it from this array.
 * Only providers that are configured in the Supabase dashboard will actually work.
 */
export const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: "google",
    label: "Continue with Google",
    icon: () => null, // icons rendered in OAuthButtons component
    enabled: true,
    scopes: "openid email profile",
  },
  {
    id: "azure",
    label: "Continue with Microsoft",
    icon: () => null,
    enabled: process.env.NEXT_PUBLIC_ENABLE_MICROSOFT_OAUTH === "true",
    scopes: "openid email profile offline_access",
    queryParams: {
      prompt: "select_account",
    },
    helpText:
      "Microsoft sign-in is temporarily unavailable until the Azure tenant is fixed in Supabase.",
  },
];
