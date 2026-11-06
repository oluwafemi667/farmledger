import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/** Browser client. Used by the offline sync engine in stage 4. */
export function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createBrowserClient(env.url, env.anonKey);
}
