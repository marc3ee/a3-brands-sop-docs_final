"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSOPs } from "@/contexts/SOPContext";
import Logo from "./Logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";

export default function Sidebar() {
  const { user, logout, isSuperuser } = useAuth();
  const { categories, sops } = useSOPs();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const sopsByCategory = (catName: string) =>
    sops.filter((s) => s.category_name === catName);

  const isActive = (slug: string) => pathname === `/sops/${slug}`;

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-0 bottom-0 w-[52px] bg-white border-r border-[#E2E8F0] flex flex-col z-50">
        <button
          onClick={() => setCollapsed(false)}
          className="p-3 hover:bg-gray-50 transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-white border-r border-[#E2E8F0] flex flex-col z-50">
        {/* Header */}
        <div className="px-4 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <Link href="/sops" className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 sidebar-scroll">
          {categories.map((cat) => {
            const catSOPs = sopsByCategory(cat.name);
            if (catSOPs.length === 0) return null;
            return (
              <div key={cat.id} className="mb-1">
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-2 mt-2 first:mt-0">
                  {cat.name}
                </h3>
                <div className="space-y-0.5 px-2">
                  {catSOPs.map((sop) => (
                    <Link
                      key={sop.id}
                      href={`/sops/${sop.slug}`}
                      className={`block px-3 py-1.5 rounded-lg text-[13px] leading-snug transition-colors ${
                        isActive(sop.slug)
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {sop.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {isSuperuser && (
            <div className="mb-1 mt-2 pt-3 mx-3 border-t border-[#E2E8F0]">
              <Link
                href="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Admin Panel
              </Link>
            </div>
          )}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-sm font-semibold flex-shrink-0">
                {user?.displayName?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role ? ROLE_LABELS[user.role] : ""}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay - hidden on md+ */}
      <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setCollapsed(true)} />
    </>
  );
}
