import { BadgeCheck, XCircle, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { checkVerifyCode, formLimit } from "@/lib/security";
import { ButtonLink } from "@/components/ui";

export const metadata = { title: "Membership verification", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Scanning a card's QR (which carries a secret check code) shows the holder's first name,
 * last initial and profession. A number typed by hand only shows whether it's valid —
 * so the sequential membership numbers can't be used to list members. Rate-limited.
 */
export default async function VerifyResult({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<{ c?: string }> }) {
  const [{ no }, { c }] = await Promise.all([params, searchParams]);
  const number = decodeURIComponent(no).toUpperCase().slice(0, 40);
  const limited = await formLimit("verify", 30);
  if (limited) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Clock className="mx-auto size-14 text-amber-500" />
        <h1 className="mt-4 text-xl font-extrabold">Too many lookups</h1>
        <p className="mt-2 text-muted">{limited}</p>
      </div>
    );
  }
  const m = await db.member.findUnique({ where: { membershipNo: number }, select: { fullName: true, status: true, profession: true, joinedAt: true } });
  const valid = m?.status === "ACTIVE";
  const fromCard = !!m && checkVerifyCode(number, c);
  const shortName = m ? `${m.fullName.split(" ")[0]} ${m.fullName.split(" ").slice(-1)[0]?.[0] ?? ""}.` : "";
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {valid ? <BadgeCheck className="mx-auto size-16 text-emerald-600" /> : <XCircle className="mx-auto size-16 text-red-500" />}
      <h1 className="mt-4 text-2xl font-extrabold">{valid ? "Valid MHPU membership" : m ? "Membership not active" : "No active membership found"}</h1>
      <p className="mt-1 font-mono text-sm text-muted">{number}</p>
      {m && fromCard && (
        <dl className="mt-6 divide-y divide-line rounded-2xl border border-line text-start text-sm">
          <Row k="Name" v={shortName} />
          <Row k="Profession" v={m.profession} />
          <Row k="Status" v={m.status} />
          <Row k="Member since" v={formatDate(m.joinedAt)} />
        </dl>
      )}
      {m && !fromCard && <p className="mt-4 text-sm text-muted">Scan the QR code on the member&apos;s card to see their name and profession.</p>}
      <ButtonLink href="/" variant="outline" className="mt-8">MHPU home</ButtonLink>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between px-4 py-3"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>;
}
