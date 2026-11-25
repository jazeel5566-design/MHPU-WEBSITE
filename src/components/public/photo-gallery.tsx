"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Photo grid; tap a photo to view it full screen (arrows / swipe / Esc). */
export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open !== null && !el.open) el.showModal();
    if (open === null && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(document.dir === "rtl" ? -1 : 1);
      if (e.key === "ArrowLeft") go(document.dir === "rtl" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {photos.map((src, i) => (
          <li key={src} className="mb-4 break-inside-avoid">
            <button type="button" onClick={() => setOpen(i)} className="block w-full overflow-hidden rounded-2xl bg-sand-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300" aria-label={`Open photo ${i + 1} of ${photos.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title}, photo ${i + 1}`} loading={i < 3 ? "eager" : "lazy"} className="w-full transition duration-300 hover:scale-[1.02]" />
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialog} onClose={() => setOpen(null)} onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (touchX.current === null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); touchX.current = null; }}>
        {open !== null && (
          <div className="flex h-full flex-col" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-semibold">{open + 1} / {photos.length}</span>
              <button type="button" onClick={() => setOpen(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close"><X className="size-6" /></button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[open]} alt={`${title}, photo ${open + 1}`} className="max-h-full max-w-full rounded-lg object-contain" />
              {photos.length > 1 && <>
                <button type="button" onClick={() => go(-1)} className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20" aria-label="Previous photo"><ChevronLeft className="size-6 rtl:rotate-180" /></button>
                <button type="button" onClick={() => go(1)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20" aria-label="Next photo"><ChevronRight className="size-6 rtl:rotate-180" /></button>
              </>}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
