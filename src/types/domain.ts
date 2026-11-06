/** Per-flock figures for one farm-local day, plus the day before. */
export interface DaySummary {
  flockId: string;
  eggs: number;
  broken: number;
  eggEntries: number;
  eggsPrev: number;
  deaths: number;
  feedKg: number;
  feedKgPrev: number;
  vaccinesOverdue: number;
  nextVaccineName: string | null;
  nextVaccineDue: string | null;
}
