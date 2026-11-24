import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const RULES: [string, string[]][] = [
  ["/admin", ["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "CASEWORKER", "TREASURER"]],
  ["/editorial", ["ADMIN", "GENERAL_SECRETARY", "PRESIDENT", "EDITOR", "AUTHOR"]],
  ["/members", ["MEMBER", "ADMIN"]],
];

/**
 * Content-Security-Policy with a fresh nonce per request: only scripts Next.js renders
 * (which it tags with this nonce) may run. Blocks injected scripts and clickjacking.
 */
function csp(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self' https://*.bankofmaldives.com.mv",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Portal access gate (pages and actions re-check roles against the database).
  const rule = RULES.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"));
  if (rule) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    if (!rule[1].includes(session.role)) return NextResponse.redirect(new URL("/login?denied=1", req.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = csp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy); // Next.js reads this to tag its scripts
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", policy);
  return res;
}

export const config = {
  // Everything except static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|fonts/|uploads/).*)"],
};
