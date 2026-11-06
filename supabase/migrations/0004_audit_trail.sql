-- Governance: an append-only record of who changed what.
--
-- Every insert, update and delete on the money tables, flocks, customers,
-- people and roles is recorded by a trigger, and every edit or delete of a
-- daily log (eggs, deaths, feed) too. The trigger runs as the table owner, so
-- the person making the change cannot skip it, and nobody using the app can
-- edit or remove an entry afterwards: the table grants them read access only,
-- and a second trigger refuses changes from any signed-in session.
--
-- Administrators using the SQL editor (no signed-in user) can still purge, for
-- example to reset the demo farm.

create table public.audit_log (
  id bigint generated always as identity primary key,
  -- Deliberately not a foreign key: history must outlive what it describes.
  farm_id uuid not null,
  at timestamptz not null default now(),
  actor uuid,
  actor_name text,
  table_name text not null,
  row_id text,
  action text not null check (action in ('insert', 'update', 'delete')),
  -- insert: the new row; delete: the old row; update: {column: {old, new}} for
  -- the columns that changed.
  changes jsonb not null default '{}'::jsonb
);
create index audit_log_farm_idx on public.audit_log (farm_id, id desc);
create index audit_log_row_idx on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;
create policy audit_log_owner_read on public.audit_log for select to authenticated
  using (farm_id = public.current_farm_id() and public.is_owner());

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create function public.audit_row() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_changes jsonb;
  v_name text;
begin
  -- The demo seed switches auditing off for its bulk load.
  if coalesce(current_setting('farmledger.skip_audit', true), '') = 'on' then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_new := to_jsonb(new); v_row := v_new; v_changes := v_new;
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old); v_row := v_old; v_changes := v_old;
  else
    v_old := to_jsonb(old); v_new := to_jsonb(new); v_row := v_new;
    select jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value))
      into v_changes
      from jsonb_each(v_new) n
      join jsonb_each(v_old) o using (key)
     where n.value is distinct from o.value
       and n.key not in ('version', 'updated_at');
    if v_changes is null then return null; end if; -- nothing real changed
  end if;

  select full_name into v_name from public.profiles where id = auth.uid();

  insert into public.audit_log (farm_id, actor, actor_name, table_name, row_id, action, changes)
  values (
    coalesce((v_row ->> 'farm_id')::uuid, (v_row ->> 'id')::uuid),
    auth.uid(), v_name, tg_table_name, v_row ->> 'id', lower(tg_op), v_changes
  );
  return null;
end
$$;
revoke execute on function public.audit_row() from public, anon, authenticated;

create function public.audit_block_edits() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if auth.uid() is not null then
    raise exception 'The audit trail cannot be changed.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end
$$;
create trigger audit_log_immutable before update or delete on public.audit_log
  for each row execute function public.audit_block_edits();

-- Full history (insert, update, delete).
do $$
declare t text;
begin
  foreach t in array array[
    'flocks', 'sales', 'expenses', 'customers', 'invoices', 'invoice_items',
    'payments', 'feed_purchases', 'egg_stock_adjustments', 'profiles'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row()', 'audit_' || t, t);
  end loop;
  -- Daily logs: entering one is routine and already stamped with who and when;
  -- changing or removing one afterwards is what needs a witness.
  foreach t in array array['egg_collections', 'mortality_logs', 'feed_logs', 'vaccinations'] loop
    execute format(
      'create trigger %I after update or delete on public.%I
         for each row execute function public.audit_row()', 'audit_' || t, t);
  end loop;
end
$$;

create view public.audit_feed with (security_invoker = true) as
  select id, farm_id, at, actor, coalesce(actor_name, 'System') as actor_name,
         table_name, row_id, action, changes
    from public.audit_log;
revoke all on public.audit_feed from anon;
