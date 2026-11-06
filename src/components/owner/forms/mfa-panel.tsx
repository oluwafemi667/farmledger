"use client";

import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button, Input, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; status: string };
type Enrolment = { id: string; qr: string; secret: string };

/** Turn two-step sign-in on or off for the signed-in account, using any authenticator app. */
export function MfaPanel() {
  const [factor, setFactor] = useState<Factor | null | undefined>(undefined);
  const [enrol, setEnrol] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactor(data?.totp.find((f) => f.status === "verified") ?? null);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function start() {
    setBusy(true); setError(null);
    const sb = createClient();
    // Clear any half-finished set-up so the list stays clean.
    const { data: existing } = await sb.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: e } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `FarmLedger ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (e || !data) return setError("Could not start set-up. Try again in a moment.");
    setEnrol({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm() {
    if (!enrol) return;
    setBusy(true); setError(null);
    const { error: e } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrol.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (e) return setError("That code is not right. Use the newest code in the app.");
    setEnrol(null); setCode(""); await load();
  }

  async function turnOff() {
    if (!factor) return;
    setBusy(true); setError(null);
    const { error: e } = await createClient().auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false); setConfirmOff(false);
    if (e) return setError("Could not turn it off. Confirm with a fresh code by signing in again, then retry.");
    await load();
  }

  if (factor === undefined) return <p className="text-stone-600">Checking...</p>;

  return (
    <div className="flex max-w-xl flex-col gap-4">
      {factor && !enrol ? (
        <>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-signal-400" aria-hidden />
            <p className="font-medium">Two-step sign-in is on. A code from your phone is needed after your password.</p>
          </div>
          {confirmOff ? (
            <Notice tone="attention" title="Turn two-step sign-in off?" action={<div className="flex gap-2"><Button variant="danger" loading={busy} onClick={() => void turnOff()}>Turn off</Button><Button variant="secondary" onClick={() => setConfirmOff(false)}>Keep it on</Button></div>}>
              Your account will be protected by the password alone.
            </Notice>
          ) : <div><Button variant="secondary" onClick={() => setConfirmOff(true)}>Turn off</Button></div>}
        </>
      ) : null}

      {!factor && !enrol ? (
        <>
          <p className="text-stone-700">Add a second lock. After your password you will type a 6 digit code from an app such as Google Authenticator, Microsoft Authenticator or Authy. Strongly recommended for the owner account, because it can see all the money.</p>
          <div><Button loading={busy} onClick={() => void start()}>Set up two-step sign-in</Button></div>
        </>
      ) : null}

      {enrol ? (
        <div className="flex flex-col gap-4">
          <ol className="list-decimal space-y-2 pl-5 text-stone-800">
            <li>Open your authenticator app and choose to add an account.</li>
            <li>Scan this picture. If you cannot scan, type the key below it.</li>
            <li>Type the 6 digit code the app now shows, then press Confirm.</li>
          </ol>
          {/* The QR is a data URI from Supabase; it is an SVG, so a plain img is right. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrol.qr} alt="QR code to add FarmLedger to your authenticator app" className="h-44 w-44 rounded-md bg-white p-2" />
          <p className="break-all font-mono text-sm text-stone-700">Key: {enrol.secret}</p>
          <Input label="6 digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="flex gap-2">
            <Button loading={busy} onClick={() => void confirm()}>Confirm</Button>
            <Button variant="secondary" onClick={() => { setEnrol(null); setCode(""); }}>Cancel</Button>
          </div>
        </div>
      ) : null}
      {error ? <Notice tone="danger" title={error} /> : null}
    </div>
  );
}
