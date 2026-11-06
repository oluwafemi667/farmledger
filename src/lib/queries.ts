import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getFlocks, type FlockSummary } from "@/lib/farm";
import { addDays, todayIn } from "@/lib/domain/dates";
import { buildDailyStatus, type FlockDay } from "@/lib/domain/daily-status";
import { formatKg } from "@/lib/domain/units";

export interface DailyStatus {
  today: string;
  flocks: FlockSummary[];
  /** Keyed by flock id. A plain object so it can be passed to client components. */
  days: Record<string, FlockDay>;
}

/**
 * Today's progress for every active flock, read through RLS. Nothing here is
 * invented: a flock with no records shows zero and "not recorded".
 */
export const getDailyStatus = cache(async (): Promise<DailyStatus> => {
  const today = todayIn();
  const flocks = await getFlocks();
  if (!isSupabaseConfigured() || flocks.length === 0) {
    return { today, flocks, days: {} };
  }

  const supabase = createClient();
  const [eggs, feed, deaths, schedule] = await Promise.all([
    supabase
      .from("egg_collections")
      .select("flock_id, collected_on, eggs")
      .gte("collected_on", addDays(today, -7))
      .limit(5000),
    supabase.from("feed_logs").select("flock_id, quantity_kg").eq("logged_on", today),
    supabase.from("mortality_logs").select("flock_id, birds").eq("logged_on", today),
    supabase
      .from("vaccine_schedule")
      .select("id, flock_id, vaccine_name, due_on")
      .lte("due_on", addDays(today, 7)),
  ]);

  const scheduleRows = (schedule.data ?? []) as {
    id: string;
    flock_id: string;
    vaccine_name: string;
    due_on: string;
  }[];
  const scheduleIds = scheduleRows.map((s) => s.id);
  const done = scheduleIds.length
    ? await supabase.from("vaccinations").select("schedule_id").in("schedule_id", scheduleIds)
    : { data: [] as { schedule_id: string | null }[] };

  const status = buildDailyStatus({
    today,
    flockIds: flocks.map((f) => f.id),
    eggRows: (eggs.data ?? []) as { flock_id: string; collected_on: string; eggs: number }[],
    feedRows: (feed.data ?? []) as { flock_id: string; quantity_kg: number | string }[],
    mortalityRows: (deaths.data ?? []) as { flock_id: string; birds: number }[],
    scheduleRows,
    doneScheduleIds: new Set(
      (done.data ?? []).map((d) => d.schedule_id).filter((id): id is string => !!id),
    ),
  });

  return { today, flocks, days: Object.fromEntries(status) };
});

/** Recently used feed types, most recent first, for a sensible default. */
export const getRecentFeedTypes = cache(async (): Promise<string[]> => {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient()
    .from("feed_logs")
    .select("feed_type")
    .order("created_at", { ascending: false })
    .limit(30);
  const seen = new Set<string>();
  for (const row of data ?? []) seen.add(row.feed_type as string);
  return [...seen].slice(0, 5);
});

export interface ActivityItem {
  id: string;
  kind: "eggs" | "deaths" | "feed" | "vaccine";
  flockName: string;
  date: string;
  createdAt: string;
  title: string;
  detail?: string;
}

/** The latest entries across all four logs, newest first. */
export const getRecentActivity = cache(
  async (limit = 25): Promise<ActivityItem[]> => {
    if (!isSupabaseConfigured()) return [];
    const supabase = createClient();
    const flocks = await getFlocks();
    const name = (id: string) => flocks.find((f) => f.id === id)?.name ?? "Flock";

    const [eggs, deaths, feed, vacc] = await Promise.all([
      supabase
        .from("egg_collections")
        .select("id, flock_id, collected_on, eggs, broken, created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("mortality_logs")
        .select("id, flock_id, logged_on, kind, birds, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("feed_logs")
        .select("id, flock_id, logged_on, feed_type, quantity_kg, created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("vaccinations")
        .select("id, flock_id, administered_on, vaccine_name, created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const items: ActivityItem[] = [
      ...(eggs.data ?? []).map((r) => ({
        id: r.id as string,
        kind: "eggs" as const,
        flockName: name(r.flock_id as string),
        date: r.collected_on as string,
        createdAt: r.created_at as string,
        title: `${(r.eggs as number).toLocaleString("en-NG")} eggs`,
        detail: (r.broken as number) > 0 ? `${r.broken} broken` : undefined,
      })),
      ...(deaths.data ?? []).map((r) => ({
        id: r.id as string,
        kind: "deaths" as const,
        flockName: name(r.flock_id as string),
        date: r.logged_on as string,
        createdAt: r.created_at as string,
        title: `${r.birds} ${r.kind === "cull" ? "culled" : "died"}`,
        detail: (r.reason as string | null) ?? undefined,
      })),
      ...(feed.data ?? []).map((r) => ({
        id: r.id as string,
        kind: "feed" as const,
        flockName: name(r.flock_id as string),
        date: r.logged_on as string,
        createdAt: r.created_at as string,
        title: formatKg(Number(r.quantity_kg)),
        detail: r.feed_type as string,
      })),
      ...(vacc.data ?? []).map((r) => ({
        id: r.id as string,
        kind: "vaccine" as const,
        flockName: name(r.flock_id as string),
        date: r.administered_on as string,
        createdAt: r.created_at as string,
        title: r.vaccine_name as string,
      })),
    ];

    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },
);
