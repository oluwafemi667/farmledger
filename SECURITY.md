# Security

What protects the farm's data, what was checked, and what is still open.

## Layers

1. **Row Level Security in Postgres is the real gate.** Every table is scoped to the signed-in user's farm. Farmhands cannot read sales, expenses, invoices, payments, stock figures or staff activity. Owner-only helpers return nothing to anyone else. `npm run db:validate` proves this with 90+ checks, including a second farm that must never see the first farm's rows.
2. **Roles live in `profiles`, only owners can change them.** Public sign-up is off; people are added by the owner. A new login with no profile can read nothing.
3. **Server actions re-check everything.** `requireProfile("owner")`, then validation of the input with the same schema the browser uses. The browser's checks are a convenience, not the gate.
4. **Safe concurrent edits.** Flock edits carry a version number; a stale edit changes nothing and is reported.
5. **Sign-in brake.** Five wrong passwords for one account from one address, or twenty from one address, pause sign-in for 15 minutes. One message for a wrong email or a wrong password, so accounts cannot be probed. This counter lives in one server's memory; Supabase Auth applies its own limits on top.
6. **Browser protections on every response.** A per-request Content Security Policy with a nonce (only our scripts run; nothing can be framed; the page can only talk to this site and your Supabase project), HSTS, `nosniff`, no framing, a strict referrer policy, and camera, microphone and location switched off.
7. **No secrets in the browser.** Only the project URL and the anon key are used. The service role key is never used by this app.

## Do this in Supabase

- Authentication, Sign In / Providers: turn **off** "Allow new users to sign up".
- Authentication, Policies: set a minimum password length of 12 and require mixed characters.
- Never paste the service role key, or the database password, into chat, code or `.env.local`.
- Keep the owner's email account secured with two-step verification: a reset link to that inbox is the key to the farm.

## Known issues and decisions

- **Next.js advisory.** `npm audit` reports advisories against Next.js 14 (denial of service in the image optimiser and in React Server Components request handling, request smuggling in rewrites) and a nested PostCSS. The fix is the major upgrade to Next 16, planned as a separate, tested migration rather than a patch. This app does not use remote images or rewrites, and does not process untrusted CSS. The public demo holds only invented data. Before the real farm goes live, upgrade and deploy behind the host's edge protections.
- **Sign-in brake on serverless hosts.** The counter in item 5 lives in one server's memory, so on a serverless host it is weaker than it reads. Supabase Auth's own limits apply on top. A shared store (for example Redis) is the fix.
- **Unsynced offline entries stay on the device after sign-out.** Staff should sync before signing out on a shared phone.
- **Demo deployment.** The demo shares a Supabase project with the real farm and is kept apart by Row Level Security: the demo owner is read-only, the demo accounts cannot change their own password, and visitor entries are deleted nightly. Use a separate deployment without the demo settings for the real farm.
- **Built:** two-step verification (TOTP) for owner accounts, and an append-only audit trail of changes (Team and audit).
