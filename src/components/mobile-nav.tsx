"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/lang-provider";

export function MobileNav({ items, footer }: { items: { href: string; label: string }[]; footer?: React.ReactNode }) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-sand-100" aria-label={T("Open menu")}>
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 end-0 flex w-[85%] max-w-sm flex-col bg-white p-5 shadow-2xl animate-fade-up">
            <div className="flex justify-end">
              <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-sand-100" aria-label={T("Close menu")}>
                <X className="size-5" />
              </button>
            </div>
            <ul className="mt-2 flex-1 space-y-1 overflow-y-auto">
              {items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    className={cn(
                      "block rounded-xl px-4 py-3 text-base font-semibold",
                      path === i.href || (i.href !== "/" && path.startsWith(i.href)) ? "bg-brand-50 text-brand-800" : "text-ink hover:bg-sand-50",
                    )}
                  >
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
            {footer && <div className="border-t border-line pt-4">{footer}</div>}
          </nav>
        </div>
      )}
    </div>
  );
}
