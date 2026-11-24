import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const RULES: [string, string[]][] = [
  ["/admin", ["ADMIN", "CASEWORKER"]],
  ["/editorial", ["ADMIN", "EDITOR", "AUTHOR"]],
  ["/members", ["MEMBER", "ADMIN"]],
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const rule = RULES.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"));
  if (!rule) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (!rule[1].includes(session.role)) {
    return NextResponse.redirect(new URL("/login?denied=1", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/editorial/:path*", "/members/:path*"] };
