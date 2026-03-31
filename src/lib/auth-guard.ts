import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decodeSession } from "@/lib/session";
import type { SessionUser } from "@/lib/session";

/**
 * Extract the authenticated user from request cookies.
 * Returns null if no valid session.
 */
export function getSessionUser(req: NextRequest): SessionUser | null {
  const value = req.cookies.get(COOKIE_NAME)?.value;
  if (!value) return null;
  return decodeSession(value);
}

/**
 * Require authentication. Returns 401 if not authenticated.
 */
export function requireAuth(req: NextRequest): SessionUser | NextResponse {
  const user = getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

/**
 * Require SUPERUSER role. Returns 401/403 as appropriate.
 */
export function requireSuperuser(req: NextRequest): SessionUser | NextResponse {
  const result = requireAuth(req);
  if (result instanceof NextResponse) return result;
  if (result.role !== "SUPERUSER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}
