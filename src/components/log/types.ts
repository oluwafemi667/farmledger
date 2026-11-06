export interface FlockOption {
  id: string;
  name: string;
  activeBirds: number;
}

/** Today's egg position for one flock, used for comparison while entering. */
export interface EggContext {
  eggsToday: number;
  previousEggs: number | null;
  previousDate: string | null;
}

export interface DueVaccineOption {
  scheduleId: string;
  vaccineName: string;
  daysUntil: number;
}
