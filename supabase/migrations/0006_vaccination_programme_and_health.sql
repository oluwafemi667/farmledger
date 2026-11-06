-- Vaccination programme and health log.
--
-- 1. A reference programme (standard layer schedule) that is applied to a new flock automatically,
--    so due dates exist from day one instead of being typed in by hand.
-- 2. A health log: what was seen, what the vet said, what was given, and how long eggs must be held back.
--
-- The programme is a starting point, not veterinary advice. The sources it follows say a single
-- programme cannot suit every region, so the owner can edit every date and add or remove items.

-- ---------------------------------------------------------------- reference programme
create table public.vaccine_programme_items (
  id integer generated always as identity primary key,
  programme text not null,
  position integer not null,
  vaccine_name text not null,
  protects_against text not null,
  age_days integer not null check (age_days >= 0),
  age_label text not null,
  route text not null,
  -- Only if the vet advises: not scheduled automatically.
  optional boolean not null default false,
  -- Given before the chicks arrive: shown for reference, not scheduled.
  at_hatchery boolean not null default false,
  source text not null,
  unique (programme, position)
);

alter table public.vaccine_programme_items enable row level security;
create policy vaccine_programme_read on public.vaccine_programme_items for select to authenticated using (true);
revoke all on public.vaccine_programme_items from anon, authenticated;
grant select on public.vaccine_programme_items to authenticated;

insert into public.vaccine_programme_items
  (programme, position, vaccine_name, protects_against, age_days, age_label, route, optional, at_hatchery, source) values
  ('layer-standard', 1, 'Marek''s disease', 'Marek''s disease', 0, 'day 1, at the hatchery', 'injection under the skin', false, true, 'Merck Veterinary Manual; Hy-Line'),
  ('layer-standard', 2, 'Newcastle disease and infectious bronchitis (B1/Massachusetts)', 'Newcastle disease, infectious bronchitis', 14, '14 to 21 days', 'drinking water', false, false, 'Merck Veterinary Manual'),
  ('layer-standard', 3, 'Gumboro (infectious bursal disease)', 'Infectious bursal disease', 18, '14 to 21 days', 'drinking water', false, false, 'Merck Veterinary Manual; Hy-Line'),
  ('layer-standard', 4, 'Newcastle disease and infectious bronchitis (booster)', 'Newcastle disease, infectious bronchitis', 35, '5 weeks', 'drinking water or coarse spray', false, false, 'Merck Veterinary Manual'),
  ('layer-standard', 5, 'Newcastle disease and infectious bronchitis (B1 or LaSota)', 'Newcastle disease, infectious bronchitis', 63, '8 to 10 weeks', 'drinking water or coarse spray', false, false, 'Merck Veterinary Manual'),
  ('layer-standard', 6, 'Avian encephalomyelitis', 'Avian encephalomyelitis', 77, '10 to 12 weeks', 'wing web', false, false, 'Merck Veterinary Manual'),
  ('layer-standard', 7, 'Fowl pox', 'Fowl pox', 77, '10 to 12 weeks', 'wing web', false, false, 'Merck Veterinary Manual; Hy-Line'),
  ('layer-standard', 8, 'Infectious laryngotracheitis', 'Infectious laryngotracheitis', 77, '10 to 12 weeks', 'eye drop', true, false, 'Merck Veterinary Manual (only where local risk requires it)'),
  ('layer-standard', 9, 'Mycoplasma gallisepticum', 'Chronic respiratory disease', 84, '10 to 14 weeks', 'eye drop or spray', true, false, 'Merck Veterinary Manual (restricted in some places)'),
  ('layer-standard', 10, 'Newcastle disease and infectious bronchitis (pre-lay)', 'Newcastle disease, infectious bronchitis', 91, '12 to 14 weeks', 'drinking water or spray', false, false, 'Merck Veterinary Manual'),
  ('layer-standard', 11, 'Newcastle disease and infectious bronchitis (before lay)', 'Newcastle disease, infectious bronchitis', 119, '16 to 18 weeks', 'drinking water or spray', false, false, 'Merck Veterinary Manual'),
  ('layer-standard', 12, 'Newcastle disease and infectious bronchitis (inactivated)', 'Newcastle disease, infectious bronchitis', 126, '18 weeks', 'injection', false, false, 'Merck Veterinary Manual');

-- Puts the standard programme on a flock's schedule. Items the flock is already too old for are skipped
-- (a pullet bought at 16 weeks was vaccinated by its supplier), and running it twice adds nothing.
create function public.apply_vaccine_programme(p_flock uuid, p_programme text default 'layer-standard')
returns integer
language plpgsql set search_path = ''
as $$
declare
  f record;
  n integer;
begin
  select id, farm_id, placed_on, placed_age_days into f from public.flocks where id = p_flock;
  if not found then
    raise exception 'That flock was not found.' using errcode = '22023';
  end if;

  insert into public.vaccine_schedule (farm_id, flock_id, vaccine_name, due_on, notes)
  select f.farm_id, f.id, i.vaccine_name, f.placed_on + (i.age_days - f.placed_age_days),
         'Standard layer programme, age ' || i.age_label || ', by ' || i.route || '. Confirm with your vet.'
    from public.vaccine_programme_items i
   where i.programme = p_programme
     and not i.optional and not i.at_hatchery
     and i.age_days >= f.placed_age_days
     and not exists (
       select 1 from public.vaccine_schedule s
        where s.flock_id = f.id and s.vaccine_name = i.vaccine_name
     );
  get diagnostics n = row_count;
  return n;
end
$$;
revoke execute on function public.apply_vaccine_programme(uuid, text) from public, anon;
grant execute on function public.apply_vaccine_programme(uuid, text) to authenticated;

-- A new real flock gets the programme automatically. The demo seed sets its own schedule.
create function public.flocks_apply_programme() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not new.is_demo and new.bird_type = 'layer' then
    perform public.apply_vaccine_programme(new.id);
  end if;
  return null;
end
$$;
create trigger flocks_apply_programme after insert on public.flocks
  for each row execute function public.flocks_apply_programme();

-- ---------------------------------------------------------------- health log
create table public.health_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  flock_id uuid not null,
  observed_on date not null,
  signs text[] not null,
  birds_affected integer check (birds_affected is null or birds_affected >= 0),
  notes text,
  -- Owner fields: what the vet found, what was given, and when eggs may be sold again.
  vet_findings text,
  treatment text,
  egg_hold_until date,
  resolved_on date,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  check (cardinality(signs) between 1 and 12),
  check (signs <@ array[
    'coughing_sneezing', 'diarrhoea', 'swollen_face_eyes', 'drop_in_feed', 'drop_in_water',
    'lethargy_huddling', 'twisted_neck_paralysis', 'sudden_deaths', 'soft_shelled_eggs',
    'drop_in_laying', 'ruffled_feathers', 'pale_comb'
  ]::text[]),
  check (egg_hold_until is null or egg_hold_until >= observed_on),
  check (resolved_on is null or resolved_on >= observed_on),
  foreign key (flock_id, farm_id) references public.flocks (id, farm_id) on delete cascade
);
create index health_events_flock_idx on public.health_events (flock_id, observed_on desc);
create index health_events_farm_idx on public.health_events (farm_id, observed_on desc);

alter table public.health_events enable row level security;
revoke all on public.health_events from anon;

create policy health_events_select on public.health_events for select to authenticated
  using (farm_id = public.current_farm_id());
-- Anyone on the team can report what they see. Only the owner records the vet's findings,
-- the treatment and the egg hold, so a signs report cannot also close itself.
create policy health_events_insert on public.health_events for insert to authenticated
  with check (
    farm_id = public.current_farm_id() and created_by = auth.uid()
    and (public.is_owner()
         or (vet_findings is null and treatment is null and egg_hold_until is null and resolved_on is null))
  );
create policy health_events_update on public.health_events for update to authenticated
  using (farm_id = public.current_farm_id() and public.is_owner())
  with check (farm_id = public.current_farm_id());
create policy health_events_delete on public.health_events for delete to authenticated
  using (farm_id = public.current_farm_id() and public.is_owner());

create trigger audit_health_events after insert or update or delete on public.health_events
  for each row execute function public.audit_row();
