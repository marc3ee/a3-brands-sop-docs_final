"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { ROLE_LABELS } from "@/lib/roles";
import dynamic from "next/dynamic";
import { useSOPs } from "@/contexts/SOPContext";

const PDFUploadModal = dynamic(() => import("@/components/PDFUploadModal"), { ssr: false });

export default function SOPLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isSuperuser, logout } = useAuth();
  const { sops } = useSOPs();
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Show back-to-top button on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-[var(--text-muted)] text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="md:ml-[240px] min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[var(--bg-card)] border-b border-[var(--border)] px-6 py-3">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--bg-hover)]"
            >
              <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search */}
            <div className="flex-1 max-w-md mx-4" ref={searchContainerRef}>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={headerSearch}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => headerSearch.trim() && setShowDropdown(true)}
                  placeholder="Search SOPs... (Ctrl+K)"
                  className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                  autoComplete="off"
                />

                {/* Dropdown */}
                {showDropdown && headerSearch.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden">
                    {filteredResults.length > 0 ? (
                      <>
                        <ul>
                          {filteredResults.map((sop, i) => (
                            <li key={sop.id}>
                              <button
                                onClick={() => handleResultClick(sop.slug)}
                                className={`w-full text-left px-4 py-3 transition-colors border-b border-[var(--border)] last:border-0 ${
                                  i === activeIndex
                                    ? "bg-[var(--primary-light)]"
                                    : "hover:bg-[var(--bg-hover)]"
                                }`}
                              >
                                <p className="text-sm font-medium text-[var(--text)] truncate">{sop.title}</p>
                                <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{sop.description}</p>
                                <span className="text-xs text-[var(--primary)] mt-0.5 inline-block">{sop.category_name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="border-t border-[var(--border)] px-4 py-2 bg-[var(--bg-hover)]">
                          <button
                            onClick={handleViewAll}
                            className="text-xs text-[var(--primary)] hover:underline font-medium"
                          >
                            See all results for &ldquo;{headerSearch}&rdquo; →
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="px-4 py-4 text-sm text-[var(--text-muted)] text-center">
                        No results for &ldquo;{headerSearch}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {isSuperuser && (
                <div className="relative" ref={newMenuRef}>
                  <button
                    onClick={() => setShowNewMenu((prev) => !prev)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">New SOP</span>
                    <svg className={`w-3 h-3 hidden sm:block transition-transform ${showNewMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showNewMenu && (
                    <div className="absolute right-0 mt-1 w-52 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden">
                      <button
                        onClick={() => { setShowNewMenu(false); router.push("/admin/edit/new"); }}
                        className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border)] flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">Create Manually</p>
                          <p className="text-xs text-[var(--text-muted)]">Build SOP from scratch</p>
                        </div>
                      </button>
                      <button
                        onClick={() => { setShowNewMenu(false); setShowUpload(true); }}
                        className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">Upload PDF</p>
                          <p className="text-xs text-[var(--text-muted)]">AI generates SOP from PDF</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <ThemeToggle />

              {/* User avatar + role badge */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] text-sm font-semibold">
                  {user.displayName.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-[var(--text)] leading-tight">{user.displayName}</p>
                  <p className="text-xs text-[var(--text-muted)] leading-tight">{ROLE_LABELS[user.role]}</p>
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
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

      {/* Back to top button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-40 bg-[var(--bg-card)] border border-[var(--border)] shadow-lg rounded-full px-4 py-2.5 flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all"
          title="Back to top"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          Back to top
        </button>
      )}

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[var(--modal-overlay)]" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-[240px] h-full">
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}
