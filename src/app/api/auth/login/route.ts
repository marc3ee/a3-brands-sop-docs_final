import { NextRequest, NextResponse } from "next/server";
import { encodeSession, sessionCookieOptions } from "@/lib/session";
import type { UserRole } from "@/lib/roles";

const USERS: Record<string, { password: string; role: UserRole; displayName: string }> = {
  "admin@a3brands.com":     { password: "admin123",   role: "SUPERUSER",        displayName: "Admin" },
  "pm@a3brands.com":        { password: "pm123",      role: "PROJECT_MANAGER",  displayName: "Project Manager" },
  "am@a3brands.com":        { password: "am123",      role: "ACCOUNT_MANAGER",  displayName: "Account Manager" },
  "dev@a3brands.com":       { password: "dev123",     role: "WEB_DEVELOPER",    displayName: "Developer" },
  "designer@a3brands.com":  { password: "design123",  role: "WEB_DESIGNER",     displayName: "Designer" },
  "analytics@a3brands.com": { password: "analytics123", role: "ANALYTICS",      displayName: "Analytics" },
  "seo@a3brands.com":       { password: "seo123",     role: "SEO",              displayName: "SEO Specialist" },
  "writer@a3brands.com":    { password: "writer123",  role: "CONTENT_WRITER",   displayName: "Content Writer" },
};

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const account = USERS[email?.toLowerCase()];

  if (!account) {
    return NextResponse.json({ error: "Invalid email." }, { status: 401 });
  }
  if (account.password !== password) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const user = {
    id: email.toLowerCase(),
    email: email.toLowerCase(),
    role: account.role,
    displayName: account.displayName,
  };

  const { name, ...options } = sessionCookieOptions();
  const res = NextResponse.json({ user });
  res.cookies.set(name, encodeSession(user), options);
  return res;
}
