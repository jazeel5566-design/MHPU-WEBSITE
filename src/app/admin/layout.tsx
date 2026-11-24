import { LayoutDashboard, UserPlus, Users, LifeBuoy, Vote, Building2, ShieldCheck, Inbox, Settings, History, KeyRound } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PortalShell, portalSwitcher, type NavItem } from "@/components/portal-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN", "CASEWORKER"], "/admin");
  const isAdmin = user.role === "ADMIN";
  const [apps, openCases, msgs] = await Promise.all([
    db.application.count({ where: { status: "PENDING" } }),
    db.case.count({ where: { status: "OPEN" } }),
    db.contactMessage.count({ where: { handled: false } }),
  ]);
  const membership: NavItem[] = [
    ...(isAdmin ? [{ href: "/admin/applications", label: "Applications", icon: UserPlus, badge: apps }] : []),
    { href: "/admin/members", label: "Members", icon: Users },
    { href: "/admin/cases", label: "Casework", icon: LifeBuoy, badge: openCases },
  ];
  const union: NavItem[] = isAdmin ? [
    { href: "/admin/ballots", label: "Ballots", icon: Vote },
    { href: "/admin/affiliates", label: "Affiliated unions", icon: Building2 },
  ] : [];
  const system: NavItem[] = [
    { href: "/admin/messages", label: "Inbox", icon: Inbox, badge: msgs },
    ...(isAdmin ? [
      { href: "/admin/users", label: "Staff & roles", icon: ShieldCheck },
      { href: "/admin/settings", label: "Site settings", icon: Settings },
      { href: "/admin/audit", label: "Audit log", icon: History },
    ] : []),
    { href: "/admin/account", label: "My account", icon: KeyRound },
  ];
  const switcher = portalSwitcher(user.role, "/admin").filter((s) => s.href !== "/members" || !!user.member);
  return (
    <PortalShell portal="admin" user={user} switcher={switcher}
      groups={[
        { items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
        { title: "Membership", items: membership },
        ...(union.length ? [{ title: "Union", items: union }] : []),
        { title: "System", items: system },
      ]}>
      {children}
    </PortalShell>
  );
}
