function decodeErrorValue(raw: string): string {
  let value = raw.replaceAll("+", " ");

  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }

  return value;
}

export function normalizeAuthError(raw: string | null, providerLabel?: string): string {
  if (!raw) return "";

  const decoded = decodeErrorValue(raw);
  const lower = decoded.toLowerCase();
  const providerPrefix = providerLabel ? `${providerLabel} ` : "";

  if (lower.includes("error getting user email from external provider")) {
    return "Microsoft sign-in failed because Azure did not return an email address. Enable 'Allow users without an email' for the Azure provider in Supabase or configure the Azure app to return an email claim.";
  }

  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  if (lower.includes("provider is not enabled") || lower.includes("unsupported provider")) {
    return `${providerPrefix}is not enabled in Supabase yet.`.trim();
  }

  if (lower.includes("redirect_uri_mismatch")) {
    return `${providerPrefix}is configured with the wrong redirect URL. Update the provider callback URL in Supabase and the provider console.`.trim();
  }

  if (lower.includes("invalid_client")) {
    return `${providerPrefix}is configured with an invalid client ID or secret. Re-check the provider credentials in Supabase.`.trim();
  }

  if (lower.includes("invalid api key")) {
    return "Supabase authentication is misconfigured in production. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.";
  }

  if (lower.includes("aadsts50020")) {
    return "Microsoft sign-in is blocked because this Azure app does not allow the current account type or tenant. Update the Azure app registration and Supabase Azure provider to support the right audience.";
  }

  if (lower.includes("aadsts500200")) {
    return "Microsoft sign-in is blocked because personal Microsoft accounts are not allowed for this Azure app. Update the Azure app registration audience or sign in with a work or school account.";
  }

  if (lower.includes("access_denied")) {
    return `${providerPrefix}sign-in was cancelled or denied.`.trim();
  }

  return decoded;
}
