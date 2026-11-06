-- Demonstration data for Farmledger. Run as the database owner (bypasses RLS).
--
-- Everything here lives in ONE separate demo farm flagged is_demo = true, so it can
-- never appear in a real farm's records, totals or briefings. Re-running replaces it.
-- All figures are invented: 3 layer flocks, crates of 30 eggs, 25 kg feed bags, naira.
-- Dates are relative to today so the last 30 days always look current.
--
-- Deliberate patterns, so the dashboard and briefing have something real to find:
--   Flock A  steady, on its expected curve
--   Flock B  laying drops and feed use rises over the last 3 days; deaths spike in the last 7;
--            a vaccination is overdue
--   Flock C  young and strong; a booster is due in 5 days

delete from public.farms
 where id = '00000000-0000-4000-8000-00000000f001' and is_demo;

insert into public.farms (id, name, is_demo)
values ('00000000-0000-4000-8000-00000000f001', 'Demo Farm (sample data)', true);

insert into public.flocks
  (id, farm_id, name, bird_type, breed, house, initial_count, placed_on, placed_age_days, is_demo)
values
  ('00000000-0000-4000-8000-0000000a0001', '00000000-0000-4000-8000-00000000f001',
   'Demo flock A', 'layer', 'Isa Brown', 'House 1', 1200, date '2026-02-10', 126, true),
  ('00000000-0000-4000-8000-0000000a0002', '00000000-0000-4000-8000-00000000f001',
   'Demo flock B', 'layer', 'Isa Brown', 'House 2', 1000, date '2026-04-20', 112, true),
  ('00000000-0000-4000-8000-0000000a0003', '00000000-0000-4000-8000-00000000f001',
   'Demo flock C', 'layer', 'Lohmann Brown', 'House 3', 560, date '2026-08-25', 126, true);

-- ---------------------------------------------------------------- mortality
with days as (
  select d::date as d, (current_date - d::date) as ago
  from generate_series(current_date - 29, current_date, interval '1 day') d
),
fl as (
  select id, farm_id, row_number() over (order by name) as idx
  from public.flocks where farm_id = '00000000-0000-4000-8000-00000000f001'
),
calc as (
  select fl.id as flock_id, fl.farm_id, days.d,
    case fl.idx
      when 1 then case when extract(day from days.d)::int % 4 = 0 then 1 else 0 end
      when 2 then case
        when days.ago <= 6 then 2 + (extract(day from days.d)::int % 3)
        when extract(day from days.d)::int % 5 = 0 then 1
        else 0 end
      else case when extract(day from days.d)::int % 9 = 0 then 1 else 0 end
    end as birds
  from days cross join fl
)
insert into public.mortality_logs (farm_id, flock_id, logged_on, kind, birds, is_demo)
select farm_id, flock_id, d, 'death', birds, true from calc where birds > 0;

-- ---------------------------------------------------------------- eggs (morning + afternoon)
with days as (
  select d::date as d, (current_date - d::date) as ago
  from generate_series(current_date - 29, current_date, interval '1 day') d
),
fl as (
  select id, farm_id, initial_count, row_number() over (order by name) as idx
  from public.flocks where farm_id = '00000000-0000-4000-8000-00000000f001'
),
daily as (
  select fl.id as flock_id, fl.farm_id, days.d,
    round(
      fl.initial_count * (
        case fl.idx when 1 then 0.86 when 2 then (case when days.ago <= 2 then 0.74 else 0.82 end) else 0.91 end
        + 0.015 * sin(extract(doy from days.d) * 1.7 + fl.idx)
      )
    )::int as total
  from days cross join fl
)
insert into public.egg_collections
  (farm_id, flock_id, collected_on, collected_at, eggs, broken, is_demo)
select
  farm_id, flock_id, d,
  d::timestamptz + case s.slot when 1 then interval '7 hours' else interval '16 hours' end,
  case s.slot when 1 then round(total * 0.6)::int else total - round(total * 0.6)::int end,
  case s.slot when 1 then round(total * 0.012)::int else 0 end,
  true
from daily cross join (values (1), (2)) as s(slot);

-- ---------------------------------------------------------------- feed (kg)
with days as (
  select d::date as d, (current_date - d::date) as ago
  from generate_series(current_date - 29, current_date, interval '1 day') d
),
fl as (
  select id, farm_id, initial_count, row_number() over (order by name) as idx
  from public.flocks where farm_id = '00000000-0000-4000-8000-00000000f001'
)
insert into public.feed_logs (farm_id, flock_id, logged_on, feed_type, quantity_kg, is_demo)
select
  fl.farm_id, fl.id, days.d, 'Layer mash',
  round(
    (fl.initial_count * 0.115
      * (1 + 0.02 * sin(extract(doy from days.d) * 2.3 + fl.idx))
      * case when fl.idx = 2 and days.ago <= 2 then 1.14 else 1 end
    )::numeric, 1),
  true
from days cross join fl;

-- ---------------------------------------------------------------- vaccinations
insert into public.vaccine_schedule (id, farm_id, flock_id, vaccine_name, due_on, is_demo) values
  ('00000000-0000-4000-8000-0000000b0001', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000a0001', 'Fowl pox', current_date - 14, true),
  ('00000000-0000-4000-8000-0000000b0002', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000a0002', 'Infectious bronchitis', current_date - 2, true),
  ('00000000-0000-4000-8000-0000000b0003', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000a0003', 'Newcastle disease booster', current_date + 5, true);

insert into public.vaccine_schedule (id, farm_id, flock_id, vaccine_name, due_on, notes, is_demo) values
  ('00000000-0000-4000-8000-0000000b0004', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000a0001', 'Newcastle disease booster', current_date + 21,
   'Standard layer programme. Confirm with your vet.', true),
  ('00000000-0000-4000-8000-0000000b0005', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000a0002', 'Newcastle disease booster', current_date + 12,
   'Standard layer programme. Confirm with your vet.', true);

-- ---------------------------------------------------------------- health reports
-- Flock B: an open farmhand report nobody has reviewed yet.
-- Flock A: an older report the vet has reviewed, with an egg hold still running.
insert into public.health_events
  (id, farm_id, flock_id, observed_on, signs, birds_affected, notes,
   vet_findings, treatment, egg_hold_until, resolved_on, is_demo) values
  ('00000000-0000-4000-8000-0000000c0001', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000a0002', current_date - 1,
   array['coughing_sneezing','drop_in_feed','drop_in_laying'], 18,
   'Coughing started in the back rows of House 2 this morning.',
   null, null, null, null, true),
  ('00000000-0000-4000-8000-0000000c0002', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000a0001', current_date - 6,
   array['diarrhoea','lethargy_huddling'], 9,
   'A few birds dull and huddled near the feeders.',
   'Vet visited. Mild gut infection, birds treated through the water.',
   'Course prescribed by the vet', current_date + 3, null, true);

insert into public.vaccinations
  (farm_id, flock_id, schedule_id, vaccine_name, administered_on, method, is_demo) values
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000a0001',
   '00000000-0000-4000-8000-0000000b0001', 'Fowl pox', current_date - 14, 'Wing web', true),
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000a0003',
   null, 'Newcastle disease', current_date - 28, 'Drinking water', true);

-- ---------------------------------------------------------------- sales
with farm_days as (
  select d::date as d, (current_date - d::date) as ago
  from generate_series(current_date - 29, current_date, interval '1 day') d
),
crates as (
  select fd.d, fd.ago,
    round(
      (select coalesce(sum(e.eggs - e.broken), 0)
         from public.egg_collections e
        where e.farm_id = '00000000-0000-4000-8000-00000000f001'
          and e.collected_on between fd.d - 1 and fd.d) / 30.0
    ) as qty
  from farm_days fd
  where fd.ago % 2 = 0
)
insert into public.sales
  (farm_id, sold_on, category, description, quantity, unit, amount_ngn, buyer, is_demo)
select
  '00000000-0000-4000-8000-00000000f001', d, 'eggs', 'Demo egg sale', qty, 'crate',
  qty * (5000 + 200 * (extract(day from d)::int % 4)),
  'Demo buyer ' || (1 + extract(day from d)::int % 3),
  true
from crates where qty > 0;

insert into public.sales
  (farm_id, sold_on, category, description, quantity, unit, amount_ngn, buyer, is_demo)
values
  ('00000000-0000-4000-8000-00000000f001', current_date - 12, 'spent_hens',
   'Demo spent hens', 40, 'bird', 40 * 6500, 'Demo buyer 2', true);

-- ---------------------------------------------------------------- expenses
insert into public.expenses (farm_id, spent_on, category, description, amount_ngn, is_demo)
select '00000000-0000-4000-8000-00000000f001', current_date - ago, 'feed',
       'Demo layer mash, 80 bags of 25 kg', 80 * 14500, true
from unnest(array[3, 10, 17, 24]) as ago;

insert into public.expenses (farm_id, spent_on, category, description, amount_ngn, is_demo) values
  ('00000000-0000-4000-8000-00000000f001', current_date - 28, 'labour',    'Demo monthly wages',        450000, true),
  ('00000000-0000-4000-8000-00000000f001', current_date - 15, 'utilities', 'Demo generator fuel',       120000, true),
  ('00000000-0000-4000-8000-00000000f001', current_date - 9,  'medication','Demo vitamins and vaccines', 85000, true),
  ('00000000-0000-4000-8000-00000000f001', current_date - 6,  'transport', 'Demo egg delivery',         36000, true),
  ('00000000-0000-4000-8000-00000000f001', current_date - 20, 'transport', 'Demo egg delivery',         34000, true);

-- ================================================================ stage 5/6 demo data
-- Egg grading: older collections are graded; the last two days are still ungraded.
update public.egg_collections
   set grade_small  = floor((eggs - broken) * 0.12),
       grade_medium = floor((eggs - broken) * 0.30),
       grade_large  = floor((eggs - broken) * 0.38),
       grade_jumbo  = floor((eggs - broken) * 0.08)
 where is_demo and collected_on < current_date - 1;

-- Feed purchases (a stock that runs a little over two weeks at current use).
insert into public.feed_purchases
  (farm_id, purchased_on, feed_type, supplier, quantity_kg, cost_ngn, is_demo) values
  ('00000000-0000-4000-8000-00000000f001', current_date - 29, 'Layer mash', 'Demo Feed Mill', 4000, 2080000, true),
  ('00000000-0000-4000-8000-00000000f001', current_date - 20, 'Layer mash', 'Demo Feed Mill', 4000, 2120000, true),
  ('00000000-0000-4000-8000-00000000f001', current_date - 10, 'Layer mash', 'Demo Feed Mill', 3500, 1890000, true),
  ('00000000-0000-4000-8000-00000000f001', current_date - 3,  'Layer mash', 'Demo Feed Mill', 2500, 1375000, true);

-- Egg stock corrections.
insert into public.egg_stock_adjustments (farm_id, adjusted_on, grade, eggs, reason, is_demo) values
  ('00000000-0000-4000-8000-00000000f001', current_date - 29, null, 1500, 'Opening stock', true),
  ('00000000-0000-4000-8000-00000000f001', current_date - 6, null, -90, 'Cracked in storage', true);

-- Customers and invoices.
insert into public.customers (id, farm_id, name, phone, address, is_demo) values
  ('00000000-0000-4000-8000-0000000c0001', '00000000-0000-4000-8000-00000000f001',
   'Demo Supermarket Ltd', '0800 000 0001', 'Akure road, Demo town', true),
  ('00000000-0000-4000-8000-0000000c0002', '00000000-0000-4000-8000-00000000f001',
   'Demo Hotel Kitchen', '0800 000 0002', 'Hotel row, Demo town', true),
  ('00000000-0000-4000-8000-0000000c0003', '00000000-0000-4000-8000-00000000f001',
   'Demo Market Trader', '0800 000 0003', 'Central market, Demo town', true);

insert into public.invoices (id, farm_id, customer_id, issued_on, due_on, is_demo) values
  ('00000000-0000-4000-8000-0000000d0001', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000c0001', current_date - 20, current_date - 6, true),
  ('00000000-0000-4000-8000-0000000d0002', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000c0002', current_date - 12, current_date + 2, true),
  ('00000000-0000-4000-8000-0000000d0003', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000c0001', current_date - 8, current_date + 6, true),
  ('00000000-0000-4000-8000-0000000d0004', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-0000000c0003', current_date - 3, current_date + 4, true);

insert into public.invoice_items
  (farm_id, invoice_id, category, description, grade, quantity, unit, unit_price_ngn) values
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000d0001', 'eggs', 'Large eggs', 'large', 120, 'crate', 5800),
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000d0002', 'eggs', 'Large eggs', 'large', 80, 'crate', 5800),
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000d0002', 'eggs', 'Medium eggs', 'medium', 60, 'crate', 5300),
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000d0003', 'eggs', 'Jumbo eggs', 'jumbo', 40, 'crate', 6500),
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000d0004', 'eggs', 'Medium eggs', 'medium', 90, 'crate', 5300),
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000d0004', 'manure', 'Manure, 10 bags', null, 10, 'bag', 1500);

insert into public.payments (farm_id, invoice_id, paid_on, amount_ngn, method, reference, is_demo) values
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000d0002', current_date - 6, 400000, 'transfer', 'Demo ref 4471', true),
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000d0003', current_date - 7, 260000, 'transfer', 'Demo ref 4480', true);
