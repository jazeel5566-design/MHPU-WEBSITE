import { LayoutDashboard, FileText, Megaphone, CalendarDays, FolderOpen, Images, PenSquare, ClipboardCheck, KeyRound } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PortalShell, portalSwitcher } from "@/components/portal-shell";

export default async function EditorialLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN", "EDITOR", "AUTHOR"], "/editorial");
  const pub = user.role !== "AUTHOR";
  const inReview = pub ? await db.post.count({ where: { status: "IN_REVIEW" } }) : 0;
  return (
    <PortalShell
      portal="editorial"
      user={user}
      switcher={portalSwitcher(user.role, "/editorial")}
      groups={[
        { items: [
          { href: "/editorial", label: "Overview", icon: LayoutDashboard, exact: true },
          { href: "/editorial/posts/new", label: "Write new article", icon: PenSquare, exact: true },
        ] },
        { title: "Content", items: [
          { href: "/editorial/posts", label: "Articles", icon: FileText, exact: true },
          ...(pub ? [
            { href: "/editorial/posts?status=IN_REVIEW", label: "Review queue", icon: ClipboardCheck, badge: inReview, exact: true },
            { href: "/editorial/campaigns", label: "Campaigns", icon: Megaphone },
            { href: "/editorial/events", label: "Events", icon: CalendarDays },
            { href: "/editorial/resources", label: "Documents", icon: FolderOpen },
          ] : []),
          { href: "/editorial/media", label: "Media library", icon: Images },
        ] },
        { title: "Account", items: [{ href: "/editorial/account", label: "My account", icon: KeyRound }] },
      ]}
    >
      {children}
    </PortalShell>
  );
}
