"use client";
import { useActionState, useEffect, useRef } from "react";
import { changeOwnPassword, type PwState } from "@/app/actions/auth";
import { Field, Input, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MIN_STAFF_PASSWORD_LENGTH as MIN_PASSWORD_LENGTH } from "@/lib/constants";

export function AccountPasswordForm() {
  const [state, action] = useActionState<PwState, FormData>(changeOwnPassword, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="max-w-md space-y-4">
      {state.error && <Notice tone="red">{state.error}</Notice>}
      {state.ok && <Notice>Password changed.</Notice>}
      <Field label="Current password"><Input name="current" type="password" required autoComplete="current-password" /></Field>
      <Field label="New password" hint={`At least ${MIN_PASSWORD_LENGTH} characters. Longer is safer — a short phrase is easy to remember.`}><Input name="next" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" /></Field>
      <Field label="Confirm new password"><Input name="confirm" type="password" required autoComplete="new-password" /></Field>
      <SubmitButton>Change password</SubmitButton>
    </form>
  );
}
