import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getMembersOnly } from "@/lib/audience-server";
import { readDocument, mimeFor } from "@/lib/storage";
import { slugify } from "@/lib/utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await db.resource.findUnique({ where: { id } });
  if (!r) return new NextResponse("Not found", { status: 404 });

  const membersOnly = await getMembersOnly();
  const forMembers = r.visibility === "MEMBERS" || membersOnly.has(`resource.${r.category}`) || membersOnly.has("page.resources");
  if (forMembers) {
    const user = await getCurrentUser();
    const allowed = user && (user.member?.status === "ACTIVE" || user.role !== "MEMBER");
    if (!allowed) return NextResponse.redirect(new URL("/login?next=/members/documents", req.url));
  }
  await db.resource.update({ where: { id }, data: { downloads: { increment: 1 } } });

  if (!r.fileUrl.startsWith("storage:")) return NextResponse.redirect(new URL(r.fileUrl, req.url));
  try {
    const buf = await readDocument(r.fileUrl);
    const ext = r.fileUrl.split(".").pop();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mimeFor(r.fileUrl),
        "Content-Disposition": `inline; filename="${slugify(r.title)}.${ext}"`,
        "Cache-Control": forMembers ? "private, no-store" : "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}
