/**
 * What a farmhand can tick when birds look unwell, and what the app says back.
 * The app does not diagnose. It records what was seen, and for the worrying
 * combinations it tells people to call a vet and keep sick birds apart.
 */
export const HEALTH_SIGNS = [
  { id: "coughing_sneezing", label: "Coughing or sneezing", urgent: false },
  { id: "diarrhoea", label: "Diarrhoea", urgent: false },
  { id: "swollen_face_eyes", label: "Swollen face or eyes", urgent: false },
  { id: "drop_in_feed", label: "Eating less", urgent: false },
  { id: "drop_in_water", label: "Drinking less", urgent: false },
  { id: "lethargy_huddling", label: "Dull, huddling together", urgent: false },
  { id: "ruffled_feathers", label: "Ruffled feathers", urgent: false },
  { id: "pale_comb", label: "Pale or dark comb", urgent: false },
  { id: "soft_shelled_eggs", label: "Soft or misshapen eggs", urgent: false },
  { id: "drop_in_laying", label: "Laying has dropped", urgent: false },
  { id: "twisted_neck_paralysis", label: "Twisted neck, paralysis", urgent: true },
  { id: "sudden_deaths", label: "Sudden deaths", urgent: true },
] as const;

export type HealthSignId = (typeof HEALTH_SIGNS)[number]["id"];
export const HEALTH_SIGN_IDS = HEALTH_SIGNS.map((s) => s.id) as [HealthSignId, ...HealthSignId[]];
export const signLabel = (id: string) => HEALTH_SIGNS.find((s) => s.id === id)?.label ?? id.replace(/_/g, " ");

export interface Advice {
  level: "watch" | "attention";
  text: string;
}

/** Plain, safe guidance. It never names a disease or a medicine. */
export function adviceFor(signs: readonly string[], birdsAffected: number | null): Advice {
  const urgent = signs.some((s) => HEALTH_SIGNS.find((x) => x.id === s)?.urgent);
  if (urgent || signs.length >= 3 || (birdsAffected ?? 0) >= 20) {
    return {
      level: "attention",
      text: "Call your vet today. Keep the sick birds apart, limit movement between houses, and do not sell or move birds until the vet has seen them.",
    };
  }
  return {
    level: "watch",
    text: "Watch this flock closely and record again tomorrow. If more birds show signs or it gets worse, call your vet.",
  };
}

export interface HealthRecord {
  id: string;
  flockId: string;
  observedOn: string;
  signs: string[];
  birdsAffected: number | null;
  notes: string | null;
  vetFindings: string | null;
  treatment: string | null;
  eggHoldUntil: string | null;
  resolvedOn: string | null;
}

/** Eggs must not be sold while a hold date is today or later. Returns the latest hold for the flock. */
export function activeEggHold(events: readonly HealthRecord[], flockId: string, today: string): string | null {
  const holds = events
    .filter((e) => e.flockId === flockId && e.eggHoldUntil && e.eggHoldUntil >= today)
    .map((e) => e.eggHoldUntil as string)
    .sort();
  return holds.length ? holds[holds.length - 1] : null;
}

export const isOpen = (e: Pick<HealthRecord, "resolvedOn">) => !e.resolvedOn;
