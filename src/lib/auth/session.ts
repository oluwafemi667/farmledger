import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type Role = "owner" | "farmhand";

export interface CurrentProfile {
  userId: string;
  email: string | null;
  fullName: string;
  role: Role;
  farmId: string;
}

/** Where each role lands after signing in. */
export function homePathFor(role: Role): string {
  return role === "owner" ? "/overview" : "/today";
}

/**
 * The signed-in user's profile, read through RLS, or null when there is no
 * session or the account has not been linked to a farm. The role comes from
 * the database table that RLS itself uses, never from anything the client sent.
 */
export const getCurrentProfile = cache(
  async (): Promise<CurrentProfile | null> => {
    if (!isSupabaseConfigured()) return null;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Two-step login: a password alone is not enough once a code app is set up.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") return null;

    const { data } = await supabase
      .from("profiles")
      .select("full_name, role, farm_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!data) return null;

    return {
      userId: user.id,
      email: user.email ?? null,
      fullName: data.full_name as string,
      role: data.role as Role,
      farmId: data.farm_id as string,
    };
  },
);

/**
 * Use at the top of a protected layout. Signed-out users go to login; someone
 * in the wrong area is sent to their own home rather than shown an error.
 */
export async function requireProfile(role?: Role): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (role && profile.role !== role) redirect(homePathFor(profile.role));
  return profile;
}
