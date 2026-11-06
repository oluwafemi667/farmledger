import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/auth/session";
import { demoCredentials, isDemoMode, isDemoRole } from "@/lib/demo";
import { FailureLimiter } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Each visit counts, so one address cannot hammer the sign-in endpoint.
const visits = new FailureLimiter({ max: 40, windowMs: 10 * 60_000 });

/** One click into the demo: signs the visitor in as the shared demo owner or farmhand. */
export async function GET(_req: Request, { params }: { params: { role: string } }) {
  if (!isDemoMode() || !isDemoRole(params.role)) return new Response("Not found", { status: 404 });
  const creds = demoCredentials(params.role);
  if (!creds) return new Response("The demo is not set up yet.", { status: 503 });

  const address = (headers().get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (visits.check(address).blocked) return new Response("Too many visits. Try again in a few minutes.", { status: 429 });
  visits.fail(address);

  const { error } = await createClient().auth.signInWithPassword(creds);
  if (error) return new Response("The demo is unavailable right now. Please try again shortly.", { status: 503 });
  redirect(homePathFor(params.role));
}
