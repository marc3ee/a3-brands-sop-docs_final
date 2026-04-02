"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ROLE_LABELS } from "@/lib/roles";
import dynamic from "next/dynamic";
import { useSOPs } from "@/contexts/SOPContext";

const PDFUploadModal = dynamic(() => import("@/components/PDFUploadModal"), { ssr: false });

export default function SOPLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isSuperuser, logout } = useAuth();
  const { sops } = useSOPs();
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const filteredResults = headerSearch.trim()
    ? sops
        .filter((sop) => {
          const q = headerSearch.toLowerCase();
          return (
            sop.title.toLowerCase().includes(q) ||
            sop.description.toLowerCase().includes(q) ||
            sop.tags.some((t) => t.toLowerCase().includes(q))
          );
        })
        .slice(0, 6)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [user, isLoading, router]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHeaderSearch(e.target.value);
    setShowDropdown(true);
    setActiveIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filteredResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && filteredResults[activeIndex]) {
        router.push(`/sops/${filteredResults[activeIndex].slug}`);
        setShowDropdown(false);
        setHeaderSearch("");
      } else if (headerSearch.trim()) {
        router.push(`/sops?q=${encodeURIComponent(headerSearch)}`);
        setShowDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  const handleResultClick = (slug: string) => {
    router.push(`/sops/${slug}`);
    setShowDropdown(false);
    setHeaderSearch("");
  };

  const handleViewAll = () => {
    router.push(`/sops?q=${encodeURIComponent(headerSearch)}`);
    setShowDropdown(false);
  };

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
            <div className="flex-1 max-w-md mx-4" ref={searchContainerRef}>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={headerSearch}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => headerSearch.trim() && setShowDropdown(true)}
                  placeholder="Search SOPs..."
                  className="w-full bg-gray-50 border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  autoComplete="off"
                />

                {/* Dropdown */}
                {showDropdown && headerSearch.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
                    {filteredResults.length > 0 ? (
                      <>
                        <ul>
                          {filteredResults.map((sop, i) => (
                            <li key={sop.id}>
                              <button
                                onClick={() => handleResultClick(sop.slug)}
                                className={`w-full text-left px-4 py-3 transition-colors border-b border-[#F1F5F9] last:border-0 ${
                                  i === activeIndex
                                    ? "bg-blue-50"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <p className="text-sm font-medium text-gray-900 truncate">{sop.title}</p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{sop.description}</p>
                                <span className="text-xs text-blue-400 mt-0.5 inline-block">{sop.category_name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="border-t border-[#E2E8F0] px-4 py-2 bg-gray-50">
                          <button
                            onClick={handleViewAll}
                            className="text-xs text-[#2563EB] hover:underline font-medium"
                          >
                            See all results for &ldquo;{headerSearch}&rdquo; →
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="px-4 py-4 text-sm text-gray-500 text-center">
                        No results for &ldquo;{headerSearch}&rdquo;
                      </div>
                    )}
                  </div>
                )}
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
