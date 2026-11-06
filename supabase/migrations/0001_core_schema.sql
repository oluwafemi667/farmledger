-- Farmledger core schema, stage 2.
--
-- Design rules:
--  * Every business row belongs to a farm (multi-tenant ready) and is guarded by RLS.
--  * Logs are append-only. Ids are generated on the client (offline-first), so an
--    insert with an existing id is a retry and is ignored: no duplicates.
--  * Active bird count is derived (see flock_status), never stored, so it cannot drift.
--  * Farmhands can read operational data and add logs. They can never read or write
--    finances. Enforced here, not only in the UI.
--  * Roles live in public.profiles, which only owners can change.

-- ---------------------------------------------------------------- enums
create type public.user_role as enum ('owner', 'farmhand');
create type public.mortality_kind as enum ('death', 'cull');
create type public.flock_status_t as enum ('active', 'retired');
create type public.sale_category as enum ('eggs', 'spent_hens', 'manure', 'other');
create type public.expense_category as enum (
  'feed', 'medication', 'labour', 'utilities', 'transport', 'equipment', 'other'
);

-- ---------------------------------------------------------------- tenancy
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  farm_id uuid not null references public.farms (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  role public.user_role not null default 'farmhand',
  created_at timestamptz not null default now()
);
create index profiles_farm_idx on public.profiles (farm_id);

-- Role helpers. SECURITY DEFINER so policies on profiles itself do not recurse.
create function public.current_farm_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select farm_id from public.profiles where id = auth.uid() $$;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  )
$$;

revoke execute on function public.current_farm_id() from public, anon;
revoke execute on function public.is_owner() from public, anon;
grant execute on function public.current_farm_id() to authenticated;
grant execute on function public.is_owner() to authenticated;

-- A profile is created for a new auth user ONLY when an admin set farm_id in
-- app_metadata (which end users cannot edit). Sign-ups without it get no access.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_farm uuid := nullif(new.raw_app_meta_data ->> 'farm_id', '')::uuid;
  v_role public.user_role :=
    coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'farmhand')::public.user_role;
begin
  if v_farm is not null then
    insert into public.profiles (id, farm_id, full_name, role)
    values (
      new.id,
      v_farm,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email, 'Unnamed'),
      v_role
    );
  end if;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- flocks
create table public.flocks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  bird_type text not null default 'layer',
  breed text,
  house text,
  initial_count integer not null check (initial_count > 0),
  placed_on date not null,
  -- Age of the birds on the day they were placed, for the expected lay curve.
  placed_age_days integer not null default 0 check (placed_age_days >= 0),
  status public.flock_status_t not null default 'active',
  notes text,
  -- Optimistic concurrency: clients update with `where version = <seen>`.
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (id, farm_id),
  unique (farm_id, name)
);
create index flocks_farm_idx on public.flocks (farm_id);

create function public.bump_flock_version() returns trigger
language plpgsql as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end
$$;

create trigger flocks_bump_version
  before update on public.flocks
  for each row execute function public.bump_flock_version();

-- ---------------------------------------------------------------- daily logs
-- Composite FK (flock_id, farm_id) guarantees a log can never point at a flock
-- from another farm.

create table public.egg_collections (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  flock_id uuid not null,
  collected_on date not null,
  collected_at timestamptz not null default now(),
  eggs integer not null check (eggs >= 0),
  broken integer not null default 0 check (broken >= 0),
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  check (broken <= eggs),
  foreign key (flock_id, farm_id) references public.flocks (id, farm_id) on delete cascade
);
create index egg_collections_flock_day_idx on public.egg_collections (flock_id, collected_on);
create index egg_collections_farm_day_idx on public.egg_collections (farm_id, collected_on);

create table public.mortality_logs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  flock_id uuid not null,
  logged_on date not null,
  kind public.mortality_kind not null default 'death',
  birds integer not null check (birds > 0),
  reason text,
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  foreign key (flock_id, farm_id) references public.flocks (id, farm_id) on delete cascade
);
create index mortality_logs_flock_day_idx on public.mortality_logs (flock_id, logged_on);
create index mortality_logs_farm_day_idx on public.mortality_logs (farm_id, logged_on);

create table public.feed_logs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  flock_id uuid not null,
  logged_on date not null,
  feed_type text not null check (length(trim(feed_type)) > 0),
  -- Stored in kg. The UI converts from bags (default 25 kg) on entry.
  quantity_kg numeric(10, 2) not null check (quantity_kg > 0),
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  foreign key (flock_id, farm_id) references public.flocks (id, farm_id) on delete cascade
);
create index feed_logs_flock_day_idx on public.feed_logs (flock_id, logged_on);
create index feed_logs_farm_day_idx on public.feed_logs (farm_id, logged_on);

-- Vaccination schedule is set by owners. A record is appended when a dose is
-- given; a schedule item is "due" while no record references it.
create table public.vaccine_schedule (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  flock_id uuid not null,
  vaccine_name text not null check (length(trim(vaccine_name)) > 0),
  due_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (id, farm_id),
  foreign key (flock_id, farm_id) references public.flocks (id, farm_id) on delete cascade
);
create index vaccine_schedule_farm_due_idx on public.vaccine_schedule (farm_id, due_on);

create table public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  flock_id uuid not null,
  schedule_id uuid,
  vaccine_name text not null check (length(trim(vaccine_name)) > 0),
  administered_on date not null,
  method text,
  batch_number text,
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  foreign key (flock_id, farm_id) references public.flocks (id, farm_id) on delete cascade,
  foreign key (schedule_id, farm_id) references public.vaccine_schedule (id, farm_id) on delete set null (schedule_id)
);
create index vaccinations_flock_day_idx on public.vaccinations (flock_id, administered_on);
create index vaccinations_schedule_idx on public.vaccinations (schedule_id);

-- ---------------------------------------------------------------- finances (owner only)
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  sold_on date not null,
  category public.sale_category not null,
  description text,
  quantity numeric(12, 2) check (quantity is null or quantity > 0),
  unit text,
  amount_ngn numeric(14, 2) not null check (amount_ngn >= 0),
  buyer text,
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index sales_farm_day_idx on public.sales (farm_id, sold_on);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  spent_on date not null,
  category public.expense_category not null,
  description text,
  amount_ngn numeric(14, 2) not null check (amount_ngn >= 0),
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index expenses_farm_day_idx on public.expenses (farm_id, spent_on);

-- ---------------------------------------------------------------- AI briefings
-- Written by a scheduled server job (service role, bypasses RLS). Owners read.
create table public.ai_briefings (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  briefing_date date not null,
  -- Deterministic findings the rules engine produced, with their figures.
  findings jsonb not null default '[]',
  -- Model-written wording of those findings, schema validated before storing.
  summary jsonb,
  model text,
  generated_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (farm_id, briefing_date)
);

-- ---------------------------------------------------------------- derived view
-- security_invoker makes the view obey the caller's RLS on the base tables.
create view public.flock_status with (security_invoker = true) as
select
  f.id,
  f.farm_id,
  f.name,
  f.breed,
  f.house,
  f.status,
  f.initial_count,
  f.placed_on,
  coalesce(m.lost, 0)::integer as total_lost,
  (f.initial_count - coalesce(m.lost, 0))::integer as active_birds,
  ((current_date - f.placed_on) + f.placed_age_days)::integer as age_days
from public.flocks f
left join (
  select flock_id, sum(birds) as lost from public.mortality_logs group by flock_id
) m on m.flock_id = f.id;

-- ---------------------------------------------------------------- row level security
alter table public.farms enable row level security;
alter table public.profiles enable row level security;
alter table public.flocks enable row level security;
alter table public.egg_collections enable row level security;
alter table public.mortality_logs enable row level security;
alter table public.feed_logs enable row level security;
alter table public.vaccine_schedule enable row level security;
alter table public.vaccinations enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.ai_briefings enable row level security;

-- Anonymous users get nothing. Authenticated users are limited by the policies below.
revoke all on all tables in schema public from anon;

-- farms
create policy farms_select on public.farms for select to authenticated
  using (id = public.current_farm_id());
create policy farms_update on public.farms for update to authenticated
  using (id = public.current_farm_id() and public.is_owner())
  with check (id = public.current_farm_id());

-- profiles: you see yourself; owners see and manage their farm's people.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (farm_id = public.current_farm_id() and public.is_owner())
  );
create policy profiles_update on public.profiles for update to authenticated
  using (farm_id = public.current_farm_id() and public.is_owner())
  with check (farm_id = public.current_farm_id());

-- flocks: everyone on the farm reads; only owners change.
create policy flocks_select on public.flocks for select to authenticated
  using (farm_id = public.current_farm_id());
create policy flocks_insert on public.flocks for insert to authenticated
  with check (farm_id = public.current_farm_id() and public.is_owner());
create policy flocks_update on public.flocks for update to authenticated
  using (farm_id = public.current_farm_id() and public.is_owner())
  with check (farm_id = public.current_farm_id());
create policy flocks_delete on public.flocks for delete to authenticated
  using (farm_id = public.current_farm_id() and public.is_owner());

-- Operational logs: everyone on the farm reads and appends (as themselves);
-- only owners correct or remove entries.
do $$
declare t text;
begin
  foreach t in array array[
    'egg_collections', 'mortality_logs', 'feed_logs', 'vaccinations'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (farm_id = public.current_farm_id())', t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (farm_id = public.current_farm_id() and created_by = auth.uid())',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (farm_id = public.current_farm_id() and public.is_owner())
         with check (farm_id = public.current_farm_id())', t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (farm_id = public.current_farm_id() and public.is_owner())', t || '_delete', t);
  end loop;
end
$$;

-- vaccine schedule: everyone reads (to see what is due); owners manage.
create policy vaccine_schedule_select on public.vaccine_schedule for select to authenticated
  using (farm_id = public.current_farm_id());
create policy vaccine_schedule_write on public.vaccine_schedule for all to authenticated
  using (farm_id = public.current_farm_id() and public.is_owner())
  with check (farm_id = public.current_farm_id() and public.is_owner());

-- finances and briefings: owners only, every operation.
do $$
declare t text;
begin
  foreach t in array array['sales', 'expenses'] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (farm_id = public.current_farm_id() and public.is_owner())
         with check (farm_id = public.current_farm_id() and public.is_owner())',
      t || '_owner_all', t);
  end loop;
end
$$;

create policy ai_briefings_select on public.ai_briefings for select to authenticated
  using (farm_id = public.current_farm_id() and public.is_owner());
