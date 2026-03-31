import type { UserRole } from "@/lib/roles";

export interface SOPStep {
  title: string;
  description: string;
  substeps?: string[];
  notes?: string[];
  warning?: string;
  codeExample?: string;
  richContent?: string; // HTML content from WYSIWYG editor (screenshots, formatted text)
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface SOPRow {
  id: string;
  slug: string;
  title: string;
  category_id: string;
  description: string;
  version: string;
  tags: string[];
  steps: SOPStep[];
  content_html: string | null;
  role_visibility: UserRole[];
  created_by: string | null;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface SOPWithCategory extends SOPRow {
  categories: { name: string } | null;
}

export interface Profile {
  id: string;
  display_name: string;
  role: "admin" | "user";
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_email: string;
  user_role: string;
  action: string;
  document_id: string | null;
  document_title: string | null;
  details: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at">;
        Update: Partial<Omit<Category, "id" | "created_at">>;
      };
      sops: {
        Row: SOPRow;
        Insert: Omit<SOPRow, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SOPRow, "id" | "created_at" | "updated_at">>;
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "id" | "created_at">;
        Update: never;
      };
    };
  };
}
