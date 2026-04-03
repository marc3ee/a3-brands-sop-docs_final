"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { SOPStep } from "@/types/database";
import type { UserRole } from "@/lib/roles";

export interface SOP {
  id: string;
  slug: string;
  title: string;
  category_id: string;
  category_name: string;
  description: string;
  version: string;
  tags: string[];
  steps: SOPStep[];
  content_html: string | null;
  role_visibility: UserRole[];
  created_by: string | null;
  last_updated: string;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface SOPContextType {
  sops: SOP[];
  categories: Category[];
  isLoading: boolean;
  addSOP: (sop: {
    slug: string;
    title: string;
    category_id: string;
    description: string;
    version: string;
    tags: string[];
    steps: SOPStep[];
    content_html?: string;
    role_visibility?: UserRole[];
  }) => Promise<SOP | null>;
  updateSOP: (
    id: string,
    updates: Partial<{
      title: string;
      category_id: string;
      description: string;
      version: string;
      tags: string[];
      steps: SOPStep[];
      content_html: string;
      role_visibility: UserRole[];
      change_note: string;
    }>
  ) => Promise<void>;
  deleteSOP: (id: string) => Promise<boolean>;
  getSOP: (slug: string) => SOP | undefined;
  addCategory: (name: string) => Promise<Category | null>;
  refreshSOPs: () => Promise<void>;
  uploadPDF: (file: File) => Promise<SOP | null>;
}

const SOPContext = createContext<SOPContextType | null>(null);

function rowToSOP(row: Record<string, unknown>): SOP {
  const categories = row.categories as { name: string } | null;
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    category_id: row.category_id as string,
    category_name: categories?.name ?? "",
    description: row.description as string,
    version: row.version as string,
    tags: (row.tags as string[]) ?? [],
    steps: (row.steps as SOPStep[]) ?? [],
    content_html: (row.content_html as string) ?? null,
    role_visibility: (row.role_visibility as UserRole[]) ?? [],
    created_by: (row.created_by as string) ?? null,
    last_updated: row.last_updated as string,
  };
}

export function SOPProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  const refreshSOPs = useCallback(async () => {
    setIsLoading(true);
    try {
      const [catsRes, sopsRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/sops"),
      ]);
      if (!catsRes.ok || !sopsRes.ok) return;
      const [catsData, sopsData] = await Promise.all([catsRes.json(), sopsRes.json()]);
      setCategories(Array.isArray(catsData) ? catsData : []);
      setSOPs(Array.isArray(sopsData) ? sopsData.map(rowToSOP) : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Only fetch when user is authenticated
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(({ user }) => {
        if (user) {
          setAuthed(true);
          refreshSOPs();
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => setIsLoading(false));
  }, [refreshSOPs]);

  const addSOP = useCallback(
    async (sop: {
      slug: string;
      title: string;
      category_id: string;
      description: string;
      version: string;
      tags: string[];
      steps: SOPStep[];
      content_html?: string;
      role_visibility?: UserRole[];
    }) => {
      const res = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sop),
      });
      if (!res.ok) {
        const { error } = await res.json();
        console.error("Error adding SOP:", error);
        return null;
      }
      const data = await res.json();
      const newSOP = rowToSOP(data);
      setSOPs((prev) => [newSOP, ...prev]);
      return newSOP;
    },
    []
  );

  const updateSOP = useCallback(
    async (
      id: string,
      updates: Partial<{
        title: string;
        category_id: string;
        description: string;
        version: string;
        tags: string[];
        steps: SOPStep[];
        content_html: string;
        role_visibility: UserRole[];
        change_note: string;
      }>
    ) => {
      const res = await fetch(`/api/sops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const { error } = await res.json();
        console.error("Error updating SOP:", error);
        return;
      }
      const data = await res.json();
      setSOPs((prev) => prev.map((s) => (s.id === id ? rowToSOP(data) : s)));
    },
    []
  );

  const deleteSOP = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/sops/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = await res.json();
      console.error("Error deleting SOP:", error);
      return false;
    }
    setSOPs((prev) => prev.filter((s) => s.id !== id));
    return true;
  }, []);

  const getSOP = useCallback(
    (slug: string) => sops.find((s) => s.slug === slug),
    [sops]
  );

  const addCategory = useCallback(
    async (name: string): Promise<Category | null> => {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0);
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sort_order: maxOrder + 1 }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        console.error("Error adding category:", error);
        return null;
      }
      const data: Category = await res.json();
      setCategories((prev) => [...prev, data]);
      return data;
    },
    [categories]
  );

  const uploadPDF = useCallback(async (file: File): Promise<SOP | null> => {
    const formData = new FormData();
    formData.append("pdf", file);

    const res = await fetch("/api/sops/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const { error } = await res.json();
      console.error("Error uploading PDF:", error);
      throw new Error(error || "Upload failed");
    }

    const data = await res.json();
    const newSOP = rowToSOP(data);
    setSOPs((prev) => [newSOP, ...prev]);
    // Also refresh categories in case "Uploaded SOPs" was created
    const catsRes = await fetch("/api/categories");
    const catsData = await catsRes.json();
    setCategories(Array.isArray(catsData) ? catsData : []);
    return newSOP;
  }, []);

  return (
    <SOPContext.Provider
      value={{
        sops,
        categories,
        isLoading,
        addSOP,
        updateSOP,
        deleteSOP,
        getSOP,
        addCategory,
        refreshSOPs,
        uploadPDF,
      }}
    >
      {children}
    </SOPContext.Provider>
  );
}

export function useSOPs() {
  const ctx = useContext(SOPContext);
  if (!ctx) throw new Error("useSOPs must be used within SOPProvider");
  return ctx;
}
