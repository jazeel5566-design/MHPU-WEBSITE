import { cn } from "@/lib/utils";

/** The official MHPU mark (extracted from the logo sheet; /public/brand/mhpu-mark.png). */
export function LogoMark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/mhpu-mark.png" alt="" aria-hidden="true" className={cn("h-10 w-auto", className)} />;
}

/**
 * Horizontal lockup: mark + two-line wordmark ("MALDIVES" light, "HEALTH" bold,
 * "PROFESSIONALS UNION" bold), matching the official logo typography.
 */
export function Logo({ className, light = false, sub, compact = false }: { className?: string; light?: boolean; sub?: string; compact?: boolean }) {
  const ink = light ? "text-white" : "text-[#434656]";
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={compact ? "h-9 sm:h-11" : "h-11"} />
      <span className={cn("font-[family-name:var(--font-wordmark)] uppercase leading-[0.95]", compact && "max-[399px]:sr-only", ink)}>
        <span className={cn("block tracking-[0.01em]", compact ? "text-[12.5px] sm:text-[15px]" : "text-[15px]")}><span className="font-light">Maldives</span> <span className="font-semibold">Health</span></span>
        <span className={cn("block font-semibold tracking-[0.01em]", compact ? "text-[12.5px] sm:text-[15px]" : "text-[15px]")}>Professionals Union</span>
        {sub && <span className={cn("mt-1 block font-sans text-[10px] font-semibold normal-case tracking-normal", compact && "hidden sm:block", light ? "text-brand-200" : "text-brand-600")}>{sub}</span>}
      </span>
    </span>
  );
}
