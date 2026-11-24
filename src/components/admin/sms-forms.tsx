"use client";
import { useActionState, useState } from "react";
import { Send, Eye, BellRing } from "lucide-react";
import { previewSms, sendSmsBatch, previewReminders, sendRemindersNow, type SmsState } from "@/app/actions/sms";
import { Button, Field, Notice, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { smsSegments } from "@/lib/phone";

export function SmsComposer({ unions, events, testMode }: { unions: { id: string; name: string }[]; events: { id: string; title: string }[]; testMode: boolean }) {
  const [preview, previewAction] = useActionState<SmsState, FormData>(previewSms, {});
  const [sent, sendAction] = useActionState<SmsState, FormData>(sendSmsBatch, {});
  const [audience, setAudience] = useState("ALL");
  const [body, setBody] = useState("");
  const seg = smsSegments(body.replace(/\{\w+\}/g, "XXXXXXXX"));
  return (
    <form className="space-y-4">
      {sent.error && <Notice tone="red">{sent.error}</Notice>}
      {sent.ok && <Notice>{sent.message}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Send to">
          <Select name="audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
            <option value="ALL">All active members</option>
            <option value="OVERDUE">Members with dues overdue</option>
            {unions.length > 0 && <optgroup label="Workplace union">{unions.map((u) => <option key={u.id} value={`UNION:${u.id}`}>{u.name}</option>)}</optgroup>}
            {events.length > 0 && <optgroup label="People going to an event">{events.map((e) => <option key={e.id} value={`EVENT:${e.id}`}>{e.title}</option>)}</optgroup>}
            <option value="CUSTOM">Specific phone numbers…</option>
          </Select>
        </Field>
        {audience === "CUSTOM" && <Field label="Phone numbers" hint="Separate with commas or new lines"><Textarea name="custom" rows={2} placeholder="7771234, 9601234" /></Field>}
      </div>
      <Field label="Message" hint="Placeholders: {name} {membershipNo} {dueDate} {payLink} {hotline}">
        <Textarea name="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="MHPU: Dear {name}, …" />
      </Field>
      <p className="text-xs text-muted">{seg.chars} characters · about {seg.segments} SMS per recipient{seg.unicode ? " (Dhivehi/special characters use 70 per SMS)" : ""}</p>
      {preview.count !== undefined && (
        <Notice tone="brand">
          <strong>{preview.count}</strong> recipient{preview.count === 1 ? "" : "s"}{preview.invalid ? ` (${preview.invalid} skipped — no valid Maldivian mobile number)` : ""}.
          {preview.sample && <span className="mt-1 block text-xs">Example: “{preview.sample}”</span>}
        </Notice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button formAction={previewAction} variant="outline" type="submit"><Eye className="size-4" /> Preview recipients</Button>
        <SubmitButton formAction={sendAction} variant="coral" pendingText="Sending…" confirm={testMode ? "Test mode: messages will be logged, not sent. Continue?" : "Send this SMS now? This can't be undone and will be charged by your SMS provider."}>
          <Send className="size-4" /> {testMode ? "Send (test mode)" : "Send SMS"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function ReminderPanel() {
  const [prev, prevAction] = useActionState<SmsState, FormData>(previewReminders, {});
  const [run, runAction] = useActionState<SmsState, FormData>(sendRemindersNow, {});
  return (
    <form className="space-y-3">
      {prev.message && <Notice tone="brand">{prev.message}{prev.sample && <span className="mt-1 block text-xs">Example: “{prev.sample}”</span>}</Notice>}
      {run.error && <Notice tone="red">{run.error}</Notice>}
      {run.ok && <Notice>{run.message}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button formAction={prevAction} variant="outline" type="submit"><Eye className="size-4" /> Who would get one today?</Button>
        <SubmitButton formAction={runAction} variant="secondary" confirm="Send today's dues reminders now? (They also go out automatically every morning.)"><BellRing className="size-4" /> Send reminders now</SubmitButton>
      </div>
    </form>
  );
}
