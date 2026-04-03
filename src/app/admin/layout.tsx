"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SidebarProvider>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isSuperuser, isLoading } = useAuth();
  const { collapsed } = useSidebar();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/login");
      } else if (!isSuperuser) {
        router.replace("/sops");
      }
    }
  }, [user, isSuperuser, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-[var(--text-muted)] text-sm">Loading...</div>
      </div>
    );
  }

  if (!user || !isSuperuser) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <main className={`min-h-screen transition-[margin] duration-200 ${collapsed ? "ml-[52px]" : "ml-[240px]"}`}>
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
