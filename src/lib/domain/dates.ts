/** The farm runs on Nigerian time, whatever the server's clock says. */
export const FARM_TIMEZONE = "Africa/Lagos";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date (YYYY-MM-DD) in the given time zone. */
export function todayIn(timeZone: string = FARM_TIMEZONE, now: Date = new Date()): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Today's date on this device, for forms running in the browser. */
export function deviceToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  if (!ISO.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  const f = Date.parse(`${from}T00:00:00Z`);
  const t = Date.parse(`${to}T00:00:00Z`);
  return Math.round((t - f) / 86_400_000);
}

/** "Tue 3 Nov", for lists. */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "5 weeks" or "3 days": a flock's age in the unit people use. */
export function formatAge(days: number): string {
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"}`;
  const weeks = Math.floor(days / 7);
  return `${weeks} weeks`;
}
