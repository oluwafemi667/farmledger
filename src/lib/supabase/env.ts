export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * Public Supabase settings, or null when they are not set. Callers decide how
 * to degrade, so the design page and local builds still work without a project.
 * Only the anon key is ever read here; the service role key must never be.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}
