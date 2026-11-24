import { LayoutDashboard, IdCard, UserRound, LifeBuoy, FileText, CalendarDays, Vote, Wallet, Newspaper, Landmark } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { PortalShell, portalSwitcher } from "@/components/portal-shell";

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const { user, member } = await requireMember();
  const now = new Date();
  const [openBallots, awaiting, openElections] = await Promise.all([
    db.ballot.count({ where: { opensAt: { lte: now }, closesAt: { gte: now }, voters: { none: { memberId: member.id } } } }),
    db.case.count({ where: { memberId: member.id, status: "AWAITING_MEMBER" } }),
    db.election.count({ where: { opensAt: { lte: now }, closesAt: { gte: now }, OR: [{ affiliateId: null }, ...(member.affiliateId ? [{ affiliateId: member.affiliateId }] : [])], voters: { none: { memberId: member.id } } } }),
  ]);
  return (
    <PortalShell
      portal="members"
      user={user}
      switcher={portalSwitcher(user.role, "/members")}
      groups={[
        { items: [
          { href: "/members", label: "Dashboard", icon: LayoutDashboard, exact: true },
          { href: "/members/card", label: "Membership card", icon: IdCard },
          { href: "/members/help", label: "My cases", icon: LifeBuoy, badge: awaiting },
        ] },
        { title: "Union", items: [
          { href: "/members/news", label: "Member notices", icon: Newspaper },
          { href: "/members/elections", label: "Elections", icon: Landmark, badge: openElections },
          { href: "/members/ballots", label: "Ballots & votes", icon: Vote, badge: openBallots },
          { href: "/members/events", label: "Events & CPD", icon: CalendarDays },
          { href: "/members/documents", label: "Documents", icon: FileText },
        ] },
        { title: "Account", items: [
          { href: "/members/dues", label: "Dues & payments", icon: Wallet },
          { href: "/members/profile", label: "Profile & security", icon: UserRound },
        ] },
      ]}
    >
      {children}
    </PortalShell>
  );
}
