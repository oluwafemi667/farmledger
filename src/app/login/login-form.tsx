"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Input, Notice } from "@/components/ui";
import { cancelTwoStep, signIn, verifyCode, type LoginState } from "./actions";

function SubmitButton({ label = "Sign in", pendingLabel = "Signing in" }: { label?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block loading={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function CodeStep({ initial }: { initial: LoginState }) {
  const [state, action] = useFormState<LoginState, FormData>(verifyCode, initial);
  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-5" noValidate>
        {state.error ? <Notice tone="danger" title={state.error} /> : null}
        <input type="hidden" name="factorId" value={state.factorId ?? initial.factorId ?? ""} />
        <Input name="code" label="6 digit code" hint="Open your authenticator app and read the code for FarmLedger." inputMode="numeric" autoComplete="one-time-code" maxLength={7} fieldSize="lg" autoFocus required />
        <SubmitButton label="Verify" pendingLabel="Checking" />
      </form>
      <form action={cancelTwoStep}><button className="min-h-11 text-sm font-medium text-forest-800 underline-offset-4 hover:underline">Use a different account</button></form>
    </div>
  );
}

export function LoginForm() {
  const [state, action] = useFormState<LoginState, FormData>(signIn, {});
  if (state.factorId) return <CodeStep initial={{ factorId: state.factorId }} />;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error ? <Notice tone="danger" title={state.error} /> : null}
      <Input
        name="email"
        type="email"
        label="Email"
        autoComplete="username"
        inputMode="email"
        fieldSize="lg"
        error={state.fieldErrors?.email}
        required
      />
      <Input
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        fieldSize="lg"
        error={state.fieldErrors?.password}
        required
      />
      <SubmitButton />
    </form>
  );
}
