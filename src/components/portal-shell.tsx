import Link from "next/link";
import { LogOut, ExternalLink } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui";
import { NavLink } from "@/components/nav-link";
import { MobileNav } from "@/components/mobile-nav";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { features } from "@/lib/features-server";

export type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean; badge?: number };
export type NavGroup = { title?: string; items: NavItem[] };

const ACCENT = {
  members: { bar: "bg-brand-700", label: "Member portal" },
  editorial: { bar: "bg-violet-600", label: "Editorial portal" },
  admin: { bar: "bg-coral-500", label: "Admin portal" },
};

export async function PortalShell({ portal, groups: allGroups, user, children, switcher }: {
  portal: keyof typeof ACCENT;
  groups: NavGroup[];
  user: { name: string; role: string; email: string; title?: string | null };
  children: React.ReactNode;
  switcher?: { href: string; label: string }[];
}) {
  const a = ACCENT[portal];
  // Hide tabs the admin has switched off (Admin → Pages & features).
  const f = await features();
  const groups = allGroups.map((g) => ({ ...g, items: g.items.filter((i) => f.path(i.href)) })).filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);
  return (
    <div className="min-h-screen bg-sand-50/60">
      <div className={`h-1 ${a.bar}`} />
      {/* Sidebar */}
      <aside className="fixed inset-y-0 start-0 top-1 z-30 hidden w-64 flex-col border-e border-line bg-white lg:flex print:!hidden">
        <div className="border-b border-line px-5 py-4">
          <Link href="/"><Logo sub={a.label} /></Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={a.label}>
          {groups.map((g, i) => (
            <div key={i} className="mb-5">
              {g.title && <div className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">{g.title}</div>}
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <li key={item.href}>
                    <NavLink href={item.href} exact={item.exact}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition"
                      activeClassName="bg-brand-50 text-brand-800" inactiveClassName="text-ink/75 hover:bg-sand-50 hover:text-ink">
                      <item.icon className="size-[18px]" />
                      <span className="flex-1">{item.label}</span>
                      {!!item.badge && <span className="rounded-full bg-coral-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {switcher && switcher.length > 0 && (
          <div className="border-t border-line px-3 py-3">
            <div className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-muted">Switch portal</div>
            {switcher.map((s) => (
              <Link key={s.href} href={s.href} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-sand-50 hover:text-ink">{s.label}<ExternalLink className="size-3.5" /></Link>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 border-t border-line p-4">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-xs text-muted" title={ROLE_LABELS[user.role as Role] ?? user.role}>{user.title || ROLE_LABELS[user.role as Role] || user.role}</div>
          </div>
          <form action={logout}>
            <button className="grid size-9 place-items-center rounded-lg text-muted hover:bg-sand-100 hover:text-ink" aria-label="Sign out" title="Sign out"><LogOut className="size-4" /></button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden print:hidden">
        <Link href="/"><Logo sub={a.label} /></Link>
        <MobileNav
          items={[...flat.map((i) => ({ href: i.href, label: i.label })), ...(switcher ?? [])]}
          footer={<form action={logout}><button className="flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-sm font-semibold"><LogOut className="size-4" /> Sign out ({user.name})</button></form>}
        />
      </header>

      <main id="main" className="lg:ps-64 print:!ps-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

export function portalSwitcher(role: string, current: string) {
  const all = [
    { href: "/admin", label: "Admin", roles: ["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "CASEWORKER", "TREASURER"] },
    { href: "/editorial", label: "Editorial", roles: ["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR", "AUTHOR"] },
    { href: "/members", label: "Members", roles: ["ADMIN", "MEMBER"] },
    { href: "/", label: "Public website", roles: ["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "TREASURER", "EDITOR", "AUTHOR", "CASEWORKER", "MEMBER"] },
  ];
  return all.filter((p) => p.roles.includes(role) && p.href !== current).map(({ href, label }) => ({ href, label }));
}
