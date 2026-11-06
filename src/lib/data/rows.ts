import type {
  EggCollectionInput,
  FeedInput,
  FlockInput,
  HealthInput,
  MortalityInput,
  VaccinationInput,
} from "@/lib/domain/schemas";
import { toKg } from "@/lib/domain/units";

/**
 * Identity of a new record. The id is generated on the device BEFORE the first
 * save attempt, so every retry (a double tap, a dropped connection, a later
 * background sync) carries the same id and can never create a duplicate.
 */
export interface RecordMeta {
  id: string;
  farmId: string;
}

/** A fresh client-side record id. */
export function newRecordId(): string {
  return crypto.randomUUID();
}

// Row shapes match the database columns exactly. They are plain objects so the
// same row can be written to the local outbox now and uploaded later.

export const toEggRow = (m: RecordMeta, v: EggCollectionInput) => ({
  id: m.id,
  farm_id: m.farmId,
  flock_id: v.flockId,
  collected_on: v.collectedOn,
  eggs: v.eggs,
  broken: v.broken,
  notes: v.notes ?? null,
});

export const toMortalityRow = (m: RecordMeta, v: MortalityInput) => ({
  id: m.id,
  farm_id: m.farmId,
  flock_id: v.flockId,
  logged_on: v.loggedOn,
  kind: v.kind,
  birds: v.birds,
  reason: v.reason ?? null,
  notes: v.notes ?? null,
});

export const toFeedRow = (m: RecordMeta, v: FeedInput) => ({
  id: m.id,
  farm_id: m.farmId,
  flock_id: v.flockId,
  logged_on: v.loggedOn,
  feed_type: v.feedType,
  quantity_kg: toKg(v.quantity, v.unit),
  notes: v.notes ?? null,
});

export const toVaccinationRow = (m: RecordMeta, v: VaccinationInput) => ({
  id: m.id,
  farm_id: m.farmId,
  flock_id: v.flockId,
  schedule_id: v.scheduleId ?? null,
  vaccine_name: v.vaccineName,
  administered_on: v.administeredOn,
  method: v.method ?? null,
  batch_number: v.batchNumber ?? null,
  notes: v.notes ?? null,
});

export const toFlockRow = (m: RecordMeta, v: FlockInput) => ({
  id: m.id,
  farm_id: m.farmId,
  name: v.name,
  breed: v.breed ?? null,
  house: v.house ?? null,
  initial_count: v.initialCount,
  placed_on: v.placedOn,
  placed_age_days: v.placedAgeDays,
});

export const toHealthRow = (m: RecordMeta, v: HealthInput) => ({
  id: m.id,
  farm_id: m.farmId,
  flock_id: v.flockId,
  observed_on: v.observedOn,
  signs: v.signs,
  birds_affected: v.birdsAffected ?? null,
  notes: v.notes ?? null,
});
