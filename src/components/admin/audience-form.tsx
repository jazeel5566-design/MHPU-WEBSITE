"use client";
import { useActionState, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { saveAudience, type FState } from "@/app/actions/features";
import type { AudienceGroup } from "@/lib/audience";
import { Card, CardHeader, Notice } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

/** Admin → Pages & features: set each public page and tab to Everyone or Members only. */
export function AudienceForm({ groups, membersOnly }: { groups: AudienceGroup[]; membersOnly: string[] }) {
  const [state, action] = useActionState<FState, FormData>(saveAudience, {});
  const [members, setMembers] = useState(() => new Set(membersOnly));
  const set = (key: string, m: boolean) => setMembers((cur) => { const n = new Set(cur); if (m) n.add(key); else n.delete(key); return n; });

  return (
    <form action={action} className="space-y-6">
      {[...members].map((k) => <input key={k} type="hidden" name="members" value={k} />)}
      {state.error && <Notice tone="red">{state.error}</Notice>}
      {state.ok && <Notice>{state.message}</Notice>}
      {groups.map((g) => (
        <Card key={g.id}>
          <CardHeader title={g.title} desc={g.desc} />
          <ul className="divide-y divide-line">
            {g.items.map((i) => {
              const m = members.has(i.key);
              return (
                <li key={i.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{i.label}</div>
                    {i.desc && <div className="text-xs text-muted">{i.desc}</div>}
                  </div>
                  <div role="radiogroup" aria-label={`${i.label}: who can see it`} className="inline-flex shrink-0 rounded-full bg-sand-100 p-1 text-xs font-bold">
                    <button type="button" role="radio" aria-checked={!m} onClick={() => set(i.key, false)} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition", !m ? "bg-white text-brand-800 shadow" : "text-muted hover:text-ink")}><Globe className="size-3.5" /> Everyone</button>
                    <button type="button" role="radio" aria-checked={m} onClick={() => set(i.key, true)} className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition", m ? "bg-violet-600 text-white shadow" : "text-muted hover:text-ink")}><Lock className="size-3.5" /> Members only</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-4 shadow-lg backdrop-blur">
        <span className="text-sm text-muted">{members.size === 0 ? "Everything is public." : `${members.size} for members only.`} Members means active members and staff.</span>
        <SubmitButton>Save who can see it</SubmitButton>
      </div>
    </form>
  );
}
