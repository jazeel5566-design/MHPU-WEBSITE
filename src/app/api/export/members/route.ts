import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const members = await db.member.findMany({
    where: { ...(sp.get("status") ? { status: sp.get("status")! } : {}), ...(sp.get("profession") ? { profession: sp.get("profession")! } : {}), ...(sp.get("atoll") ? { atoll: sp.get("atoll")! } : {}) },
    include: { affiliate: { select: { shortName: true } } }, orderBy: { membershipNo: "asc" },
  });
  const csv = toCsv([
    ["Membership no", "Full name", "Status", "Profession", "Job title", "Employer", "Atoll", "Island", "Phone", "Email", "Nationality", "Affiliate", "Rep", "Joined", "Dues paid until"],
    ...members.map((m) => [m.membershipNo, m.fullName, m.status, m.profession, m.role, m.employer, m.atoll, m.island, m.phone, m.email, m.nationality, m.affiliate?.shortName, m.isRep ? "Y" : "", m.joinedAt.toISOString().slice(0, 10), m.duesPaidUntil?.toISOString().slice(0, 10)]),
  ]);
  await audit(user.id, "export_members", "Member", undefined, `${members.length} rows`);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mhpu-members-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
