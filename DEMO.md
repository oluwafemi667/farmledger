# Public demo setup (same Supabase project)

The portfolio demo is a copy of the app switched into demo mode. It uses your existing Supabase project
and the sample farm already in it (id 00000000-0000-4000-8000-00000000f001). The demo accounts can only
see that farm, and the owner demo account is read-only at database level.

1. Make sure the setup files and the demo data (`supabase/seed.sql`) have been run. Paste the file contents.
2. Authentication > Users > Add user (tick Auto confirm), with strong random passwords:
   `demo-owner@farmledger.demo` and `demo-farmhand@farmledger.demo`.
   Then link each to the sample farm in `profiles`:
   owner for the first, farmhand for the second (the SQL to do this is in the chat).
3. Database > Extensions: enable `pg_cron`. Run `supabase/demo/demo-setup.sql` right after the demo data. Check the nightly job exists with `select * from cron.job;`.
   Re-running `seed.sql` deletes the demo farm and the accounts' profile links, so link them again afterwards.
4. Deploy the app (for example a Vercel project) with the same URL and anon key as now, plus:
   `NEXT_PUBLIC_DEMO_MODE=true`, `DEMO_OWNER_PASSWORD`, `DEMO_FARMHAND_PASSWORD`.
   In demo mode the real sign-in form is replaced by the two demo buttons, so keep this deployment for the portfolio.
5. Link your portfolio to that deployment's address.

When the real farm goes live, deploy a second copy WITHOUT the demo settings for the family, and
move the demo to its own Supabase project if you have a free slot by then.
