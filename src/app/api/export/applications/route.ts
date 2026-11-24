import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/csv";

/** Same columns as the old Google Sheet "Responses" tab, plus the new ones. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new NextResponse("Forbidden", { status: 403 });
  const apps = await db.application.findMany({ orderBy: { createdAt: "asc" } });
  const members = await db.member.findMany({ where: { id: { in: apps.map((a) => a.memberId).filter((x): x is string => !!x) } }, select: { id: true, membershipNo: true } });
  const noOf = (id: string | null) => members.find((m) => m.id === id)?.membershipNo ?? "";
  const csv = toCsv([
    ["Timestamp", "Reference", "Membership ID", "Full Name", "Present Address", "Country", "National ID / Passport No.", "Email", "Phone Number", "Job / Job Title", "Hospital / Company", "Profession", "Atoll", "ID Copy", "Signature", "Declaration Date", "Status", "Received By", "Processed Date"],
    ...apps.map((a) => [a.createdAt.toISOString(), a.reference, noOf(a.memberId), a.fullName, a.address, a.country, a.idNumber, a.email, a.phone, a.jobTitle, a.employer, a.profession, a.atoll, a.idDocFile ? "Yes" : "No", a.signatureFile ? "Yes" : "No", a.declarationDate?.toISOString().slice(0, 10), a.status, a.receivedBy, a.reviewedAt?.toISOString().slice(0, 10)]),
  ]);
  await audit(user.id, "export_applications", "Application", undefined, `${apps.length} rows`);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mhpu-applications-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
