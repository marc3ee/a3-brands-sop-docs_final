import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth-guard";
import { createServerClient } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { USER_ROLES } from "@/lib/roles";

export async function PUT(req: NextRequest) {
  const userOrRes = requireSuperuser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const { id, role_visibility } = await req.json();

  if (!id || !Array.isArray(role_visibility)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Validate all roles
  for (const role of role_visibility) {
    if (!USER_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
    }
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sops")
    .update({ role_visibility })
    .eq("id", id)
    .select("id, title, role_visibility")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(
    user,
    "VISIBILITY_CHANGED",
    data.id,
    data.title,
    `Roles: ${role_visibility.join(", ") || "none"}`
  );

  return NextResponse.json(data);
}
