import { FileText, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { deleteResource, updateResourceVisibility } from "@/app/actions/editorial";
import { RESOURCE_CATEGORIES, labelOf } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, PageHeader, Table, Td, Th } from "@/components/ui";
import { ResourceUpload } from "@/components/editorial/forms";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function ResourcesAdmin() {
  await requireRole(["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR"], "/editorial");
  const docs = await db.resource.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Documents" desc="Members-only documents are stored privately and can only be downloaded by logged-in members." />
      <Card><CardHeader title="Upload a document" /><div className="p-5"><ResourceUpload /></div></Card>
      <Card>
        <Table>
          <thead><tr><Th>Document</Th><Th>Category</Th><Th>Access</Th><Th>Downloads</Th><Th /></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <Td><a href={`/api/resources/${d.id}`} className="inline-flex items-center gap-2 font-semibold hover:text-brand-700"><FileText className="size-4 text-brand-600" />{d.title}</a><div className="text-xs text-muted">{formatDate(d.createdAt)}</div></Td>
                <Td className="text-muted">{labelOf(RESOURCE_CATEGORIES, d.category)}</Td>
                <Td>
                  <form action={updateResourceVisibility} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="visibility" value={d.visibility === "PUBLIC" ? "MEMBERS" : "PUBLIC"} />
                    <span className={`text-xs font-bold ${d.visibility === "MEMBERS" ? "text-violet-700" : "text-brand-700"}`}>{d.visibility === "MEMBERS" ? "Members" : "Public"}</span>
                    <SubmitButton size="sm" variant="ghost" className="text-xs">switch</SubmitButton>
                  </form>
                </Td>
                <Td>{d.downloads}</Td>
                <Td className="text-end"><form action={deleteResource}><input type="hidden" name="id" value={d.id} /><SubmitButton size="sm" variant="ghost" className="text-red-600" confirm="Delete this document?" aria-label="Delete"><Trash2 className="size-4" /></SubmitButton></form></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
