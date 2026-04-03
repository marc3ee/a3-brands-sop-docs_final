import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrRes = requireAuth(req);
  if (userOrRes instanceof NextResponse) return userOrRes;

  const supabase = createServerClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("document_id", id)
    .in("action", ["SOP_CREATED", "SOP_EDITED", "SOP_CONTENT_EDITED"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
