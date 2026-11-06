/** Local trading units. Eggs are sold by the crate, feed is bought by the bag. */
export const EGGS_PER_CRATE = 30;
export const KG_PER_BAG = 25;

export type FeedUnit = "kg" | "bag";

export function toCrates(eggs: number): { crates: number; loose: number } {
  return {
    crates: Math.floor(eggs / EGGS_PER_CRATE),
    loose: eggs % EGGS_PER_CRATE,
  };
}

/** "13 crates 12 eggs", "1 crate", "7 eggs". */
export function formatCrates(eggs: number): string {
  const { crates, loose } = toCrates(eggs);
  const parts: string[] = [];
  if (crates > 0) parts.push(`${crates} ${crates === 1 ? "crate" : "crates"}`);
  if (loose > 0 || crates === 0) {
    parts.push(`${loose} ${loose === 1 ? "egg" : "eggs"}`);
  }
  return parts.join(" ");
}

/** Feed quantity in kilograms, the unit stored in the database. */
export function toKg(quantity: number, unit: FeedUnit): number {
  const kg = unit === "bag" ? quantity * KG_PER_BAG : quantity;
  return Math.round(kg * 100) / 100;
}

export function formatKg(kg: number): string {
  const bags = kg / KG_PER_BAG;
  const kgText = `${kg.toLocaleString("en-NG", { maximumFractionDigits: 1 })} kg`;
  return bags >= 1
    ? `${kgText} (${bags.toLocaleString("en-NG", { maximumFractionDigits: 1 })} bags)`
    : kgText;
}
