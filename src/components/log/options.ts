import type { FlockSummary } from "@/lib/farm";
import type { FlockDay } from "@/lib/domain/daily-status";
import type { DueVaccineOption, EggContext, FlockOption } from "./types";

export function toFlockOptions(flocks: FlockSummary[]): FlockOption[] {
  return flocks.map((f) => ({ id: f.id, name: f.name, activeBirds: f.activeBirds }));
}

export function toEggContexts(
  flocks: FlockSummary[],
  days: Record<string, FlockDay>,
): Record<string, EggContext> {
  return Object.fromEntries(
    flocks.map((f) => [
      f.id,
      {
        eggsToday: days[f.id]?.eggsToday ?? 0,
        previousEggs: days[f.id]?.previousEggs ?? null,
        previousDate: days[f.id]?.previousDate ?? null,
      },
    ]),
  );
}

export function toDueOptions(
  flocks: FlockSummary[],
  days: Record<string, FlockDay>,
): Record<string, DueVaccineOption[]> {
  return Object.fromEntries(
    flocks.map((f) => [
      f.id,
      (days[f.id]?.dueVaccines ?? []).map((v) => ({
        scheduleId: v.scheduleId,
        vaccineName: v.vaccineName,
        daysUntil: v.daysUntil,
      })),
    ]),
  );
}
