import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo";
import { getCurrentProfile, homePathFor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Entry point: send each person to the area their role allows.
export default async function Home() {
  const profile = await getCurrentProfile();
  redirect(profile ? homePathFor(profile.role) : isDemoMode() ? "/demo/owner" : "/login");
}
