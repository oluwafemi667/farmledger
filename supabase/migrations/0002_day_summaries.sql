-- Stage 3: per-day summaries for the Today checklist, flock pages and history.
--
-- The database clock is UTC but the farm runs on local time, so "today" is never
-- taken from the database. The app passes the farm-local date (p_day). All of
-- these are SECURITY INVOKER, so Row Level Security still applies to the caller.

alter table public.farms
  add column timezone text not null default 'Africa/Lagos';

-- One row per active flock, for one day, with the previous day for comparison.
create function public.flock_day_summary(p_day date)
returns table (
  flock_id uuid,
  eggs integer,
  broken integer,
  egg_entries integer,
  eggs_prev integer,
  deaths integer,
  feed_kg numeric,
  feed_kg_prev numeric,
  vaccines_overdue integer,
  next_vaccine_name text,
  next_vaccine_due date
)
language sql stable
as $$
  select
    f.id,
    coalesce((select sum(e.eggs) from public.egg_collections e
               where e.flock_id = f.id and e.collected_on = p_day), 0)::integer,
    coalesce((select sum(e.broken) from public.egg_collections e
               where e.flock_id = f.id and e.collected_on = p_day), 0)::integer,
    (select count(*) from public.egg_collections e
      where e.flock_id = f.id and e.collected_on = p_day)::integer,
    coalesce((select sum(e.eggs) from public.egg_collections e
               where e.flock_id = f.id and e.collected_on = p_day - 1), 0)::integer,
    coalesce((select sum(m.birds) from public.mortality_logs m
               where m.flock_id = f.id and m.logged_on = p_day), 0)::integer,
    coalesce((select sum(l.quantity_kg) from public.feed_logs l
               where l.flock_id = f.id and l.logged_on = p_day), 0),
    coalesce((select sum(l.quantity_kg) from public.feed_logs l
               where l.flock_id = f.id and l.logged_on = p_day - 1), 0),
    (select count(*) from public.vaccine_schedule s
      where s.flock_id = f.id and s.due_on < p_day
        and not exists (select 1 from public.vaccinations v where v.schedule_id = s.id))::integer,
    (select s.vaccine_name from public.vaccine_schedule s
      where s.flock_id = f.id
        and not exists (select 1 from public.vaccinations v where v.schedule_id = s.id)
      order by s.due_on limit 1),
    (select s.due_on from public.vaccine_schedule s
      where s.flock_id = f.id
        and not exists (select 1 from public.vaccinations v where v.schedule_id = s.id)
      order by s.due_on limit 1)
  from public.flocks f
  where f.status = 'active'
  order by f.name
$$;

-- One row per day for one flock, newest first. Days with no records are zeros,
-- which is what a chart or table needs; callers must not read a zero as "recorded".
create function public.flock_daily(p_flock uuid, p_from date, p_to date)
returns table (
  day date,
  eggs integer,
  broken integer,
  deaths integer,
  feed_kg numeric
)
language sql stable
as $$
  select
    d::date,
    coalesce(e.eggs, 0)::integer,
    coalesce(e.broken, 0)::integer,
    coalesce(m.birds, 0)::integer,
    coalesce(fd.kg, 0)
  from generate_series(p_from, least(p_to, p_from + 370), interval '1 day') d
  left join (
    select collected_on, sum(eggs) as eggs, sum(broken) as broken
      from public.egg_collections where flock_id = p_flock group by collected_on
  ) e on e.collected_on = d::date
  left join (
    select logged_on, sum(birds) as birds
      from public.mortality_logs where flock_id = p_flock group by logged_on
  ) m on m.logged_on = d::date
  left join (
    select logged_on, sum(quantity_kg) as kg
      from public.feed_logs where flock_id = p_flock group by logged_on
  ) fd on fd.logged_on = d::date
  order by d desc
$$;

-- Every kind of log entry in one list, for the History screen.
create view public.activity_log with (security_invoker = true) as
  select id, 'eggs'::text as kind, farm_id, flock_id,
         collected_on as day, created_at,
         coalesce(created_by = auth.uid(), false) as by_me,
         eggs::numeric as quantity,
         case when broken > 0 then broken || ' broken' end as detail
    from public.egg_collections
  union all
  select id, 'mortality', farm_id, flock_id, logged_on, created_at,
         coalesce(created_by = auth.uid(), false),
         birds::numeric,
         concat_ws(': ', kind::text, nullif(reason, ''))
    from public.mortality_logs
  union all
  select id, 'feed', farm_id, flock_id, logged_on, created_at,
         coalesce(created_by = auth.uid(), false),
         quantity_kg,
         feed_type
    from public.feed_logs
  union all
  select id, 'vaccination', farm_id, flock_id, administered_on, created_at,
         coalesce(created_by = auth.uid(), false),
         1::numeric,
         vaccine_name
    from public.vaccinations;

revoke all on public.activity_log from anon;
revoke execute on function public.flock_day_summary(date) from public, anon;
revoke execute on function public.flock_daily(uuid, date, date) from public, anon;
grant execute on function public.flock_day_summary(date) to authenticated;
grant execute on function public.flock_daily(uuid, date, date) to authenticated;

-- Scheduled vaccinations that have no administered record yet.
create view public.vaccines_outstanding with (security_invoker = true) as
  select s.id, s.farm_id, s.flock_id, s.vaccine_name, s.due_on, s.notes
    from public.vaccine_schedule s
   where not exists (select 1 from public.vaccinations v where v.schedule_id = s.id);

revoke all on public.vaccines_outstanding from anon;
