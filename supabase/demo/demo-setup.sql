-- Farmledger: public demo protections and nightly refresh.
-- Safe to run in the same Supabase project as the sample farm: every rule below applies only to the two
-- demo accounts and to the sample farm (id ...f001). Run it after 1-setup-database, 3-stock-and-sales,
-- 4 (audit trail), 5 (invoice functions) and the demo data.
--
-- Before running: in Authentication > Users add two users with "Auto confirm" ticked:
--   demo-owner@farmledger.demo      (link it to the demo farm as role owner)
--   demo-farmhand@farmledger.demo   (link it to the demo farm as role farmhand)
-- Run this file right after the demo data, because "today" is recorded now.

-- ------------------------------------------------------------ who the demo accounts are
create or replace function public.is_demo_owner() returns boolean
language sql stable set search_path = ''
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) = 'demo-owner@farmledger.demo' $$;

-- ------------------------------------------------------------ the owner demo is read-only
-- Restrictive policies are ANDed with every existing policy, so nothing else can reopen writes.
do $$
declare t text;
begin
  foreach t in array array[
    'flocks', 'sales', 'expenses', 'customers', 'invoices', 'invoice_items', 'payments',
    'feed_purchases', 'egg_stock_adjustments', 'profiles', 'vaccine_schedule',
    'egg_collections', 'mortality_logs', 'feed_logs', 'vaccinations', 'health_events'
  ] loop
    execute format('drop policy if exists demo_owner_no_insert on public.%I', t);
    execute format('drop policy if exists demo_owner_no_update on public.%I', t);
    execute format('drop policy if exists demo_owner_no_delete on public.%I', t);
    execute format('create policy demo_owner_no_insert on public.%I as restrictive for insert to authenticated with check (not public.is_demo_owner())', t);
    execute format('create policy demo_owner_no_update on public.%I as restrictive for update to authenticated using (not public.is_demo_owner()) with check (not public.is_demo_owner())', t);
    execute format('create policy demo_owner_no_delete on public.%I as restrictive for delete to authenticated using (not public.is_demo_owner())', t);
  end loop;
end $$;

-- ------------------------------------------------------------ nobody can lock the demo accounts
-- A visitor holds a real session, so without this they could change the shared password or
-- add a second sign-in step and lock everyone else out. To change a demo password yourself,
-- drop the trigger demo_users_locked, change it, then run this file again.
create or replace function public.demo_protect_users() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if lower(old.email) in ('demo-owner@farmledger.demo', 'demo-farmhand@farmledger.demo')
     and (new.encrypted_password is distinct from old.encrypted_password
          or new.email is distinct from old.email
          or new.phone is distinct from old.phone) then
    raise exception 'The demo accounts cannot be changed.' using errcode = '42501';
  end if;
  return new;
end
$$;
drop trigger if exists demo_users_locked on auth.users;
create trigger demo_users_locked before update on auth.users
  for each row execute function public.demo_protect_users();

-- A visitor must not be able to add a second sign-in step to a shared account either.
-- Wrapped so it is skipped, not fatal, where the auth schema does not allow a trigger here.
create or replace function public.demo_block_mfa() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from auth.users u where u.id = new.user_id
              and lower(u.email) in ('demo-owner@farmledger.demo', 'demo-farmhand@farmledger.demo')) then
    raise exception 'Two-step sign-in cannot be added to the demo accounts.' using errcode = '42501';
  end if;
  return new;
end
$$;
do $$
begin
  drop trigger if exists demo_mfa_blocked on auth.mfa_factors;
  create trigger demo_mfa_blocked before insert on auth.mfa_factors
    for each row execute function public.demo_block_mfa();
exception when others then
  raise notice 'Could not protect auth.mfa_factors (%). The demo screen hides two-step set-up anyway.', sqlerrm;
end $$;

-- ------------------------------------------------------------ nightly refresh
create table if not exists public.demo_state (
  id boolean primary key default true check (id),
  seeded_on date not null
);
insert into public.demo_state (id, seeded_on)
values (true, (now() at time zone 'Africa/Lagos')::date)
on conflict (id) do nothing;

-- Removes what visitors entered and moves the sample history forward so the newest day is always today.
create or replace function public.demo_reset() returns void
language plpgsql set search_path = ''
as $$
declare
  farm constant uuid := '00000000-0000-4000-8000-00000000f001';
  today date := (now() at time zone 'Africa/Lagos')::date;
  delta integer;
begin
  -- Housekeeping is not news: keep it out of the owner's audit trail.
  perform set_config('farmledger.skip_audit', 'on', true);

  delete from public.egg_collections where farm_id = farm and not is_demo;
  delete from public.mortality_logs where farm_id = farm and not is_demo;
  delete from public.feed_logs where farm_id = farm and not is_demo;
  delete from public.vaccinations where farm_id = farm and not is_demo;
  delete from public.health_events where farm_id = farm and not is_demo;

  select today - seeded_on into delta from public.demo_state;
  if delta is null or delta <= 0 then return; end if;

  update public.flocks set placed_on = placed_on + delta where farm_id = farm;
  update public.egg_collections set collected_on = collected_on + delta where farm_id = farm;
  update public.mortality_logs set logged_on = logged_on + delta where farm_id = farm;
  update public.feed_logs set logged_on = logged_on + delta where farm_id = farm;
  update public.vaccine_schedule set due_on = due_on + delta where farm_id = farm;
  update public.vaccinations set administered_on = administered_on + delta where farm_id = farm;
  update public.health_events set observed_on = observed_on + delta,
    egg_hold_until = egg_hold_until + delta, resolved_on = resolved_on + delta where farm_id = farm;
  update public.sales set sold_on = sold_on + delta where farm_id = farm;
  update public.expenses set spent_on = spent_on + delta where farm_id = farm;
  update public.feed_purchases set purchased_on = purchased_on + delta where farm_id = farm;
  update public.egg_stock_adjustments set adjusted_on = adjusted_on + delta where farm_id = farm;
  update public.invoices set issued_on = issued_on + delta, due_on = due_on + delta where farm_id = farm;
  update public.payments set paid_on = paid_on + delta where farm_id = farm;
  update public.demo_state set seeded_on = today;
end
$$;
revoke execute on function public.demo_reset() from public, anon, authenticated;

-- Runs at 00:05 Lagos time (23:05 UTC). Needs the pg_cron extension: Database > Extensions > pg_cron.
do $$
begin
  perform cron.unschedule('farmledger-demo-reset');
exception when others then null;
end $$;
do $$
begin
  perform cron.schedule('farmledger-demo-reset', '5 23 * * *', 'select public.demo_reset()');
exception when others then
  raise notice 'pg_cron is not enabled. Enable it under Database > Extensions, then run this file again.';
end $$;
