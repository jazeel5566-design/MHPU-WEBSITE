import { requireRole } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { AccountPasswordForm } from "@/components/account-password-form";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "CASEWORKER", "TREASURER"], "/admin/account");
  return (
    <div>
      <PageHeader title="My account" desc={`${user.name}${user.title ? ` · ${user.title}` : ""} · ${user.email} · ${ROLE_LABELS[user.role as Role]}`} />
      <Card><CardHeader title="Change password" /><div className="p-5"><AccountPasswordForm /></div></Card>
    </div>
  );
}
