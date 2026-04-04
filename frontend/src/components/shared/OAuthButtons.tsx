"use client";

import { useState, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/oauth-providers";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 23 23" width={20} height={20}>
      <rect x={1} y={1} width={10} height={10} fill="#F25022" />
      <rect x={12} y={1} width={10} height={10} fill="#7FBA00" />
      <rect x={1} y={12} width={10} height={10} fill="#00A4EF" />
      <rect x={12} y={12} width={10} height={10} fill="#FFB900" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, React.FC> = {
  google: GoogleIcon,
  azure: MicrosoftIcon,
};

function renderProviderIcon(
  isLoading: boolean,
  Icon: React.FC | undefined,
): React.ReactNode {
  if (isLoading) {
    return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  }

  if (!Icon) {
    return null;
  }

  return (
    <span className="w-5 h-5 flex items-center justify-center">
      <Icon />
    </span>
  );
}

function formatProviderError(provider: OAuthProvider, message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("unsupported provider")) {
    return `${provider.label} is not enabled in Supabase yet.`;
  }

  if (lower.includes("provider is not enabled")) {
    return `${provider.label} is not enabled in Supabase yet.`;
  }

  if (lower.includes("redirect_uri_mismatch")) {
    return `${provider.label} is configured with the wrong redirect URL. Update the provider redirect/callback URLs in Supabase and the provider console.`;
  }

  if (lower.includes("invalid_client")) {
    return `${provider.label} is configured with an invalid client ID or secret. Re-check the provider credentials in Supabase.`;
  }

  if (lower.includes("access_denied")) {
    return `${provider.label} sign-in was cancelled or denied.`;
  }

  return message;
}

export default function OAuthButtons({
  disabled,
  nextPath,
}: Readonly<{
  disabled?: boolean;
  nextPath?: string;
}>) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providerError, setProviderError] = useState("");

  const handleOAuth = async (provider: OAuthProvider) => {
    if (provider.enabled === false) return;
    setLoadingProvider(provider.id);
    setProviderError("");
    try {
      const supabase = createClient();
      const redirectTo = nextPath
        ? `${globalThis.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
        : `${globalThis.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider.id,
        options: {
          redirectTo,
          scopes: provider.scopes,
          queryParams: provider.queryParams,
        },
      });

      if (error) {
        throw new Error(formatProviderError(provider, error.message));
      }

      if (data?.url && globalThis.window !== undefined) {
        globalThis.location.assign(data.url);
        return;
      }

      throw new Error(`${provider.label} did not return a sign-in redirect URL.`);
    } catch (error) {
      if (error instanceof Error) {
        setProviderError(error.message);
      } else {
        setProviderError("Unable to start social sign-in. Please try again.");
      }
      setLoadingProvider(null);
    }
  };

  if (OAUTH_PROVIDERS.length === 0) return null;

  const isAnyLoading = loadingProvider !== null;

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-slate-400">or</span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {OAUTH_PROVIDERS.map((provider) => {
          const isLoading = loadingProvider === provider.id;
          const Icon = PROVIDER_ICONS[provider.id];
          const providerDisabled =
            !mounted || !!disabled || isAnyLoading || provider.enabled === false;
          const providerIcon = renderProviderIcon(isLoading, Icon);
          return (
            <div key={provider.id} className="space-y-1.5">
              <button
                type="button"
                disabled={providerDisabled}
                onClick={() => handleOAuth(provider)}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {providerIcon}
                {provider.label}
              </button>
              {provider.enabled === false && provider.helpText ? (
                <p className="px-1 text-xs text-amber-600">{provider.helpText}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      {providerError ? (
        <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {providerError}
        </p>
      ) : null}
    </div>
  );
}
