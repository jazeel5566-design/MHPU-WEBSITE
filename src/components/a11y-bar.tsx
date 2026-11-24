"use client";
import { useEffect, useState } from "react";
import { Contrast, Type } from "lucide-react";

const SIZES = ["base", "lg", "xl"] as const;

/** Text-size and high-contrast controls (inspired by PSI's accessibility toolbar). */
export function A11yControls() {
  const [size, setSize] = useState<(typeof SIZES)[number]>("base");
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    try {
      setSize((localStorage.getItem("mhpu-text") as (typeof SIZES)[number]) || "base");
      setContrast(localStorage.getItem("mhpu-contrast") === "high");
    } catch {}
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.text = size;
    html.dataset.contrast = contrast ? "high" : "normal";
    try {
      localStorage.setItem("mhpu-text", size);
      localStorage.setItem("mhpu-contrast", contrast ? "high" : "normal");
    } catch {}
  }, [size, contrast]);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setSize(SIZES[(SIZES.indexOf(size) + 1) % SIZES.length])}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/10"
        aria-label={`Text size: ${size}. Click to change`}
      >
        <Type className="size-3.5" /> <span className="hidden sm:inline">Text {size === "base" ? "A" : size === "lg" ? "A+" : "A++"}</span>
      </button>
      <button
        type="button"
        onClick={() => setContrast(!contrast)}
        aria-pressed={contrast}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/10"
      >
        <Contrast className="size-3.5" /> <span className="hidden sm:inline">Contrast</span>
      </button>
    </div>
  );
}

/** Inline script run before paint so the saved preferences don't flash. */
export const a11yBootScript = `try{var d=document.documentElement;d.dataset.text=localStorage.getItem('mhpu-text')||'base';d.dataset.contrast=localStorage.getItem('mhpu-contrast')||'normal'}catch(e){}`;
