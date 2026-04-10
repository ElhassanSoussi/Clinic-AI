"use client";

import { useState, useSyncExternalStore, type FC } from "react";
import { Loader2 } from "lucide-react";
import { normalizeAuthError } from "@/lib/auth-errors";
import { createClient } from "@/utils/supabase/client";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/oauth-providers";
import { isSafeExternalUrl, isSafeRelativePath } from "@/lib/utils";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-1.9 3.1l3 2.3c1.8-1.7 2.9-4.2 2.9-7.1 0-.7-.1-1.4-.2-2.1H12Z" />
      <path fill="#34A853" d="M12 21.5c2.6 0 4.9-.9 6.5-2.5l-3-2.3c-.8.6-1.9 1-3.5 1-2.7 0-5-1.8-5.8-4.3l-3.1 2.4c1.6 3.2 4.9 5.7 8.9 5.7Z" />
      <path fill="#4A90E2" d="M6.2 13.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.1 7.2C2.4 8.5 2 10 2 11.5s.4 3 1.1 4.3l3.1-2.4Z" />
      <path fill="#FBBC05" d="M12 5.3c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.4 14.6 1.5 12 1.5c-4 0-7.3 2.5-8.9 5.7l3.1 2.4c.8-2.5 3.1-4.3 5.8-4.3Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, FC> = {
  google: GoogleIcon,
  azure: MicrosoftIcon,
};

function renderProviderIcon(
  isLoading: boolean,
  Icon: FC | undefined,
): React.ReactNode {
  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;
  }

  if (!Icon) {
    return null;
  }

  return (
    <span className="flex h-5 w-5 items-center justify-center">
      <Icon />
    </span>
  );
}

function formatProviderError(provider: OAuthProvider, message: string): string {
  return normalizeAuthError(message, provider.label);
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
      const safeNext = nextPath && isSafeRelativePath(nextPath) ? nextPath : undefined;
      const redirectTo = safeNext
        ? `${globalThis.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
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

      if (data?.url && globalThis.window !== undefined && isSafeExternalUrl(data.url)) {
        globalThis.location.assign(data.url);
        return;
      }

      if (data?.url) {
        throw new Error(`${provider.label} returned an invalid redirect URL.`);
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
                onClick={() => void handleOAuth(provider)}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-app-border/80 bg-white/92 px-4 py-3 text-sm font-semibold text-app-text shadow-sm transition-colors hover:border-app-primary/20 hover:text-app-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {providerIcon}
                {isLoading ? `Connecting ${provider.label.replace(/^Continue with /, "")}...` : provider.label}
              </button>
              {provider.helpText ? (
                <p className="text-xs leading-5 text-app-text-muted">{provider.helpText}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {providerError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {providerError}
        </div>
      ) : null}
    </div>
  );
}
