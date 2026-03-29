import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/env";

export const createClient = () => {
  const { url: supabaseUrl, anonKey: supabaseKey } = getSupabasePublicEnv();
  return createBrowserClient(supabaseUrl, supabaseKey);
};
