import type { Metadata } from "next";
import { Sprout } from "lucide-react";
import { toDueOptions, toFlockOptions } from "@/components/log/options";
import { VaccinationForm } from "@/components/log/vaccination-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth/session";
import { getDailyStatus } from "@/lib/queries";

export const metadata: Metadata = { title: "Record vaccination" };

export default async function VaccinationsPage({
  searchParams,
}: {
  searchParams: { flock?: string; schedule?: string };
}) {
  const profile = await requireProfile();
  const { flocks, days } = await getDailyStatus();

  return (
    <>
      <PageHeader eyebrow="Log" title="Record a vaccination" />
      {flocks.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No flocks to log yet"
          description="Ask the owner to add a flock first."
        />
      ) : (
        <VaccinationForm
          farmId={profile.farmId}
          flocks={toFlockOptions(flocks)}
          due={toDueOptions(flocks, days)}
          requestedFlock={searchParams.flock}
          requestedSchedule={searchParams.schedule}
        />
      )}
    </>
  );
}
