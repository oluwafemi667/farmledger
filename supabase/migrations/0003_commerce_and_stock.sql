-- Stage 5/6: egg grading and crate stock, feed inventory, customers and invoices,
-- and the farm-wide figures behind the owner dashboard.
--
-- Everything money-related is owner-only, same as sales and expenses. Functions
-- are SECURITY INVOKER so Row Level Security applies to whoever calls them; the
-- app passes the farm-local date (never the database's UTC "today").
--
-- Revenue model, so nothing is counted twice:
--   * `sales`      quick cash sales (walk-in, no customer record).
--   * `invoices`   sales to customers, possibly paid later via `payments`.
--   Revenue = sales + issued invoices. Cash in = sales + payments.

-- ---------------------------------------------------------------- enums
create type public.egg_grade as enum ('small', 'medium', 'large', 'jumbo');
create type public.payment_method as enum ('cash', 'transfer', 'pos', 'cheque', 'other');
create type public.invoice_status as enum ('issued', 'void');

-- ---------------------------------------------------------------- egg grading
-- Optional per collection. Ungraded eggs are good eggs not yet sorted.
alter table public.egg_collections
  add column grade_small integer not null default 0 check (grade_small >= 0),
  add column grade_medium integer not null default 0 check (grade_medium >= 0),
  add column grade_large integer not null default 0 check (grade_large >= 0),
  add column grade_jumbo integer not null default 0 check (grade_jumbo >= 0),
  add constraint egg_grades_within_good_eggs
    check (grade_small + grade_medium + grade_large + grade_jumbo <= eggs - broken);

alter table public.sales add column grade public.egg_grade;

-- Corrections to crate stock that are not sales: opening stock (+), eggs used
-- on the farm or spoiled in storage (-).
create table public.egg_stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  adjusted_on date not null,
  grade public.egg_grade,
  eggs integer not null check (eggs <> 0),
  reason text not null check (length(trim(reason)) > 0),
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index egg_stock_adjustments_farm_idx on public.egg_stock_adjustments (farm_id, adjusted_on);

-- ---------------------------------------------------------------- feed purchases
create table public.feed_purchases (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  purchased_on date not null,
  feed_type text not null check (length(trim(feed_type)) > 0),
  supplier text,
  quantity_kg numeric(12, 2) not null check (quantity_kg > 0),
  cost_ngn numeric(14, 2) not null check (cost_ngn >= 0),
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false
);
create index feed_purchases_farm_idx on public.feed_purchases (farm_id, purchased_on);

-- ---------------------------------------------------------------- customers and invoices
alter table public.farms add column invoice_seq integer not null default 0;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  phone text,
  address text,
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (id, farm_id),
  unique (farm_id, name)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  customer_id uuid not null,
  number text,
  issued_on date not null,
  due_on date not null,
  status public.invoice_status not null default 'issued',
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  check (due_on >= issued_on),
  unique (id, farm_id),
  unique (farm_id, number),
  foreign key (customer_id, farm_id) references public.customers (id, farm_id)
);
create index invoices_farm_idx on public.invoices (farm_id, issued_on);
create index invoices_customer_idx on public.invoices (customer_id);

-- Gapless-enough, per-farm, human-readable numbers (INV-0001). SECURITY DEFINER
-- because it bumps a counter on `farms`, which only owners may update directly.
create function public.assign_invoice_number() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  if new.number is null then
    update public.farms set invoice_seq = invoice_seq + 1
     where id = new.farm_id returning invoice_seq into n;
    new.number := 'INV-' || lpad(n::text, 4, '0');
  end if;
  return new;
end
$$;
create trigger invoices_number before insert on public.invoices
  for each row execute function public.assign_invoice_number();
revoke execute on function public.assign_invoice_number() from public, anon, authenticated;

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  invoice_id uuid not null,
  category public.sale_category not null,
  description text not null check (length(trim(description)) > 0),
  grade public.egg_grade,
  quantity numeric(12, 2) not null check (quantity > 0),
  unit text not null check (length(trim(unit)) > 0),
  unit_price_ngn numeric(14, 2) not null check (unit_price_ngn >= 0),
  line_total_ngn numeric(14, 2) generated always as (round(quantity * unit_price_ngn, 2)) stored,
  -- A crate holds 30 eggs. Stock is kept in single eggs.
  eggs_equivalent numeric(14, 2) generated always as (
    case when category = 'eggs'
         then quantity * case when lower(unit) = 'crate' then 30 else 1 end
         else 0 end
  ) stored,
  foreign key (invoice_id, farm_id) references public.invoices (id, farm_id) on delete cascade
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  invoice_id uuid not null,
  paid_on date not null,
  amount_ngn numeric(14, 2) not null check (amount_ngn > 0),
  method public.payment_method not null default 'transfer',
  reference text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  foreign key (invoice_id, farm_id) references public.invoices (id, farm_id) on delete cascade
);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_farm_idx on public.payments (farm_id, paid_on);

-- ---------------------------------------------------------------- row level security
alter table public.egg_stock_adjustments enable row level security;
alter table public.feed_purchases enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'egg_stock_adjustments', 'feed_purchases', 'customers',
    'invoices', 'invoice_items', 'payments'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (farm_id = public.current_farm_id() and public.is_owner())
         with check (farm_id = public.current_farm_id() and public.is_owner())',
      t || '_owner_all', t);
  end loop;
end
$$;
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------- invoice balances
create view public.invoice_balances with (security_invoker = true) as
  select i.id, i.farm_id, i.number, i.customer_id, c.name as customer_name,
         i.issued_on, i.due_on, i.status,
         coalesce(t.total, 0)::numeric(14, 2) as total_ngn,
         coalesce(p.paid, 0)::numeric(14, 2) as paid_ngn,
         (case when i.status = 'void' then 0
               else coalesce(t.total, 0) - coalesce(p.paid, 0) end)::numeric(14, 2) as balance_ngn
    from public.invoices i
    join public.customers c on c.id = i.customer_id and c.farm_id = i.farm_id
    left join (select invoice_id, sum(line_total_ngn) as total
                 from public.invoice_items group by invoice_id) t on t.invoice_id = i.id
    left join (select invoice_id, sum(amount_ngn) as paid
                 from public.payments group by invoice_id) p on p.invoice_id = i.id;
revoke all on public.invoice_balances from anon;

-- ---------------------------------------------------------------- egg stock by grade
-- Eggs in hand per grade: good eggs collected, minus eggs sold (quick sales and
-- issued invoices), plus signed adjustments. Owner only.
create view public.egg_stock with (security_invoker = true) as
  with grades as (
    select unnest(array['small', 'medium', 'large', 'jumbo', 'ungraded']) as grade
  ),
  produced as (
    select farm_id, 'small' as grade, sum(grade_small) as eggs from public.egg_collections group by farm_id
    union all select farm_id, 'medium', sum(grade_medium) from public.egg_collections group by farm_id
    union all select farm_id, 'large', sum(grade_large) from public.egg_collections group by farm_id
    union all select farm_id, 'jumbo', sum(grade_jumbo) from public.egg_collections group by farm_id
    union all select farm_id, 'ungraded',
      sum(eggs - broken - grade_small - grade_medium - grade_large - grade_jumbo)
      from public.egg_collections group by farm_id
  ),
  sold as (
    select it.farm_id, coalesce(it.grade::text, 'ungraded') as grade, sum(it.eggs_equivalent) as eggs
      from public.invoice_items it
      join public.invoices i on i.id = it.invoice_id and i.farm_id = it.farm_id
     where i.status = 'issued' and it.category = 'eggs'
     group by 1, 2
    union all
    select farm_id, coalesce(grade::text, 'ungraded'),
           sum(quantity * case when lower(coalesce(unit, '')) = 'crate' then 30 else 1 end)
      from public.sales
     where category = 'eggs' and quantity is not null
     group by 1, 2
  ),
  adjusted as (
    select farm_id, coalesce(grade::text, 'ungraded') as grade, sum(eggs) as eggs
      from public.egg_stock_adjustments group by 1, 2
  )
  select f.id as farm_id, g.grade,
         coalesce(p.eggs, 0)::integer as collected,
         coalesce(s.eggs, 0)::integer as sold,
         coalesce(a.eggs, 0)::integer as adjusted,
         (coalesce(p.eggs, 0) - coalesce(s.eggs, 0) + coalesce(a.eggs, 0))::integer as on_hand
    from public.farms f
    cross join grades g
    left join (select farm_id, grade, sum(eggs) as eggs from produced group by 1, 2) p
           on p.farm_id = f.id and p.grade = g.grade
    left join (select farm_id, grade, sum(eggs) as eggs from sold group by 1, 2) s
           on s.farm_id = f.id and s.grade = g.grade
    left join adjusted a on a.farm_id = f.id and a.grade = g.grade
   where f.id = public.current_farm_id() and public.is_owner();
revoke all on public.egg_stock from anon;

-- ---------------------------------------------------------------- feed position
-- Per feed type: bought, used, on hand, average daily use over the 7 full days
-- before p_today, and the days that stock will last at that rate.
create function public.feed_position(p_today date)
returns table (
  feed_type text, purchased_kg numeric, used_kg numeric, on_hand_kg numeric,
  daily_use_kg numeric, days_left numeric
)
language sql stable security invoker set search_path = ''
as $$
  with bought as (
    select lower(trim(feed_type)) k, min(feed_type) label, sum(quantity_kg) kg
      from public.feed_purchases where public.is_owner() group by 1),
  used as (
    select lower(trim(feed_type)) k, min(feed_type) label, sum(quantity_kg) kg,
           sum(quantity_kg) filter (where logged_on >= p_today - 7 and logged_on < p_today) / 7.0 daily
      from public.feed_logs where public.is_owner() group by 1)
  select coalesce(b.label, u.label),
         coalesce(b.kg, 0), coalesce(u.kg, 0),
         coalesce(b.kg, 0) - coalesce(u.kg, 0),
         round(coalesce(u.daily, 0), 2),
         case when coalesce(u.daily, 0) > 0
              then round((coalesce(b.kg, 0) - coalesce(u.kg, 0)) / u.daily, 1) end
    from bought b full join used u on u.k = b.k
   order by 1
$$;

-- ---------------------------------------------------------------- dashboard series
-- One row per day for the whole farm. Birds = placed minus deaths so far, for
-- active flocks only.
create function public.farm_daily(p_from date, p_to date)
returns table (
  day date, birds integer, eggs integer, broken integer, deaths integer, feed_kg numeric
)
language sql stable security invoker set search_path = ''
as $$
  with days as (select generate_series(p_from, p_to, interval '1 day')::date as d),
  fl as (select id, initial_count, placed_on from public.flocks where status = 'active')
  select d.d,
    (coalesce((select sum(fl.initial_count) from fl where fl.placed_on <= d.d), 0)
     - coalesce((select sum(m.birds) from public.mortality_logs m
                   join fl on fl.id = m.flock_id
                  where m.logged_on <= d.d and fl.placed_on <= d.d), 0))::integer,
    coalesce((select sum(e.eggs) from public.egg_collections e
                join fl on fl.id = e.flock_id where e.collected_on = d.d), 0)::integer,
    coalesce((select sum(e.broken) from public.egg_collections e
                join fl on fl.id = e.flock_id where e.collected_on = d.d), 0)::integer,
    coalesce((select sum(m.birds) from public.mortality_logs m
                join fl on fl.id = m.flock_id where m.logged_on = d.d), 0)::integer,
    coalesce((select sum(f2.quantity_kg) from public.feed_logs f2
                join fl on fl.id = f2.flock_id where f2.logged_on = d.d), 0)
  from days d order by d.d
$$;

-- Per active flock over a window, for the performance ranking.
create function public.flock_scorecard(p_from date, p_to date)
returns table (
  flock_id uuid, name text, breed text, house text, birds integer,
  eggs integer, broken integer, egg_days integer, deaths integer, feed_kg numeric
)
language sql stable security invoker set search_path = ''
as $$
  select s.id, s.name, s.breed, s.house, s.active_birds,
    coalesce((select sum(e.eggs) from public.egg_collections e
               where e.flock_id = s.id and e.collected_on between p_from and p_to), 0)::integer,
    coalesce((select sum(e.broken) from public.egg_collections e
               where e.flock_id = s.id and e.collected_on between p_from and p_to), 0)::integer,
    (select count(distinct e.collected_on) from public.egg_collections e
      where e.flock_id = s.id and e.collected_on between p_from and p_to)::integer,
    coalesce((select sum(m.birds) from public.mortality_logs m
               where m.flock_id = s.id and m.logged_on between p_from and p_to), 0)::integer,
    coalesce((select sum(f.quantity_kg) from public.feed_logs f
               where f.flock_id = s.id and f.logged_on between p_from and p_to), 0)
  from public.flock_status s
  where s.status = 'active'
  order by s.name
$$;

-- Money per day (owner only: sales/expenses/invoices/payments are owner-only
-- tables, so a farmhand gets zeros).
create function public.money_daily(p_from date, p_to date)
returns table (
  day date, sales_ngn numeric, invoiced_ngn numeric, collected_ngn numeric, expenses_ngn numeric
)
language sql stable security invoker set search_path = ''
as $$
  with days as (select generate_series(p_from, p_to, interval '1 day')::date as d)
  select d.d,
    coalesce((select sum(s.amount_ngn) from public.sales s where s.sold_on = d.d), 0),
    coalesce((select sum(it.line_total_ngn) from public.invoice_items it
                join public.invoices i on i.id = it.invoice_id and i.farm_id = it.farm_id
               where i.status = 'issued' and i.issued_on = d.d), 0),
    coalesce((select sum(p.amount_ngn) from public.payments p where p.paid_on = d.d), 0),
    coalesce((select sum(x.amount_ngn) from public.expenses x where x.spent_on = d.d), 0)
  from days d order by d.d
$$;

-- Who recorded what. Owner only (reads names from profiles).
create function public.staff_activity(p_from date, p_to date)
returns table (
  person_id uuid, full_name text, role public.user_role,
  eggs_entries integer, mortality_entries integer, feed_entries integer,
  vaccination_entries integer, total_entries integer, last_entry_at timestamptz
)
language sql stable security invoker set search_path = ''
as $$
  with entries as (
    select created_by, 'eggs' k, created_at from public.egg_collections
      where collected_on between p_from and p_to
    union all select created_by, 'mortality', created_at from public.mortality_logs
      where logged_on between p_from and p_to
    union all select created_by, 'feed', created_at from public.feed_logs
      where logged_on between p_from and p_to
    union all select created_by, 'vaccination', created_at from public.vaccinations
      where administered_on between p_from and p_to
  )
  select p.id, p.full_name, p.role,
    count(*) filter (where e.k = 'eggs')::integer,
    count(*) filter (where e.k = 'mortality')::integer,
    count(*) filter (where e.k = 'feed')::integer,
    count(*) filter (where e.k = 'vaccination')::integer,
    count(e.k)::integer,
    max(e.created_at)
  from public.profiles p
  left join entries e on e.created_by = p.id
  where public.is_owner() and p.farm_id = public.current_farm_id()
  group by p.id, p.full_name, p.role
  order by count(e.k) desc, p.full_name
$$;

revoke execute on function public.feed_position(date) from public, anon;
revoke execute on function public.farm_daily(date, date) from public, anon;
revoke execute on function public.flock_scorecard(date, date) from public, anon;
revoke execute on function public.money_daily(date, date) from public, anon;
revoke execute on function public.staff_activity(date, date) from public, anon;
grant execute on function public.feed_position(date) to authenticated;
grant execute on function public.farm_daily(date, date) to authenticated;
grant execute on function public.flock_scorecard(date, date) to authenticated;
grant execute on function public.money_daily(date, date) to authenticated;
grant execute on function public.staff_activity(date, date) to authenticated;
