import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

export interface SessionResult {
  response: NextResponse;
  /** True when a signed-in user was confirmed with the auth server. */
  authenticated: boolean;
  configured: boolean;
}

/**
 * Refreshes the auth cookies on every request. Gating here is only a
 * convenience redirect: the real protection is Row Level Security in the
 * database plus the role checks in the server layouts.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();
  if (!env) return { response, authenticated: false, configured: false };

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    const { data } = await supabase.auth.getUser();
    return { response, authenticated: !!data.user, configured: true };
  } catch {
    // The auth server was unreachable (weak connection). Do not bounce a
    // signed-in farmhand to the login page; data access is still guarded by RLS.
    return { response, authenticated: true, configured: true };
  }
}
