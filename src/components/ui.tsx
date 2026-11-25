import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "coral" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm",
  coral: "bg-coral-500 text-white hover:bg-coral-600 shadow-sm",
  secondary: "bg-brand-50 text-brand-800 hover:bg-brand-100",
  outline: "border border-line bg-white text-ink hover:border-brand-400 hover:text-brand-700",
  ghost: "text-ink hover:bg-sand-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const sizes: Record<Size, string> = {
  sm: "min-h-8 py-1 px-3 text-sm gap-1.5",
  md: "min-h-10 py-1.5 px-4 text-sm gap-2",
  lg: "min-h-12 py-2 px-6 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none max-w-full text-center leading-tight sm:whitespace-nowrap",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant, size, className, ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant, size, className, ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-w-0 rounded-2xl border border-line bg-white", className)} {...props} />;
}

export function CardHeader({ title, action, desc }: { title: ReactNode; action?: ReactNode; desc?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-5 py-4">
      <div>
        <h2 className="font-semibold text-ink">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

const tones = {
  gray: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  coral: "bg-coral-50 text-coral-700",
  blue: "bg-sky-50 text-sky-800",
  violet: "bg-violet-50 text-violet-800",
};
export type Tone = keyof typeof tones;

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "gray", IN_REVIEW: "amber", SCHEDULED: "blue", PUBLISHED: "green", ARCHIVED: "gray",
  PENDING: "amber", APPROVED: "green", REJECTED: "red",
  ACTIVE: "green", LAPSED: "amber", SUSPENDED: "red", RESIGNED: "gray",
  OPEN: "coral", IN_PROGRESS: "blue", AWAITING_MEMBER: "amber", RESOLVED: "green", CLOSED: "gray",
  WON: "violet", URGENT: "red", HIGH: "coral", NORMAL: "gray", LOW: "gray",
  PUBLIC: "brand", MEMBERS: "violet",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "gray"}>{status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Badge>;
}

const fieldBase =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 transition";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-28", className)} {...props} />;
}
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(fieldBase, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b6b73%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pe-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className, required }: { label: string; hint?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink">
        {label} {required && <span className="text-coral-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-ink">
      <input type="checkbox" className="mt-0.5 size-4 rounded border-line accent-brand-700" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function PageHeader({ title, desc, actions, kicker }: { title: ReactNode; desc?: ReactNode; actions?: ReactNode; kicker?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600">{kicker}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-sm text-muted">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, icon, tone = "brand" }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: "brand" | "coral" | "amber" | "violet" }) {
  const ring = { brand: "bg-brand-50 text-brand-700", coral: "bg-coral-50 text-coral-600", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        {icon && <span className={cn("grid size-9 place-items-center rounded-xl", ring)}>{icon}</span>}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function EmptyState({ title, desc, action, icon }: { title: string; desc?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-sand-50/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-brand-500">{icon}</div>}
      <div className="font-semibold text-ink">{title}</div>
      {desc && <p className="mt-1 max-w-sm text-sm text-muted">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "green", children }: { tone?: "green" | "red" | "amber" | "brand"; children: ReactNode }) {
  const c = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    brand: "border-brand-200 bg-brand-50 text-brand-900",
  }[tone];
  return <div role="status" className={cn("rounded-xl border px-4 py-3 text-sm", c)}>{children}</div>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("border-b border-line bg-sand-50 px-4 py-2.5 text-start text-xs font-semibold uppercase tracking-wide text-muted", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line px-4 py-3 align-middle", className)}>{children}</td>;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800", className)}>
      {initials}
    </span>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-coral-500 to-coral-400" style={{ width: `${pct}%` }} />
    </div>
  );
}
