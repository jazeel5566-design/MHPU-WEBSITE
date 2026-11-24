import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { readApplicationFile, mimeFor } from "@/lib/storage";
import { APPLICATION_APPROVERS } from "@/lib/constants";

/** Applicant ID copies and signatures: application approvers only, never cached, every view audited. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const user = await getCurrentUser();
  if (!user || !(APPLICATION_APPROVERS as readonly string[]).includes(user.role)) return new NextResponse("Forbidden", { status: 403 });
  const { id, kind } = await params;
  const app = await db.application.findUnique({ where: { id } });
  const file = kind === "id" ? app?.idDocFile : kind === "signature" ? app?.signatureFile : null;
  if (!app || !file) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readApplicationFile(file);
    await audit(user.id, `view_${kind}`, "Application", id, app.reference);
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": mimeFor(file), "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}
