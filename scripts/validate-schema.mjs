// Loads the migration and demo seed into an in-process Postgres (PGlite) with a
// stubbed Supabase `auth` schema, then checks the access rules that matter.
// Run: npm run db:validate
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationDir = join(root, "supabase/migrations");
const migrations = readdirSync(migrationDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(migrationDir, f), "utf8"));
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8");

const db = new PGlite();

// ---- stub the parts of Supabase the schema depends on
await db.exec(`
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_app_meta_data jsonb not null default '{}',
    raw_user_meta_data jsonb not null default '{}'
  );
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant select on auth.users to authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);

for (const sql of migrations) await db.exec(sql);
await db.exec(seed);

// ---- tiny test harness
let failed = 0;
const ok = (name) => console.log(`  PASS  ${name}`);
const bad = (name, detail) => {
  failed++;
  console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
};
const check = (name, cond, detail) => (cond ? ok(name) : bad(name, detail));

async function as(userId, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
async function asAnon(fn) {
  await db.exec(`set role anon;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
}
async function rejects(name, fn, pattern) {
  try {
    await fn();
    bad(name, "expected an error but the statement succeeded");
  } catch (e) {
    check(name, pattern.test(String(e.message)), `unexpected error: ${e.message}`);
  }
}
const q = (sql, params) => db.query(sql, params);
const count = async (table) => Number((await q(`select count(*)::int as n from public.${table}`)).rows[0].n);

const DEMO_FARM = "00000000-0000-4000-8000-00000000f001";
const OTHER_FARM = "00000000-0000-4000-8000-00000000f002";
const FLOCK_A = "00000000-0000-4000-8000-0000000a0001";
const FLOCK_B = "00000000-0000-4000-8000-0000000a0002";
const OTHER_FLOCK = "00000000-0000-4000-8000-0000000a0099";
const U_OWNER = "11111111-1111-4111-8111-111111111111";
const U_HAND = "22222222-2222-4222-8222-222222222222";
const U_OTHER = "33333333-3333-4333-8333-333333333333";
const U_NOBODY = "44444444-4444-4444-8444-444444444444";

await q(`insert into public.farms (id, name) values ($1, 'Other real farm')`, [OTHER_FARM]);
await q(
  `insert into public.flocks (id, farm_id, name, initial_count, placed_on) values ($1, $2, 'Other flock', 100, current_date)`,
  [OTHER_FLOCK, OTHER_FARM],
);
const mkUser = (id, email, app) =>
  q(`insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
     values ($1, $2, $3::jsonb, $4::jsonb)`, [id, email, JSON.stringify(app), JSON.stringify({ full_name: email })]);
await mkUser(U_OWNER, "owner@demo", { farm_id: DEMO_FARM, role: "owner" });
await mkUser(U_HAND, "hand@demo", { farm_id: DEMO_FARM, role: "farmhand" });
await mkUser(U_OTHER, "owner@other", { farm_id: OTHER_FARM, role: "owner" });
await mkUser(U_NOBODY, "stranger@x", {});

console.log("\nProfiles and roles");
check("admin-set app_metadata creates profiles", (await count("profiles")) === 3);
check(
  "sign-up without app_metadata gets no profile",
  (await q(`select 1 from public.profiles where id = $1`, [U_NOBODY])).rows.length === 0,
);
await as(U_NOBODY, async () => {
  check("user with no profile sees no flocks", (await count("flocks")) === 0);
});

console.log("\nSeed sanity");
check(
  "demo farm has 3 flocks",
  Number((await q(`select count(*)::int n from public.flocks where farm_id = $1`, [DEMO_FARM])).rows[0].n) === 3,
);
const eggRates = (
  await q(`
  select f.name,
    avg(d.eggs::numeric / f.initial_count) filter (where d.collected_on >= current_date - 2) as last3,
    avg(d.eggs::numeric / f.initial_count) filter (where d.collected_on < current_date - 2) as before
  from public.flocks f
  join (select flock_id, collected_on, sum(eggs) as eggs from public.egg_collections group by 1, 2) d
    on d.flock_id = f.id
  group by f.name order by f.name`)
).rows;
const b = eggRates.find((r) => r.name === "Demo flock B");
check("flock B lay rate drops in the last 3 days", Number(b.last3) < Number(b.before) - 0.05, JSON.stringify(b));
check("every seeded row is flagged demo", (await q(`select count(*)::int n from public.egg_collections where not is_demo`)).rows[0].n === 0);

console.log("\nDerived active birds");
const lost = Number((await q(`select sum(birds)::int n from public.mortality_logs where flock_id = $1`, [FLOCK_B])).rows[0].n);
await as(U_HAND, async () => {
  const r = (await q(`select active_birds, total_lost from public.flock_status where id = $1`, [FLOCK_B])).rows[0];
  check("active_birds = initial - deaths", r.active_birds === 1000 - lost && r.total_lost === lost, JSON.stringify(r));
});

console.log("\nFarmhand access");
await as(U_HAND, async () => {
  check("reads flocks", (await count("flocks")) === 3);
  check("reads operational logs", (await count("egg_collections")) > 0 && (await count("feed_logs")) > 0);
  check("sees NO sales", (await count("sales")) === 0);
  check("sees NO expenses", (await count("expenses")) === 0);
  check("sees NO briefings", (await count("ai_briefings")) === 0);
  await rejects(
    "cannot record a sale",
    () => q(`insert into public.sales (farm_id, sold_on, category, amount_ngn) values ($1, current_date, 'eggs', 100)`, [DEMO_FARM]),
    /row-level security/,
  );
  const upd = await q(`update public.flocks set name = 'Hacked' where id = $1`, [FLOCK_A]);
  check("cannot edit flocks", upd.affectedRows === 0);
  const del = await q(`delete from public.egg_collections where farm_id = $1`, [DEMO_FARM]);
  check("cannot delete logs", del.affectedRows === 0);
  const roleUpd = await q(`update public.profiles set role = 'owner' where id = $1`, [U_HAND]);
  check("cannot promote self to owner", roleUpd.affectedRows === 0);
});
check(
  "role is unchanged after the attempt",
  (await q(`select role from public.profiles where id = $1`, [U_HAND])).rows[0].role === "farmhand",
);

console.log("\nOffline-safe appends (idempotent, validated)");
const EGG_ID = "99999999-9999-4999-8999-999999999991";
const insEgg = `insert into public.egg_collections (id, farm_id, flock_id, collected_on, eggs, broken)
  values ($1, $2, $3, current_date, 100, 2) on conflict (id) do nothing`;
await as(U_HAND, async () => {
  const first = await q(insEgg, [EGG_ID, DEMO_FARM, FLOCK_A]);
  const retry = await q(insEgg, [EGG_ID, DEMO_FARM, FLOCK_A]);
  check("first upload inserts one row", first.affectedRows === 1);
  check("retry of the same id inserts nothing", retry.affectedRows === 0);
  await rejects(
    "cannot spoof created_by",
    () => q(`insert into public.egg_collections (farm_id, flock_id, collected_on, eggs, created_by)
             values ($1, $2, current_date, 5, $3)`, [DEMO_FARM, FLOCK_A, U_OWNER]),
    /row-level security/,
  );
  await rejects(
    "rejects broken > eggs",
    () => q(`insert into public.egg_collections (farm_id, flock_id, collected_on, eggs, broken)
             values ($1, $2, current_date, 5, 9)`, [DEMO_FARM, FLOCK_A]),
    /check constraint/,
  );
  await rejects(
    "rejects zero or negative deaths",
    () => q(`insert into public.mortality_logs (farm_id, flock_id, logged_on, birds)
             values ($1, $2, current_date, 0)`, [DEMO_FARM, FLOCK_A]),
    /check constraint/,
  );
  await rejects(
    "cannot write into another farm",
    () => q(`insert into public.egg_collections (farm_id, flock_id, collected_on, eggs)
             values ($1, $2, current_date, 5)`, [OTHER_FARM, FLOCK_A]),
    /row-level security/,
  );
  // A real flock that belongs to the other farm, referenced from a demo-farm log.
  await rejects(
    "cannot attach a log to a flock from another farm",
    () => q(`insert into public.feed_logs (farm_id, flock_id, logged_on, feed_type, quantity_kg)
             values ($1, $2, current_date, 'Layer mash', 10)`, [DEMO_FARM, OTHER_FLOCK]),
    /foreign key/,
  );
});

console.log("\nOwner access");
await as(U_OWNER, async () => {
  check("reads sales", (await count("sales")) > 0);
  check("reads expenses", (await count("expenses")) > 0);
  const upd = await q(`update public.flocks set notes = 'checked' where id = $1 returning version`, [FLOCK_A]);
  check("edits a flock; version increments", upd.rows[0]?.version === 2, JSON.stringify(upd.rows));
  const stale = await q(`update public.flocks set notes = 'stale write' where id = $1 and version = 1`, [FLOCK_A]);
  check("stale-version write matches no row (conflict is detectable)", stale.affectedRows === 0);
  const sale = await q(
    `insert into public.sales (farm_id, sold_on, category, amount_ngn) values ($1, current_date, 'eggs', 4500)`,
    [DEMO_FARM],
  );
  check("records a sale", sale.affectedRows === 1);
  const dueRows = (
    await q(`select vaccine_name from public.vaccine_schedule s
             where not exists (select 1 from public.vaccinations v where v.schedule_id = s.id) order by due_on`)
  ).rows;
  check("four vaccinations are outstanding", dueRows.length === 4, JSON.stringify(dueRows));
});

console.log("\nDay summaries and history (stage 3)");
await as(U_HAND, async () => {
  const sum = (await q(`select * from public.flock_day_summary(current_date)`)).rows;
  check("summary has one row per active flock the user can see", sum.length === 3, `${sum.length} rows`);

  const b = sum.find((r) => r.flock_id === FLOCK_B);
  const truthB = (
    await q(`select sum(eggs)::int n from public.egg_collections where flock_id = $1 and collected_on = current_date`, [FLOCK_B])
  ).rows[0].n;
  check("today's eggs match the records", b.eggs === truthB && b.egg_entries === 2, JSON.stringify(b));
  const truthPrev = (
    await q(`select sum(eggs)::int n from public.egg_collections where flock_id = $1 and collected_on = current_date - 1`, [FLOCK_B])
  ).rows[0].n;
  check("previous day is shown for comparison", b.eggs_prev === truthPrev && b.eggs_prev > 0);
  check("flock B has an overdue vaccination", b.vaccines_overdue === 1 && b.next_vaccine_name === "Infectious bronchitis", JSON.stringify(b));

  const c = sum.find((r) => r.flock_id === "00000000-0000-4000-8000-0000000a0003");
  check("flock C has none overdue and its booster is next", c.vaccines_overdue === 0 && c.next_vaccine_name === "Newcastle disease booster");

  const future = (await q(`select * from public.flock_day_summary(current_date + 400)`)).rows;
  check("a day with no records returns zeros, not nulls", future.every((r) => r.eggs === 0 && Number(r.feed_kg) === 0 && r.deaths === 0));

  const daily = (await q(`select * from public.flock_daily($1, current_date - 6, current_date)`, [FLOCK_B])).rows;
  check("flock_daily returns 7 days, newest first", daily.length === 7 && new Date(daily[0].day).getTime() > new Date(daily[6].day).getTime());
  const dailyDeaths = daily.reduce((s, r) => s + r.deaths, 0);
  const trueDeaths = (
    await q(`select coalesce(sum(birds),0)::int n from public.mortality_logs where flock_id = $1 and logged_on >= current_date - 6`, [FLOCK_B])
  ).rows[0].n;
  check("flock_daily deaths equal the records", dailyDeaths === trueDeaths, `${dailyDeaths} vs ${trueDeaths}`);

  const out = (await q(`select vaccine_name from public.vaccines_outstanding order by due_on`)).rows;
  check("outstanding vaccines lists exactly the four unrecorded ones", out.length === 4, JSON.stringify(out));
  const act = (await q(`select * from public.activity_log order by created_at desc limit 5`)).rows;
  const mine = act.find((r) => r.by_me);
  check("history includes the farmhand's own entry, marked as theirs", !!mine && mine.kind === "eggs", JSON.stringify(act.map((a) => [a.kind, a.by_me])));
  check("history includes other people's entries, not marked as theirs", (await q(`select 1 from public.activity_log where not by_me limit 1`)).rows.length === 1);
});
await as(U_OTHER, async () => {
  const sum = (await q(`select * from public.flock_day_summary(current_date)`)).rows;
  check("another farm's summary shows only its own flock", sum.length === 1 && sum[0].flock_id === OTHER_FLOCK);
  check("another farm cannot see demo history", (await q(`select 1 from public.activity_log where farm_id = $1`, [DEMO_FARM])).rows.length === 0);
});
await asAnon(async () => {
  await rejects("anonymous cannot call the summary function", () => q(`select * from public.flock_day_summary(current_date)`), /permission denied/);
  await rejects("anonymous cannot read history", () => q(`select * from public.activity_log`), /permission denied/);
});

console.log("\nTenant isolation");
await as(U_OTHER, async () => {
  const seen = (await q(`select farm_id from public.flocks`)).rows;
  check(
    "other farm's owner sees only their own flock, none of the demo farm's",
    seen.length === 1 && seen[0].farm_id === OTHER_FARM,
    JSON.stringify(seen),
  );
  check("other farm's owner sees none of the demo sales", (await count("sales")) === 0);
  await rejects(
    "other farm's owner cannot write into the demo farm",
    () => q(`insert into public.flocks (farm_id, name, initial_count, placed_on)
             values ($1, 'Intruder', 10, current_date)`, [DEMO_FARM]),
    /row-level security/,
  );
});
await asAnon(async () => {
  await rejects("anonymous cannot read flocks", () => q(`select * from public.flocks`), /permission denied/);
  await rejects("anonymous cannot read sales", () => q(`select * from public.sales`), /permission denied/);
});

console.log("\nCommerce, stock and dashboard figures");
const INV = (n) => `00000000-0000-4000-8000-0000000d000${n}`;
await as(U_OWNER, async () => {
  const bal = (await q(`select * from public.invoice_balances order by number`)).rows;
  check("four demo invoices, numbered in order", bal.map((b) => b.number).join() === "INV-0001,INV-0002,INV-0003,INV-0004", bal.map((b) => b.number).join());
  const by = Object.fromEntries(bal.map((b) => [b.number, b]));
  check("unpaid invoice: total and balance", Number(by["INV-0001"].total_ngn) === 696000 && Number(by["INV-0001"].balance_ngn) === 696000);
  check("part-paid invoice balance", Number(by["INV-0002"].total_ngn) === 782000 && Number(by["INV-0002"].paid_ngn) === 400000 && Number(by["INV-0002"].balance_ngn) === 382000);
  check("fully paid invoice balance is zero", Number(by["INV-0003"].balance_ngn) === 0);
  check("mixed-category invoice total", Number(by["INV-0004"].total_ngn) === 492000);

  const crate = (await q(`select eggs_equivalent from public.invoice_items where invoice_id = $1 limit 1`, [INV(1)])).rows[0];
  check("a crate counts as 30 eggs", Number(crate.eggs_equivalent) === 3600, String(crate.eggs_equivalent));

  const stock = Object.fromEntries((await q(`select * from public.egg_stock`)).rows.map((r) => [r.grade, r]));
  check("stock lists every grade including ungraded", Object.keys(stock).sort().join() === "jumbo,large,medium,small,ungraded", Object.keys(stock).join());
  check("large eggs sold are counted from invoices", stock.large.sold === 6000, String(stock.large.sold));
  check("medium eggs sold are counted from invoices", stock.medium.sold === 4500, String(stock.medium.sold));
  check("opening stock and breakage adjust ungraded stock", stock.ungraded.adjusted === 1410, String(stock.ungraded.adjusted));
  check("on hand = collected - sold + adjusted", Object.values(stock).every((r) => r.on_hand === r.collected - r.sold + r.adjusted));

  await q(`update public.invoices set status = 'void' where id = $1`, [INV(1)]);
  const voided = (await q(`select balance_ngn from public.invoice_balances where id = $1`, [INV(1)])).rows[0];
  const largeAfter = (await q(`select sold from public.egg_stock where grade = 'large'`)).rows[0];
  check("a void invoice has no balance and returns its eggs to stock", Number(voided.balance_ngn) === 0 && largeAfter.sold === 2400, String(largeAfter.sold));
  await q(`update public.invoices set status = 'issued' where id = $1`, [INV(1)]);

  const feed = (await q(`select * from public.feed_position(current_date)`)).rows;
  const used = Number((await q(`select sum(quantity_kg) as k from public.feed_logs`)).rows[0].k);
  check("feed position: bought, used and on hand agree", feed.length === 1 && Number(feed[0].purchased_kg) === 14000 && Math.abs(Number(feed[0].on_hand_kg) - (14000 - used)) < 0.01, JSON.stringify(feed));
  check("feed position estimates days left", Number(feed[0].days_left) > 0 && Number(feed[0].daily_use_kg) > 0);

  const fd = (await q(`select * from public.farm_daily(current_date - 6, current_date)`)).rows;
  const eggSum = Number((await q(`select sum(eggs) as e from public.egg_collections where collected_on >= current_date - 6`)).rows[0].e);
  check("farm series has one row per day", fd.length === 7);
  check("farm series egg total matches the logs", fd.reduce((a, r) => a + r.eggs, 0) === eggSum);
  check("farm series birds are positive and fall with deaths", fd.every((r) => r.birds > 0) && fd[6].birds < 2760);

  const card = (await q(`select * from public.flock_scorecard(current_date - 6, current_date)`)).rows;
  check("scorecard has a row per active flock", card.length === 3 && card.every((c) => c.egg_days > 0));

  const money = (await q(`select * from public.money_daily(current_date - 29, current_date)`)).rows;
  const sumOf = (k) => money.reduce((a, r) => a + Number(r[k]), 0);
  check("money series: invoiced total", sumOf("invoiced_ngn") === 2230000, String(sumOf("invoiced_ngn")));
  check("money series: collected total", sumOf("collected_ngn") === 660000, String(sumOf("collected_ngn")));

  const staff = (await q(`select * from public.staff_activity(current_date - 29, current_date)`)).rows;
  check("staff activity lists the farm's people only", staff.length === 2, String(staff.length));

  const next = (await q(
    `insert into public.invoices (farm_id, customer_id, issued_on, due_on)
     values ($1, '00000000-0000-4000-8000-0000000c0001', current_date, current_date + 7) returning number`, [DEMO_FARM])).rows[0];
  check("next invoice gets the next number", next.number === "INV-0005", next.number);
  await rejects(
    "an invoice cannot use another farm's customer",
    () => q(`insert into public.invoices (farm_id, customer_id, issued_on, due_on)
             values ($1, '00000000-0000-4000-8000-0000000c0001', current_date, current_date)`, [OTHER_FARM]),
    /row-level security|foreign key/,
  );
});

await as(U_HAND, async () => {
  for (const t of ["customers", "invoices", "invoice_items", "payments", "feed_purchases", "egg_stock_adjustments"]) {
    check(`farmhand sees no ${t}`, (await count(t)) === 0);
  }
  check("farmhand sees no invoice balances", (await count("invoice_balances")) === 0);
  check("farmhand sees no egg stock", (await count("egg_stock")) === 0);
  check("farmhand gets no feed position", (await q(`select * from public.feed_position(current_date)`)).rows.length === 0);
  check("farmhand gets no staff activity", (await q(`select * from public.staff_activity(current_date - 29, current_date)`)).rows.length === 0);
  const m = (await q(`select * from public.money_daily(current_date - 6, current_date)`)).rows;
  check("farmhand's money series is all zeros", m.every((r) => Number(r.invoiced_ngn) + Number(r.sales_ngn) + Number(r.expenses_ngn) + Number(r.collected_ngn) === 0));
  await rejects("farmhand cannot add a customer", () => q(`insert into public.customers (farm_id, name) values ($1, 'X')`, [DEMO_FARM]), /row-level security/);
  await rejects(
    "grades cannot exceed the good eggs in a collection",
    () => q(`insert into public.egg_collections (farm_id, flock_id, collected_on, eggs, broken, grade_large, created_by)
             values ($1, $2, current_date, 100, 10, 95, auth.uid())`, [DEMO_FARM, FLOCK_A]),
    /egg_grades_within_good_eggs/,
  );
});

await as(U_OTHER, async () => {
  for (const t of ["customers", "invoices", "invoice_items", "payments", "feed_purchases", "egg_stock_adjustments"]) {
    check(`other farm's owner sees none of the demo ${t}`, (await count(t)) === 0);
  }
  const st = (await q(`select * from public.egg_stock`)).rows;
  check("other farm's stock is its own and empty", st.length === 5 && st.every((r) => r.farm_id === OTHER_FARM && r.on_hand === 0));
});
await asAnon(async () => {
  await rejects("anonymous cannot read invoice balances", () => q(`select * from public.invoice_balances`), /permission denied/);
  await rejects("anonymous cannot read egg stock", () => q(`select * from public.egg_stock`), /permission denied/);
  await rejects("anonymous cannot call the dashboard series", () => q(`select * from public.farm_daily(current_date - 1, current_date)`), /permission denied/);
});

console.log("\nAudit trail");
const auditCount = async () => Number((await q(`select count(*)::int n from public.audit_log`)).rows[0].n);
await as(U_OWNER, async () => {
  const before = await auditCount();
  await q(`update public.flocks set house = 'House 9' where id = $1`, [FLOCK_A]);
  const rows = (await q(`select * from public.audit_log where table_name = 'flocks' and row_id = $1 order by id desc limit 1`, [FLOCK_A])).rows;
  check("an owner's edit is recorded", (await auditCount()) === before + 1 && rows[0]?.action === "update");
  check("the record holds the old and new value", rows[0]?.changes?.house?.new === "House 9" && rows[0]?.changes?.house?.old !== "House 9", JSON.stringify(rows[0]?.changes));
  check("the record names who did it", rows[0]?.actor === U_OWNER);
  await q(`update public.flocks set house = house where id = $1`, [FLOCK_A]);
  check("a save that changes nothing is not recorded", (await auditCount()) === before + 1);
  await q(`delete from public.feed_logs where id = (select id from public.feed_logs where farm_id = $1 limit 1)`, [DEMO_FARM]);
  check("deleting a daily log is recorded", (await q(`select 1 from public.audit_log where table_name = 'feed_logs' and action = 'delete'`)).rows.length === 1);
  await rejects("an owner cannot edit the audit trail", () => q(`update public.audit_log set actor_name = 'someone else'`), /permission denied|cannot be changed/);
  await rejects("an owner cannot delete from the audit trail", () => q(`delete from public.audit_log`), /permission denied|cannot be changed/);
  await rejects("an owner cannot forge an entry", () => q(`insert into public.audit_log (farm_id, table_name, action) values ($1, 'flocks', 'insert')`, [DEMO_FARM]), /permission denied/);
});
await as(U_HAND, async () => {
  check("a farmhand sees none of the audit trail", (await q(`select count(*)::int n from public.audit_log`)).rows[0].n === 0);
});
await as(U_OTHER, async () => {
  check("another farm's owner sees none of this farm's audit trail", (await q(`select count(*)::int n from public.audit_log where farm_id = $1`, [DEMO_FARM])).rows[0].n === 0);
  check("another farm's owner only ever sees their own farm's trail", (await q(`select count(*)::int n from public.audit_log where farm_id <> $1`, [OTHER_FARM])).rows[0].n === 0);
});
await asAnon(async () => {
  await rejects("anonymous cannot read the audit trail", () => q(`select * from public.audit_log`), /permission denied/);
});

console.log("\nInvoice and payment functions");
await as(U_OWNER, async () => {
  const cust = (await q(`select id from public.customers where farm_id = $1 limit 1`, [DEMO_FARM])).rows[0].id;
  const items = JSON.stringify([
    { category: "eggs", description: "Large eggs", grade: "large", quantity: 10, unit: "crate", unit_price_ngn: 4500 },
    { category: "manure", description: "Manure", grade: "", quantity: 2, unit: "bag", unit_price_ngn: 1500 },
  ]);
  const id = (await q(`select public.create_invoice($1, current_date, current_date + 14, 'test', $2::jsonb) as id`, [cust, items])).rows[0].id;
  const bal = (await q(`select total_ngn, balance_ngn from public.invoice_balances where id = $1`, [id])).rows[0];
  check("an invoice and its lines save together", Number(bal.total_ngn) === 48000 && Number(bal.balance_ngn) === 48000, JSON.stringify(bal));
  await rejects("an invoice with no lines is refused", () => q(`select public.create_invoice($1, current_date, current_date, null, '[]'::jsonb)`, [cust]), /at least one line/);
  const before = await count("invoices");
  await rejects("a bad line leaves no half-made invoice", () => q(`select public.create_invoice($1, current_date, current_date, null, '[{"category":"eggs","description":"x","quantity":-1,"unit":"crate","unit_price_ngn":1}]'::jsonb)`, [cust]), /violates check|invoice_items/);
  check("nothing was left behind by the failed invoice", (await count("invoices")) === before);
  await q(`select public.record_payment($1, current_date, 20000, 'transfer', 'ref-1')`, [id]);
  check("a payment reduces the balance", Number((await q(`select balance_ngn from public.invoice_balances where id = $1`, [id])).rows[0].balance_ngn) === 28000);
  await rejects("a payment cannot exceed the balance", () => q(`select public.record_payment($1, current_date, 28000.01, 'cash', null)`, [id]), /more than the balance/);
  await rejects("a paid invoice cannot be voided", () => q(`select public.void_invoice($1)`, [id]), /payments recorded/);
  const id2 = (await q(`select public.create_invoice($1, current_date, current_date, null, $2::jsonb) as id`, [cust, items])).rows[0].id;
  await q(`select public.void_invoice($1)`, [id2]);
  await rejects("a void invoice takes no payment", () => q(`select public.record_payment($1, current_date, 1, 'cash', null)`, [id2]), /void/);
  check("a void invoice owes nothing", Number((await q(`select balance_ngn from public.invoice_balances where id = $1`, [id2])).rows[0].balance_ngn) === 0);
});
await as(U_HAND, async () => {
  const cust = "00000000-0000-4000-8000-0000000c0001";
  await rejects("a farmhand cannot create an invoice", () => q(`select public.create_invoice($1, current_date, current_date, null, '[{"category":"eggs","description":"x","quantity":1,"unit":"crate","unit_price_ngn":1}]'::jsonb)`, [cust]), /Only the owner/);
});
await asAnon(async () => {
  await rejects("anonymous cannot create an invoice", () => q(`select public.create_invoice(gen_random_uuid(), current_date, current_date, null, '[]'::jsonb)`), /permission denied/);
});


console.log("\nVaccination programme and health log");
let NEW_FLOCK, PULLETS, DEMO_ONLY;
await as(U_OWNER, async () => {
  NEW_FLOCK = (await q(`insert into public.flocks (farm_id, name, initial_count, placed_on, placed_age_days) values ($1, 'Programme test', 500, current_date, 0) returning id`, [DEMO_FARM])).rows[0].id;
  const rows = (await q(`select vaccine_name, due_on - current_date as d from public.vaccine_schedule where flock_id = $1 order by due_on`, [NEW_FLOCK])).rows;
  check("a new flock gets the standard programme automatically", rows.length === 9, `${rows.length} items`);
  check("the first dose falls at 14 days", rows[0] && Number(rows[0].d) === 14 && /Newcastle/.test(rows[0].vaccine_name), JSON.stringify(rows[0]));
  check("optional and hatchery items are not scheduled", !rows.some((r) => /Mycoplasma|laryngo|Marek/i.test(r.vaccine_name)));
  const again = (await q(`select public.apply_vaccine_programme($1) as n`, [NEW_FLOCK])).rows[0].n;
  check("applying the programme twice adds nothing", Number(again) === 0);
  PULLETS = (await q(`insert into public.flocks (farm_id, name, initial_count, placed_on, placed_age_days) values ($1, 'Pullets bought at 16 weeks', 300, current_date, 112) returning id`, [DEMO_FARM])).rows[0].id;
  const late = (await q(`select count(*)::int n from public.vaccine_schedule where flock_id = $1`, [PULLETS])).rows[0].n;
  check("vaccines the flock is already too old for are skipped", late === 2, `${late} items`);
  DEMO_ONLY = (await q(`insert into public.flocks (farm_id, name, initial_count, placed_on, is_demo) values ($1, 'Seeded flock', 100, current_date, true) returning id`, [DEMO_FARM])).rows[0].id;
  check("demo flocks keep their own seeded schedule", (await q(`select count(*)::int n from public.vaccine_schedule where flock_id = $1`, [DEMO_ONLY])).rows[0].n === 0);
});
await as(U_HAND, async () => {
  await rejects("a farmhand cannot change the schedule", () => q(`select public.apply_vaccine_programme($1)`, [DEMO_ONLY]), /row-level security/);
  check("a farmhand can read the programme", (await q(`select count(*)::int n from public.vaccine_programme_items`)).rows[0].n === 12);
  await q(`insert into public.health_events (farm_id, flock_id, observed_on, signs, birds_affected) values ($1, $2, current_date, array['coughing_sneezing','drop_in_feed'], 12)`, [DEMO_FARM, FLOCK_A]);
  ok("a farmhand can report signs");
  await rejects("a farmhand cannot record treatment", () => q(`insert into public.health_events (farm_id, flock_id, observed_on, signs, treatment) values ($1, $2, current_date, array['diarrhoea'], 'something')`, [DEMO_FARM, FLOCK_A]), /row-level security/);
  await rejects("an unknown sign is refused", () => q(`insert into public.health_events (farm_id, flock_id, observed_on, signs) values ($1, $2, current_date, array['made_up'])`, [DEMO_FARM, FLOCK_A]), /violates check/);
  await q(`update public.health_events set resolved_on = current_date`);
  check("a farmhand cannot close a report", (await q(`select count(*)::int n from public.health_events where resolved_on is not null`)).rows[0].n === 0);
});
await as(U_OWNER, async () => {
  await q(`update public.health_events set vet_findings = 'Mild respiratory infection', treatment = 'As directed by the vet', egg_hold_until = current_date + 5`);
  const r = (await q(`select egg_hold_until - current_date as d from public.health_events limit 1`)).rows[0];
  check("the owner records the vet's findings and an egg hold", Number(r.d) === 5);
  await rejects("an egg hold cannot end before the sighting", () => q(`update public.health_events set egg_hold_until = current_date - 3`), /violates check/);
});
await asAnon(async () => {
  await rejects("anonymous cannot read health records", () => q(`select * from public.health_events`), /permission denied/);
});

console.log(failed === 0 ? "\nAll checks passed.\n" : `\n${failed} check(s) FAILED.\n`);
process.exit(failed === 0 ? 0 : 1);
