import { LayoutDashboard, UserPlus, Users, LifeBuoy, Vote, Building2, ShieldCheck, Inbox, Settings, History, KeyRound, Images, Landmark, MessageSquareText, CreditCard, BarChart3 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { APPLICATION_APPROVERS } from "@/lib/constants";
import { db } from "@/lib/db";
import { PortalShell, portalSwitcher, type NavItem } from "@/components/portal-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "CASEWORKER", "TREASURER"], "/admin");
  const isAdmin = user.role === "ADMIN";
  const isTreasurer = user.role === "TREASURER";
  const canApprove = (APPLICATION_APPROVERS as readonly string[]).includes(user.role);
  const [apps, openCases, msgs] = await Promise.all([
    db.application.count({ where: { status: "PENDING" } }),
    db.case.count({ where: { status: "OPEN" } }),
    db.contactMessage.count({ where: { handled: false } }),
  ]);
  const finance: NavItem[] = isAdmin || isTreasurer ? [
    { href: "/admin/finance", label: "Financial reports", icon: BarChart3 },
    { href: "/admin/payments", label: "Online payments", icon: CreditCard },
  ] : [];
  const membership: NavItem[] = [
    ...(canApprove ? [{ href: "/admin/applications", label: "Applications", icon: UserPlus, badge: apps }] : []),
    { href: "/admin/members", label: "Members", icon: Users },
    ...(!isTreasurer ? [{ href: "/admin/cases", label: "Casework", icon: LifeBuoy, badge: openCases }] : []),
  ];
  const union: NavItem[] = isAdmin ? [
    { href: "/admin/elections", label: "Elections", icon: Landmark },
    { href: "/admin/ballots", label: "Ballots", icon: Vote },
    { href: "/admin/affiliates", label: "Workplace unions", icon: Building2 },
  ] : [];
  const system: NavItem[] = [
    ...(!isTreasurer ? [{ href: "/admin/messages", label: "Inbox", icon: Inbox, badge: msgs }] : []),
    ...(isAdmin ? [
      { href: "/admin/sms", label: "SMS", icon: MessageSquareText },
    ] : []),
    ...(isAdmin ? [
      { href: "/admin/users", label: "Staff & roles", icon: ShieldCheck },
      { href: "/admin/settings", label: "Site settings", icon: Settings },
      { href: "/admin/photos", label: "Site photos", icon: Images },
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
        ...(finance.length ? [{ title: "Finance", items: finance }] : []),
        ...(union.length ? [{ title: "Union", items: union }] : []),
        { title: "System", items: system },
      ]}>
      {children}
    </PortalShell>
  );
}
