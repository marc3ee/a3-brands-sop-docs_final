import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth, requireSuperuser } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const userOrRes = requireAuth(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sops")
    .select("*, categories(name)")
    .order("last_updated", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // SUPERUSER sees all documents; others only see SOPs where their role is in role_visibility
  if (user.role === "SUPERUSER") {
    return NextResponse.json(data);
  }

  const filtered = (data || []).filter((sop: { role_visibility: string[] }) =>
    sop.role_visibility && sop.role_visibility.includes(user.role)
  );
  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  // Only SUPERUSER can create SOPs
  const userOrRes = requireSuperuser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const supabase = createServerClient();
  const body = await req.json();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("sops")
    .insert({
      ...body,
      last_updated: today,
      created_by: user.email,
      role_visibility: body.role_visibility || [],
    })
    .select("*, categories(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user, "SOP_CREATED", data.id, data.title, `v${data.version || "1.0"} — Initial version`);

  return NextResponse.json(data, { status: 201 });
}
