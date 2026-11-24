import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR"].includes(user.role)) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const c = await db.campaign.findUnique({ where: { id }, include: { signatures: { orderBy: { createdAt: "asc" } } } });
  if (!c) return new NextResponse("Not found", { status: 404 });
  const csv = toCsv([["Name", "Email", "Atoll", "Health worker", "Signed at"], ...c.signatures.map((s) => [s.name, s.email, s.atoll, s.isHealthWorker ? "Y" : "", s.createdAt.toISOString()])]);
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${c.slug}-signatures.csv"` } });
}
