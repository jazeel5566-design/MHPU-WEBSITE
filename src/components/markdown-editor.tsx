"use client";
import { useRef, useState } from "react";
import { marked } from "marked";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Quote, Image as ImageIcon, Eye, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = { icon: React.ElementType; label: string; wrap?: [string, string]; line?: string };
const TOOLS: Tool[] = [
  { icon: Heading2, label: "Heading", line: "## " },
  { icon: Bold, label: "Bold", wrap: ["**", "**"] },
  { icon: Italic, label: "Italic", wrap: ["_", "_"] },
  { icon: Link2, label: "Link", wrap: ["[", "](https://)"] },
  { icon: List, label: "Bulleted list", line: "- " },
  { icon: ListOrdered, label: "Numbered list", line: "1. " },
  { icon: Quote, label: "Quote", line: "> " },
  { icon: ImageIcon, label: "Image", wrap: ["![description](", ")"] },
];

/**
 * Friendly writing surface for the editorial team: toolbar buttons insert
 * Markdown so writers never need to learn the syntax, and Preview shows the
 * published look.
 */
export function MarkdownEditor({ name, defaultValue = "", rtl = false, placeholder, minRows = 18 }: {
  name: string; defaultValue?: string; rtl?: boolean; placeholder?: string; minRows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);

  function apply(tool: Tool) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e);
    let next: string;
    let caret: number;
    if (tool.wrap) {
      next = value.slice(0, s) + tool.wrap[0] + sel + tool.wrap[1] + value.slice(e);
      caret = s + tool.wrap[0].length + sel.length;
    } else {
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      next = value.slice(0, lineStart) + tool.line + value.slice(lineStart);
      caret = e + (tool.line?.length ?? 0);
    }
    setValue(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(caret, caret); });
  }

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-sand-50 px-2 py-1.5">
        <div className="flex rounded-lg bg-white p-0.5 ring-1 ring-line">
          {(["write", "preview"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold capitalize", tab === t ? "bg-brand-700 text-white" : "text-muted hover:text-ink")}>
              {t === "write" ? <PencilLine className="size-3.5" /> : <Eye className="size-3.5" />} {t}
            </button>
          ))}
        </div>
        {tab === "write" && (
          <div className="ms-1 flex flex-wrap gap-0.5">
            {TOOLS.map((tool) => (
              <button key={tool.label} type="button" title={tool.label} aria-label={tool.label} onClick={() => apply(tool)}
                className="grid size-8 place-items-center rounded-md text-muted hover:bg-white hover:text-ink">
                <tool.icon className="size-4" />
              </button>
            ))}
          </div>
        )}
        <span className="ms-auto pe-2 text-xs text-muted">{words} words · ~{Math.max(1, Math.round(words / 220))} min read</span>
      </div>
      <textarea
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        dir={rtl ? "rtl" : "ltr"}
        rows={minRows}
        placeholder={placeholder}
        className={cn("block w-full resize-y px-4 py-3 font-mono text-sm leading-relaxed focus:outline-none", rtl && "dv-text font-normal", tab !== "write" && "hidden")}
      />
      {tab === "preview" && (
        <div
          dir={rtl ? "rtl" : "ltr"}
          className={cn("prose-mhpu min-h-64 px-5 py-4", rtl && "dv-text")}
          dangerouslySetInnerHTML={{ __html: value ? (marked.parse(value.replace(/<(?=[a-zA-Z!/])/g, "&lt;"), { async: false }) as string) : "<p style='color:#5b6b73'>Nothing to preview yet.</p>" }}
        />
      )}
    </div>
  );
}
