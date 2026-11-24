"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children, exact, className, activeClassName, inactiveClassName }: {
  href: string; children: React.ReactNode; exact?: boolean; className?: string; activeClassName?: string; inactiveClassName?: string;
}) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(className, active ? activeClassName : inactiveClassName)}>
      {children}
    </Link>
  );
}
