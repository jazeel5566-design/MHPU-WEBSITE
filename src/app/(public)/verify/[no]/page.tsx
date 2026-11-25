import { BadgeCheck, XCircle, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { checkVerifyCode, formLimit } from "@/lib/security";
import { ButtonLink } from "@/components/ui";
import { getT } from "@/lib/i18n";

export const metadata = { title: "Membership verification", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Scanning a card's QR (which carries a secret check code) shows the holder's first name,
 * last initial and profession. A number typed by hand only shows whether it's valid —
 * so the sequential membership numbers can't be used to list members. Rate-limited.
 */
export default async function VerifyResult({ params, searchParams }: { params: Promise<{ no: string }>; searchParams: Promise<{ c?: string }> }) {
  const T = await getT();
  const [{ no }, { c }] = await Promise.all([params, searchParams]);
  const number = decodeURIComponent(no).toUpperCase().slice(0, 40);
  const limited = await formLimit("verify", 30);
  if (limited) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Clock className="mx-auto size-14 text-amber-500" />
        <h1 className="mt-4 text-xl font-extrabold">{T("Too many lookups")}</h1>
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
      <h1 className="mt-4 text-2xl font-extrabold">{T(valid ? "Valid MHPU membership" : m ? "Membership not active" : "No active membership found")}</h1>
      <p className="mt-1 font-mono text-sm text-muted">{number}</p>
      {m && fromCard && (
        <dl className="mt-6 divide-y divide-line rounded-2xl border border-line text-start text-sm">
          <Row k={T("Name")} v={shortName} />
          <Row k={T("Profession")} v={T(m.profession)} />
          <Row k={T("Status")} v={T(m.status === "ACTIVE" ? "Active" : m.status === "INACTIVE" ? "Not active" : m.status.charAt(0) + m.status.slice(1).toLowerCase())} />
          <Row k={T("Member since")} v={formatDate(m.joinedAt)} />
        </dl>
      )}
      {m && !fromCard && <p className="mt-4 text-sm text-muted">{T("Scan the QR code on the member's card to see their name and profession.")}</p>}
      <ButtonLink href="/" variant="outline" className="mt-8">{T("MHPU home")}</ButtonLink>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between px-4 py-3"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>;
}
