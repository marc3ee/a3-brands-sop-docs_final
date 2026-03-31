import type { UserRole } from "@/lib/roles";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

const COOKIE_NAME = "a3_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64");
}

export function decodeSession(value: string): SessionUser | null {
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = MAX_AGE) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

export { COOKIE_NAME };
