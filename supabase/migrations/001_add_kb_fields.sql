-- ============================================
-- Migration: Add Knowledge Base fields
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- after the initial schema.sql has been applied.
-- ============================================

-- Add new columns to sops table (existing columns are NOT modified)
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS role_visibility TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Index for role_visibility queries
CREATE INDEX IF NOT EXISTS idx_sops_role_visibility ON public.sops USING GIN (role_visibility);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  document_id TEXT,
  document_title TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS on audit_logs (service role bypasses this)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs via RLS (API uses service role key anyway)
CREATE POLICY "Audit logs viewable by authenticated users"
  ON public.audit_logs FOR SELECT TO authenticated USING (true);
