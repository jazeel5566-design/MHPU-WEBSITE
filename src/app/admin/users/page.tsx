import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { updateStaff } from "@/app/actions/admin";
import { ROLE_LABELS, ROLES } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { Card, CardHeader, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui";
import { StaffForm } from "@/components/admin/forms";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function UsersAdmin() {
  const me = await requireRole(["ADMIN"], "/admin");
  const staff = await db.user.findMany({ where: { role: { not: "MEMBER" } }, orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <div className="space-y-6">
      <PageHeader title="Staff & roles" desc="Who can access the admin and editorial portals." />
      <Card>
        <CardHeader title="What each role can do" />
        <div className="grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[["Administrator", "Everything: members, applications, dues, ballots, settings, staff and all editorial."], ["Editor", "Review, publish and schedule articles; manage campaigns, events, documents and media."], ["Author", "Write drafts and submit them for review. Cannot publish."], ["Caseworker", "Handle member cases and view member records (read-only)."]].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-sand-50 p-4"><div className="font-bold">{t}</div><div className="mt-1 text-muted">{d}</div></div>
          ))}
        </div>
      </Card>
      <Card><CardHeader title="Add a staff account" /><div className="p-5"><StaffForm /></div></Card>
      <Card>
        <Table>
          <thead><tr><Th>Name</Th><Th>Title, role & access</Th><Th>Last login</Th></tr></thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id}>
                <Td><div className="font-semibold">{u.name}</div><div className="text-xs text-muted">{u.email}</div>{u.title && <div className="mt-0.5 text-xs font-semibold text-brand-700">{u.title}</div>}</Td>
                <Td>
                  {u.id === me.id ? (
                    <form action={updateStaff} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <span className="text-sm text-muted">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]} (you)</span>
                      <Input name="title" defaultValue={u.title ?? ""} placeholder="Title, e.g. President" className="h-9 w-48 py-1.5" aria-label="Title / position" />
                      <SubmitButton size="sm" variant="outline">Save</SubmitButton>
                    </form>
                  ) : (
                    <form action={updateStaff} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <Input name="title" defaultValue={u.title ?? ""} placeholder="Title, e.g. Treasurer" className="h-9 w-44 py-1.5" aria-label="Title / position" />
                      <Select name="role" defaultValue={u.role} className="h-9 w-auto py-1.5">{ROLES.filter((r) => r !== "MEMBER").map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select>
                      <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="active" defaultChecked={u.active} className="accent-brand-700" /> Active</label>
                      <SubmitButton size="sm" variant="outline">Save</SubmitButton>
                    </form>
                  )}
                </Td>
                <Td className="text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
