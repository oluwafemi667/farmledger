import type { Metadata } from "next";
import { MfaPanel } from "@/components/owner/forms/mfa-panel";
import { TeamView } from "@/components/owner/views/team-view";
import { isDemoMode } from "@/lib/demo";
import { getAuditFeed, getStaffActivity, getToday } from "@/lib/farm";

export const metadata: Metadata = { title: "Team and audit" };

export default async function TeamPage() {
  const today = await getToday();
  const [staff, audit] = await Promise.all([getStaffActivity(30, today), getAuditFeed(100)]);
  return <TeamView staff={staff} audit={audit} days={30} mfa={isDemoMode() ? <p className="max-w-xl text-stone-700">Two-step sign-in is available on the real owner account. It is switched off in this demo.</p> : <MfaPanel />} />;
}
