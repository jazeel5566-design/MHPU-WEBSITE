"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";
import { Field, Input, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { useT } from "@/components/lang-provider";

export function LoginForm({ next }: { next?: string }) {
  const T = useT();
  const [state, action] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="red">{state.error}</Notice>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={T("Email or membership number")}><Input name="email" required autoComplete="username" placeholder={T("you@example.com or MHPU-0123")} /></Field>
      <Field label={T("Password")}>
        <div className="relative">
          <Input name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="pe-11" />
          <button type="button" onClick={() => setShow(!show)} className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink" aria-label={T(show ? "Hide password" : "Show password")}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText={T("Signing in…")}>{T("Sign in")}</SubmitButton>
    </form>
  );
}
