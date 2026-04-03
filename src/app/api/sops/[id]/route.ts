import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireSuperuser } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrRes = requireSuperuser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const supabase = createServerClient();
  const { id } = await params;
  const body = await req.json();
  const { change_note, ...updateData } = body;
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("sops")
    .update({ ...updateData, last_updated: today, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, categories(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const detail = change_note
    ? `v${data.version || "1.0"} — ${change_note}`
    : `v${data.version || "1.0"}`;
  await logAudit(user, "SOP_EDITED", data.id, data.title, detail);

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrRes = requireSuperuser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const supabase = createServerClient();
  const { id } = await params;
  const { content_html } = await req.json();

  const { data, error } = await supabase
    .from("sops")
    .update({ content_html, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, categories(name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user, "SOP_CONTENT_EDITED", data.id, data.title, "Content HTML updated via editor");

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrRes = requireSuperuser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const supabase = createServerClient();
  const { id } = await params;

  // Fetch title before deleting for audit log
  const { data: sop } = await supabase.from("sops").select("title").eq("id", id).single();

  const { error } = await supabase.from("sops").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit(user, "SOP_DELETED", id, sop?.title ?? "Unknown");

  return NextResponse.json({ success: true });
}
