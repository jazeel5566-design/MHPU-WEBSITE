import { BadgeCheck, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { ButtonLink } from "@/components/ui";

export const metadata = { title: "Membership verification", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyResult({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  const m = await db.member.findUnique({ where: { membershipNo: decodeURIComponent(no).toUpperCase() }, select: { fullName: true, status: true, profession: true, joinedAt: true, duesPaidUntil: true } });
  const valid = m?.status === "ACTIVE";
  // Show minimal data only (first name + initial) to protect privacy.
  const shortName = m ? `${m.fullName.split(" ")[0]} ${m.fullName.split(" ").slice(-1)[0]?.[0] ?? ""}.` : "";
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {valid ? <BadgeCheck className="mx-auto size-16 text-emerald-600" /> : <XCircle className="mx-auto size-16 text-red-500" />}
      <h1 className="mt-4 text-2xl font-extrabold">{valid ? "Valid MHPU member" : m ? "Membership not active" : "No membership found"}</h1>
      <p className="mt-1 font-mono text-sm text-muted">{decodeURIComponent(no)}</p>
      {m && (
        <dl className="mt-6 divide-y divide-line rounded-2xl border border-line text-start text-sm">
          <Row k="Name" v={shortName} />
          <Row k="Profession" v={m.profession} />
          <Row k="Status" v={m.status} />
          <Row k="Member since" v={formatDate(m.joinedAt)} />
        </dl>
      )}
      <ButtonLink href="/" variant="outline" className="mt-8">MHPU home</ButtonLink>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between px-4 py-3"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>;
}
