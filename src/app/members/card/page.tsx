import { headers } from "next/headers";
import QRCode from "qrcode";
import { ShieldCheck } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { LogoMark } from "@/components/logo";
import { PageHeader, Card } from "@/components/ui";
import { PrintButton } from "@/components/members/print-button";

export const metadata = { title: "Membership card" };

export default async function CardPage() {
  const { member } = await requireMember();
  const affiliate = member.affiliateId ? await db.affiliate.findUnique({ where: { id: member.affiliateId } }) : null;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const verifyUrl = `${origin}/verify/${member.membershipNo}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240, color: { dark: "#0d3335", light: "#ffffff" } });
  const active = member.status === "ACTIVE";

  return (
    <div>
      <PageHeader title="Digital membership card" desc="Show this card at your workplace, events or partner offers. Anyone can scan the QR code to verify it." actions={<PrintButton />} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div className="relative aspect-[1.586] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 p-6 text-white shadow-2xl shadow-brand-900/30 print:shadow-none">
          <svg className="absolute -bottom-6 -end-6 size-48 text-white/5" viewBox="0 0 48 48"><path d="M19 9h10v10h10v10H29v10H19V29H9V19h10z" fill="currentColor" /></svg>
          <svg className="absolute inset-x-0 bottom-0 w-full text-brand-400/20" viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0 20c50-15 100-15 150 0s100 15 150 0 70-12 100-5v25H0z" fill="currentColor" /></svg>
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2"><span className="rounded-lg bg-white p-1"><LogoMark className="h-7" /></span><div className="leading-tight"><div className="font-extrabold">MHPU</div><div className="text-[10px] text-brand-200">Maldives Health Professionals Union</div></div></div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${active ? "bg-emerald-400 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>{member.status}</span>
            </div>
            <div className="mt-auto flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-xl font-extrabold">{member.fullName}</div>
                <div className="truncate text-sm text-brand-100">{member.profession}{affiliate ? ` · ${affiliate.shortName}` : ""}</div>
                <div className="mt-3 font-mono text-sm tracking-wider">{member.membershipNo}</div>
                <div className="text-[10px] text-brand-200">Member since {formatDate(member.joinedAt, { month: "short", year: "numeric" })}</div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Verification QR code" className="size-24 shrink-0 rounded-xl bg-white p-1.5" />
            </div>
          </div>
        </div>
        <Card className="p-6 print:hidden">
          <div className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5 text-brand-600" /> How verification works</div>
          <p className="mt-2 text-sm text-muted">Scanning the QR code opens a secure MHPU page that confirms whether your membership is active. It shows only your first name, last initial and profession — never your ID number or contact details.</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-muted">Workplace</dt><dd className="font-semibold">{member.employer}</dd></div>
            <div><dt className="text-muted">Atoll</dt><dd className="font-semibold">{member.atoll}</dd></div>
            <div><dt className="text-muted">Dues paid until</dt><dd className="font-semibold">{formatDate(member.duesPaidUntil)}</dd></div>
            <div><dt className="text-muted">Workplace rep</dt><dd className="font-semibold">{member.isRep ? "Yes" : "No"}</dd></div>
          </dl>
          <p className="mt-5 break-all text-xs text-muted">Verify link: {verifyUrl}</p>
        </Card>
      </div>
    </div>
  );
}
