import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { USER_ROLES, type UserRole } from "@/lib/roles";

// In-memory user store (mirrors the login route store)
// In a production app, this would be a database table
const USERS: Record<string, { password: string; role: UserRole; displayName: string; active: boolean }> = {
  "admin@a3brands.com":     { password: "admin123",     role: "SUPERUSER",        displayName: "Admin",           active: true },
  "pm@a3brands.com":        { password: "pm123",        role: "PROJECT_MANAGER",  displayName: "Project Manager", active: true },
  "am@a3brands.com":        { password: "am123",        role: "ACCOUNT_MANAGER",  displayName: "Account Manager", active: true },
  "dev@a3brands.com":       { password: "dev123",       role: "WEB_DEVELOPER",    displayName: "Developer",       active: true },
  "designer@a3brands.com":  { password: "design123",    role: "WEB_DESIGNER",     displayName: "Designer",        active: true },
  "analytics@a3brands.com": { password: "analytics123", role: "ANALYTICS",        displayName: "Analytics",       active: true },
  "seo@a3brands.com":       { password: "seo123",       role: "SEO",              displayName: "SEO Specialist",  active: true },
  "writer@a3brands.com":    { password: "writer123",    role: "CONTENT_WRITER",   displayName: "Content Writer",  active: true },
};

export async function GET(req: NextRequest) {
  const userOrRes = requireSuperuser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;

  const users = Object.entries(USERS).map(([email, data]) => ({
    email,
    displayName: data.displayName,
    role: data.role,
    active: data.active,
  }));

  return NextResponse.json(users);
}

export async function PUT(req: NextRequest) {
  const userOrRes = requireSuperuser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const adminUser = userOrRes;

  const { email, role, active } = await req.json();

  if (!USERS[email]) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const changes: string[] = [];

  if (role !== undefined) {
    if (!USER_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    const oldRole = USERS[email].role;
    USERS[email].role = role;
    changes.push(`Role changed from ${oldRole} to ${role}`);
  }

  if (active !== undefined) {
    USERS[email].active = active;
    changes.push(active ? "Account activated" : "Account deactivated");
  }

  await logAudit(
    adminUser,
    "USER_UPDATED",
    null,
    null,
    `User ${email}: ${changes.join(", ")}`
  );

  // If the updated user is the currently logged-in admin, update their session cookie
  const res = NextResponse.json({
    email,
    displayName: USERS[email].displayName,
    role: USERS[email].role,
    active: USERS[email].active,
  });

  return res;
}
