import { NextResponse } from "next/server";
import { getDisabled } from "@/lib/features-server";

export const dynamic = "force-dynamic";

/** Which parts of the site are switched off. Read by the middleware (which can't query the database). */
export async function GET() {
  const disabled = [...(await getDisabled())];
  return NextResponse.json({ disabled }, { headers: { "Cache-Control": "no-store" } });
}
