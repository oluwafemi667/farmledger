# Farmledger

Poultry farm records, finances and a daily briefing that keep working without a connection.
Built for a layer farm: owners see the whole business, farmhands get a fast daily checklist.

Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (Postgres with Row Level Security).

## What it does

**Farmhand side** (phone first, works offline)
- Daily checklist per flock: eggs, feed, deaths, vaccination, and a "Sick birds" report.
- Entries save on the device first and sync when a connection returns. Each entry carries its own id, so a retry never records it twice.
- History of recent entries, with their own entries marked.

**Owner side**
- Overview with a briefing and alerts: laying drops, rising deaths, unlogged days, overdue vaccines, unreviewed sick-bird reports and active egg holds.
- Flocks: directory, per-flock page, edits with a version check so a stale edit never overwrites a newer one.
- Vaccination programme per flock, built from published layer programmes and labelled "confirm with your vet". The owner can change, add or remove items.
- Health log: farmhands report what they see; the owner records vet findings, treatment and an egg-hold date. The app never names a disease or a dose.
- Stock: eggs, feed bags and days of feed left.
- Sales and money: cash sales, expenses, invoices, customers, payments and customer statements.
- Reports: profit per flock, feed conversion, a breed laying curve and a printable weekly report.
- Team and audit: add people, set roles, two-step verification (TOTP) for owner accounts, and an append-only audit trail of changes.

**Public demo mode** (portfolio deployment): visitors switch between an Owner view (read-only) and a Farmhand view on sample data that resets every night. See `DEMO.md`.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Without Supabase settings the app still runs: `/design` shows the design system and `/login` explains what is missing.

## Connect Supabase

1. Create a Supabase project. In Authentication settings, turn **off** public sign-ups. People are added by the owner, not by self-registration.
2. In the SQL editor, run the files in `supabase/migrations/` in order, pasting each file's contents:
   `0001_core_schema`, `0002_day_summaries`, `0003_commerce_and_stock`, `0004_audit_trail`, `0005_invoice_functions`, `0006_vaccination_programme_and_health`.
3. Copy `.env.local.example` to `.env.local` and fill in the project URL and **anon** key (Settings, API). Never put the service role key in a `NEXT_PUBLIC_` variable or in client code. The app never needs it.
4. Create your users under Authentication, Users.
5. Link each user to a farm and a role. A user with no profile can sign in but sees no data.

```sql
-- Your real farm
insert into public.farms (name) values ('Your farm name') returning id;

-- Link a user (replace the farm id, name, role and email)
insert into public.profiles (id, farm_id, full_name, role)
select id, '<farm id>', 'Full name', 'owner'   -- or 'farmhand'
from auth.users where email = 'owner@example.com';
```

### Demo data

`supabase/seed.sql` creates a separate farm, "Demo Farm (sample data)", with three flocks, 30 days of invented logs, sales, expenses, a vaccine schedule and two health reports. It is flagged `is_demo` and lives in its own farm, so it never mixes with real records. Re-running the seed replaces the farm and removes the demo accounts' profile links, so link them again afterwards. `DEMO.md` covers the public demo setup.

## Access rules (enforced by Row Level Security)

| | Farmhand | Owner |
| --- | --- | --- |
| Flocks | read | read, create, edit, delete |
| Eggs, deaths, feed, vaccinations | read, add own entries | read, add, correct, delete |
| Vaccination schedule | read | manage |
| Sick-bird reports | report; read | review, record findings, close |
| Sales, expenses, invoices, stock figures | no access | full access |
| People, roles and audit trail | see self | see and manage the farm's people |

The routes mirror this (`/today` for farmhands, `/overview` for owners), but the database is the real gate.

## Checks

```bash
npm test                    # 135 unit tests: money, stock, economics, warnings, health, offline outbox
npm run db:validate         # 134 database checks in an in-process Postgres (PGlite)
npm run db:validate:demo    # demo-mode rules: read-only owner, locked accounts, nightly reset
npm run lint && npx tsc --noEmit && npm run build
```

The database checks cover role access, tenant isolation (a second farm must never see the first farm's rows), idempotent retries, input validation, derived bird counts, the audit trail and the vaccination programme.

## How the app knows things

- **A vaccine is due** because a schedule row has a due date, worked out from the flock's placement date and age. The standard programme is applied automatically to new layer flocks.
- **A flock may be unwell** only from what people report and from simple rules on laying, deaths and feed. The app says "call your vet", never a diagnosis.
- **Totals are derived**, never typed in: live birds, egg stock and feed left come from the records, so they cannot drift from them.

## Layout

```
supabase/migrations/   schema, RLS, functions
supabase/seed.sql      demo farm
supabase/demo/         public demo setup (read-only owner, nightly reset)
scripts/               database validation
src/components/ui/     design system components
src/lib/domain/        business rules (pure, tested)
src/lib/data/          repositories and the offline outbox
src/lib/supabase/      browser, server and middleware clients
src/app/(owner)/       owner interface
src/app/(farmhand)/    farmhand interface
src/app/demo/          demo sign-in route
src/app/design/        design system review pages (development only)
```

## Known limits

- Offline behaviour is covered by tests and a service worker; it has not yet been exercised on a range of real phones.
- The app is not yet installable to a phone home screen (no web app manifest).
- Next.js 14 has open advisories; see `SECURITY.md`.
