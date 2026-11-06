import type { Metadata } from "next";
import { Plus, Sprout } from "lucide-react";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { FlockDirectory, type FlockRow } from "@/components/owner/flock-directory";
import { getDaySummaries, getFlocks, getToday } from "@/lib/farm";

export const metadata: Metadata = { title: "Flocks" };

export default async function FlocksPage() {
  const today = await getToday();
  const [flocks, days] = await Promise.all([getFlocks(), getDaySummaries(today)]);

  const rows: FlockRow[] = flocks.map((f) => {
    const d = days[f.id];
    return {
      id: f.id,
      name: f.name,
      breed: f.breed,
      house: f.house,
      activeBirds: f.activeBirds,
      ageDays: f.ageDays,
      eggsToday: d && d.eggEntries > 0 ? d.eggs : null,
      vaccinesOverdue: d?.vaccinesOverdue ?? 0,
    };
  });

  const addButton = (
    <LinkButton href="/flocks/new" variant="primary">
      <Plus className="h-4 w-4" aria-hidden />
      Add flock
    </LinkButton>
  );

  return (
    <>
      <PageHeader
        eyebrow="Flocks"
        title="Flocks"
        description="Every active flock, side by side. Open one for its full record."
        actions={rows.length > 0 ? addButton : undefined}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No flocks yet"
          description="Add your first flock so the team can start logging eggs, deaths, feed and vaccines."
          action={addButton}
        />
      ) : (
        <FlockDirectory rows={rows} />
      )}
    </>
  );
}
