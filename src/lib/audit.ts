import { createServerClient } from "@/lib/supabase-server";
import type { SessionUser } from "@/lib/session";

export async function logAudit(
  user: SessionUser,
  action: string,
  documentId?: string | null,
  documentTitle?: string | null,
  details?: string | null
) {
  const supabase = createServerClient();
  await supabase.from("audit_logs").insert({
    user_email: user.email,
    user_role: user.role,
    action,
    document_id: documentId ?? null,
    document_title: documentTitle ?? null,
    details: details ?? null,
  });
}
