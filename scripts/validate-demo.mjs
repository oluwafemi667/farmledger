// Checks supabase/demo/demo-setup.sql against the real migrations and seed in an in-process Postgres.
// Run: npm run db:validate:demo
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "supabase/migrations");
const migrations = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(join(dir, f), "utf8"));
const seed = readFileSync(join(root, "supabase/seed.sql"), "utf8");
const demo = readFileSync(join(root, "supabase/demo/demo-setup.sql"), "utf8");

const FARM = "00000000-0000-4000-8000-00000000f001";
const FLOCK = "00000000-0000-4000-8000-0000000a0001";
const OWNER = "11111111-1111-4111-8111-111111111111";
const HAND = "22222222-2222-4222-8222-222222222222";

const db = new PGlite();
await db.exec(`
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(), email text, phone text, encrypted_password text,
    raw_app_meta_data jsonb not null default '{}', raw_user_meta_data jsonb not null default '{}'
  );
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable
    as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant select on auth.users to authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);
for (const sql of migrations) await db.exec(sql);
await db.exec(seed);
await db.exec(`
  insert into auth.users (id, email, encrypted_password) values
    ('${OWNER}', 'demo-owner@farmledger.demo', 'x'),
    ('${HAND}', 'demo-farmhand@farmledger.demo', 'x');
  insert into public.profiles (id, farm_id, full_name, role) values
    ('${OWNER}', '${FARM}', 'Demo Owner', 'owner'),
    ('${HAND}', '${FARM}', 'Demo Farmhand', 'farmhand');
`);
await db.exec(demo);

let failed = 0;
const check = (name, cond, detail) => { if (cond) console.log(`  PASS  ${name}`); else { failed++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); } };

async function as(id, email, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false); select set_config('request.jwt.claims','{"email":"${email}"}',false);`);
  try { return await fn(); }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false); select set_config('request.jwt.claims','',false);`); }
}
const fails = async (sql) => { try { await db.exec(sql); return false; } catch (e) { return e; } };

console.log("Demo protections");
await as(OWNER, "demo-owner@farmledger.demo", async () => {
  const n = await db.query("select count(*)::int n from public.flocks");
  check("demo owner can read the sample farm", n.rows[0].n > 0);
  const e1 = await fails(`insert into public.expenses (farm_id, spent_on, category, description, amount_ngn) values ('${FARM}', current_date, 'other', 'x', 1)`);
  check("demo owner cannot add an expense", !!e1 && /row-level security/i.test(e1.message), e1 && e1.message);
  const e2 = await fails(`insert into public.flocks (farm_id, name, initial_count, placed_on) values ('${FARM}', 'Visitor flock', 10, current_date)`);
  check("demo owner cannot add a flock", !!e2);
  await db.exec(`update public.sales set notes = 'hacked'`);
  const h = await db.query("select count(*)::int n from public.sales where notes = 'hacked'");
  check("demo owner cannot edit sales", h.rows[0].n === 0);
  await db.exec(`delete from public.expenses`);
  const x = await db.query("select count(*)::int n from public.expenses");
  check("demo owner cannot delete expenses", x.rows[0].n > 0);
});

await as(HAND, "demo-farmhand@farmledger.demo", async () => {
  const e = await fails(`insert into public.egg_collections (farm_id, flock_id, collected_on, eggs) values ('${FARM}', '${FLOCK}', current_date, 111)`);
  check("demo farmhand can log eggs", e === false, e && e.message);
});

// A different farm's owner is unaffected by the demo rules.
const REAL = "33333333-3333-4333-8333-333333333333", RFARM = "44444444-4444-4444-8444-444444444444";
await db.exec(`
  insert into public.farms (id, name) values ('${RFARM}', 'Real');
  insert into auth.users (id, email, encrypted_password) values ('${REAL}', 'real@owner.test', 'x');
  insert into public.profiles (id, farm_id, full_name, role) values ('${REAL}', '${RFARM}', 'Real Owner', 'owner');
`);
await as(REAL, "real@owner.test", async () => {
  const e = await fails(`insert into public.expenses (farm_id, spent_on, category, description, amount_ngn) values ('${RFARM}', current_date, 'other', 'fuel', 500)`);
  check("a real owner can still write", e === false, e && e.message);
});

const e3 = await fails(`update auth.users set encrypted_password = 'new' where email = 'demo-owner@farmledger.demo'`);
check("demo password cannot be changed", !!e3 && /cannot be changed/.test(e3.message));
const e4 = await fails(`update auth.users set encrypted_password = 'new' where email = 'real@owner.test'`);
check("other accounts can change password", e4 === false);

console.log("Nightly refresh");
const before = await db.query(`select max(collected_on) m from public.egg_collections where farm_id = '${FARM}' and is_demo`);
const auditBefore = (await db.query("select count(*)::int n from public.audit_log")).rows[0].n;
await db.exec(`update public.demo_state set seeded_on = seeded_on - 3`);
await db.exec(`select public.demo_reset()`);
const visitor = await db.query(`select count(*)::int n from public.egg_collections where farm_id = '${FARM}' and not is_demo`);
check("visitor entries are removed", visitor.rows[0].n === 0);
const after = await db.query(`select max(collected_on) m from public.egg_collections where farm_id = '${FARM}' and is_demo`);
const days = Math.round((new Date(after.rows[0].m) - new Date(before.rows[0].m)) / 86400000);
check("history moves forward by the days missed", days === 3, `moved ${days}`);
const st = await db.query(`select (seeded_on = (now() at time zone 'Africa/Lagos')::date) ok from public.demo_state`);
check("refresh date is recorded", st.rows[0].ok);
const auditAfter = (await db.query("select count(*)::int n from public.audit_log")).rows[0].n;
check("refresh leaves the audit trail alone", auditAfter === auditBefore, `${auditBefore} -> ${auditAfter}`);
const e5 = await fails(`select public.demo_reset()`);
check("reset runs again with nothing to do", e5 === false);
await as(HAND, "demo-farmhand@farmledger.demo", async () => {
  const e = await fails(`select public.demo_reset()`);
  check("visitors cannot trigger a reset", !!e);
});

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
