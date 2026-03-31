import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth-guard";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const userOrRes = requireSuperuser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
