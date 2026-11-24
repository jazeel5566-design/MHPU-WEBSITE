"use client";
import { useActionState, useState } from "react";
import { saveFeatures, type FState } from "@/app/actions/features";
import type { FeatureGroup } from "@/lib/features";
import { Card, CardHeader, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

export function FeaturesForm({ groups, disabled }: { groups: FeatureGroup[]; disabled: string[] }) {
  const [state, action] = useActionState<FState, FormData>(saveFeatures, {});
  const [off, setOff] = useState(() => new Set(disabled));
  const toggle = (key: string, on: boolean) => setOff((cur) => { const n = new Set(cur); if (on) n.delete(key); else n.add(key); return n; });
  const setGroup = (g: FeatureGroup, on: boolean) => setOff((cur) => { const n = new Set(cur); g.items.forEach((i) => (on ? n.delete(i.key) : n.add(i.key))); return n; });
  const label = (key: string) => groups.flatMap((g) => g.items).find((i) => i.key === key)?.label ?? key;

  return (
    <form action={action} className="space-y-6">
      {[...off].map((k) => <input key={k} type="hidden" name="off" value={k} />)}
      {state.error && <Notice tone="red">{state.error}</Notice>}
      {state.ok && <Notice>{state.message}</Notice>}

      {groups.map((g) => {
        const onCount = g.items.filter((i) => !off.has(i.key)).length;
        return (
          <Card key={g.id}>
            <CardHeader title={g.title} desc={`${g.desc ? g.desc + " " : ""}${onCount} of ${g.items.length} on.`}
              action={<span className="flex gap-1 text-xs font-semibold">
                <button type="button" onClick={() => setGroup(g, true)} className="rounded-lg px-2 py-1 text-brand-700 hover:bg-brand-50">All on</button>
                <button type="button" onClick={() => setGroup(g, false)} className="rounded-lg px-2 py-1 text-red-600 hover:bg-red-50">All off</button>
              </span>} />
            <ul className="divide-y divide-line">
              {g.items.map((i) => {
                const on = !off.has(i.key);
                const blockedBy = (i.needs ?? []).filter((k) => off.has(k));
                return (
                  <li key={i.key} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <div className={cn("font-semibold", !on && "text-muted line-through decoration-1")}>{i.label}</div>
                      {i.desc && <div className="text-xs text-muted">{i.desc}</div>}
                      {on && blockedBy.length > 0 && <div className="text-xs font-medium text-amber-700">Hidden while “{blockedBy.map(label).join("”, “")}” is off</div>}
                      {i.paths && <div className="font-mono text-[11px] text-muted">{i.paths.filter((p) => !p.startsWith("/api")).map((p) => p.replace(/^=/, "")).join(" · ")}</div>}
                    </div>
                    <label className="relative inline-flex shrink-0 cursor-pointer items-center gap-2">
                      <span className={cn("text-xs font-bold", on ? "text-emerald-700" : "text-muted")}>{on ? "On" : "Off"}</span>
                      <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => toggle(i.key, e.target.checked)} aria-label={`${i.label}: ${on ? "on" : "off"}`} />
                      <span className={cn("relative h-6 w-11 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500", on ? "bg-emerald-600" : "bg-slate-300")}>
                        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "start-[22px]" : "start-0.5")} />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-4 shadow-lg backdrop-blur">
        <span className="text-sm text-muted">{off.size === 0 ? "Everything is on." : `${off.size} switched off.`} Changes apply within a few seconds of saving.</span>
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </form>
  );
}
