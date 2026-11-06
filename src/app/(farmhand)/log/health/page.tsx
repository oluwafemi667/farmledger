import type { Metadata } from "next";
import { Sprout } from "lucide-react";
import { HealthForm } from "@/components/log/health-form";
import { toFlockOptions } from "@/components/log/options";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { getDailyStatus } from "@/lib/queries";

export const metadata: Metadata = { title: "Report sick birds" };

export default async function HealthPage({ searchParams }: { searchParams: { flock?: string } }) {
  const profile = await requireProfile();
  const { flocks } = await getDailyStatus();
  return (
    <>
      <PageHeader eyebrow="Log" title="Report sick birds" description="Tick what you see. The owner is told, and you get the next step." />
      {flocks.length === 0 ? (
        <EmptyState icon={Sprout} title="No flocks to log yet" description="Ask the owner to add a flock first." />
      ) : (
        <HealthForm farmId={profile.farmId} flocks={toFlockOptions(flocks)} requestedFlock={searchParams.flock} />
      )}
    </>
  );
}
