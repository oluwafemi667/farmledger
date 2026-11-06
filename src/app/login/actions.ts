"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { FailureLimiter } from "@/lib/security/rate-limit";

// Five wrong passwords for one account from one place, or twenty from one place
// for any accounts, pauses sign-in for fifteen minutes.
const perAccount = new FailureLimiter({ max: 5, windowMs: 15 * 60_000 });
const perAddress = new FailureLimiter({ max: 20, windowMs: 15 * 60_000 });

export interface LoginState {
  error?: string;
  /** Set when the password was right and a code from the authenticator app is the next step. */
  factorId?: string;
  fieldErrors?: { email?: string; password?: string };
}

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: { email: flat.email?.[0], password: flat.password?.[0] },
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      error:
        "This app is not connected to a database yet. Add the Supabase settings in .env.local.",
    };
  }

  const forwarded = headers().get("x-forwarded-for") ?? "";
  const address = forwarded.split(",")[0].trim() || "unknown";
  const accountKey = `${address}|${parsed.data.email.toLowerCase()}`;
  const a = perAccount.check(accountKey);
  const b = perAddress.check(address);
  if (a.blocked || b.blocked) {
    const minutes = Math.max(1, Math.ceil(Math.max(a.retryAfterSec, b.retryAfterSec) / 60));
    return { error: `Too many failed attempts. Wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.` };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const unreachable =
      error.name === "AuthRetryableFetchError" ||
      error.status === 0 ||
      (typeof error.status === "number" && error.status >= 500);
    if (!unreachable) {
      perAccount.fail(accountKey);
      perAddress.fail(address);
    }
    return {
      error: unreachable
        ? "Could not reach the server. Check your connection and try again."
        : // One message for wrong email and wrong password, so accounts cannot be probed.
          "Incorrect email or password.",
    };
  }

  perAccount.clear(accountKey);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (factor) return { factorId: factor.id };
  }
  redirect("/");
}

const codeLimiter = new FailureLimiter({ max: 5, windowMs: 10 * 60_000 });

/** Second step: check the six-digit code. The session stays at password level until this passes. */
export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!factorId) return { error: "Start again from the password step." };
  if (!/^\d{6}$/.test(code)) return { factorId, error: "Enter the 6 digit code from your authenticator app." };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your sign-in expired. Start again." };

  const gate = codeLimiter.check(user.id);
  if (gate.blocked) {
    const m = Math.max(1, Math.ceil(gate.retryAfterSec / 60));
    return { factorId, error: `Too many wrong codes. Wait about ${m} minute${m === 1 ? "" : "s"}.` };
  }
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    codeLimiter.fail(user.id);
    return { factorId, error: "That code is not right. Codes change every 30 seconds, so try the newest one." };
  }
  codeLimiter.clear(user.id);
  redirect("/");
}

export async function cancelTwoStep(): Promise<void> {
  await createClient().auth.signOut();
  redirect("/login");
}
