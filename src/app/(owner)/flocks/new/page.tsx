import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { NewFlockForm } from "@/components/owner/flock-form";
import { requireProfile } from "@/lib/auth/session";
import { getFlocks } from "@/lib/farm";

export const metadata: Metadata = { title: "Add flock" };

export default async function NewFlockPage() {
  const profile = await requireProfile("owner");
  const flocks = await getFlocks();
  return (
    <>
      <PageHeader
        eyebrow="Flocks"
        title="Add a flock"
        description="Record when and how many birds were placed. The live bird count is worked out from this and the deaths the team records."
      />
      <NewFlockForm farmId={profile.farmId} existingNames={flocks.map((f) => f.name)} />
    </>
  );
}
