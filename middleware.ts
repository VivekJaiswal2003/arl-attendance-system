import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const path = request.nextUrl.pathname;

  if (path === "/register" || path === "/login") {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login?error=forbidden", request.url));
  }

  if ((path.startsWith("/worker") || path === "/profile") && session.role !== "WORKER") {
    return NextResponse.redirect(new URL("/login?error=forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/worker/:path*", "/profile", "/login", "/register"],
};