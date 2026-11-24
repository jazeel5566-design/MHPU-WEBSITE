"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/**
 * Draw-to-sign pad (mouse, finger or stylus via Pointer Events).
 * Writes a PNG data URL into a hidden input named `name` so it submits with the form.
 */
export function SignaturePad({ name, onChange }: { name: string; onChange?: (signed: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [value, setValue] = useState("");
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const dirty = useRef(false);

  function setup() {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#2c2d42";
  }

  useEffect(() => {
    setup();
    const onResize = () => { if (!dirty.current) setup(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function down(e: React.PointerEvent) {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = "#2c2d42";
    ctx.fill();
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const p = point(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    dirty.current = true;
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) {
      setValue(canvasRef.current!.toDataURL("image/png"));
      onChange?.(true);
    }
  }
  function clear() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    setValue("");
    onChange?.(false);
  }

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-sand-200 bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Signature pad: draw your signature"
          role="img"
          className="block h-40 w-full cursor-crosshair touch-none rounded-xl"
        />
        {!value && <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-400">Sign here with your finger or mouse</span>}
        <span className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-sand-200" />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted">This counts as your signature on the declaration above.</span>
        <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-muted ring-1 ring-line hover:text-ink">
          <Eraser className="size-3.5" /> Clear
        </button>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
