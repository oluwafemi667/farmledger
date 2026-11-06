"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    // In the demo everyone shares two accounts, so only end THIS browser's session.
    await supabase.auth.signOut({ scope: isDemoMode() ? "local" : "global" });
  }
  redirect("/login");
}
