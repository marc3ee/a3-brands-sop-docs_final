"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ROLE_LABELS } from "@/lib/roles";
import dynamic from "next/dynamic";

const PDFUploadModal = dynamic(() => import("@/components/PDFUploadModal"), { ssr: false });

export default function SOPLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isSuperuser, logout } = useAuth();
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="md:ml-[240px] min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] px-6 py-3">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search */}
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search SOPs..."
                  className="w-full bg-gray-50 border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  onFocus={() => router.push("/sops")}
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {isSuperuser && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">New SOP</span>
                </button>
              )}

              {/* User avatar + role badge */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-sm font-semibold">
                  {user.displayName.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 leading-tight">{user.displayName}</p>
                  <p className="text-xs text-gray-500 leading-tight">{ROLE_LABELS[user.role]}</p>
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main>
          <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
        </main>
      </div>

      {/* PDF Upload Modal */}
      {showUpload && (
        <PDFUploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} />
      )}

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-[240px] h-full">
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}
