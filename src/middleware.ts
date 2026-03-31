import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, decodeSession } from "@/lib/session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionValue = request.cookies.get(COOKIE_NAME)?.value;
  const user = sessionValue ? decodeSession(sessionValue) : null;

  const isAuthed = user !== null;
  const isSuperuser = user?.role === "SUPERUSER";

  // Redirect logged-in users away from login page
  if (isAuthed && pathname === "/login") {
    return NextResponse.redirect(new URL("/sops", request.url));
  }

  // Protect /sops and /admin — redirect to login if not authed
  if (!isAuthed && (pathname.startsWith("/sops") || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect /admin — redirect non-superusers to /sops
  if (isAuthed && !isSuperuser && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/sops", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
