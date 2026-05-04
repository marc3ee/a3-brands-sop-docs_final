"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSOPs } from "@/contexts/SOPContext";
import Logo from "./Logo";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { NON_SUPERUSER_ROLES, ROLE_LABELS, type UserRole } from "@/lib/roles";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";

export default function Sidebar() {
  // useSearchParams (in SidebarContent) needs a Suspense boundary at build time.
  return (
    <Suspense>
      <SidebarContent />
    </Suspense>
  );
}

function SidebarContent() {
  const { user, logout, isSuperuser } = useAuth();
  const { categories, sops, isLoading } = useSOPs();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { collapsed, setCollapsed } = useSidebar();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { resolvedTheme } = useTheme();

  // Effective role used to filter the sidebar.
  // - Non-SUPERUSER: their own role.
  // - SUPERUSER: their own role unless they're previewing via ?as=ROLE on /sops.
  const roleViewParam = searchParams?.get("as") ?? "";
  const previewedRole: UserRole | null =
    isSuperuser && (NON_SUPERUSER_ROLES as readonly string[]).includes(roleViewParam)
      ? (roleViewParam as UserRole)
      : null;
  const effectiveRole = previewedRole ?? (user?.role ?? null);

  // SUPERUSER's sidebar always shows everything (the ?as= preview only affects page content, not the sidebar).
  // Everyone else sees only SOPs whose role_visibility includes their own role.
  const visibleSops = isSuperuser
    ? sops
    : effectiveRole
      ? sops.filter((s) => s.role_visibility?.includes(effectiveRole))
      : [];

  const sopsByCategory = (catName: string) =>
    visibleSops.filter((s) => s.category_name === catName);

  const sopsByRole = (role: UserRole) =>
    visibleSops
      .filter((s) => s.role_visibility?.includes(role))
      .sort(
        (a, b) =>
          a.category_name.localeCompare(b.category_name) ||
          a.title.localeCompare(b.title),
      );

  const unassignedSops = visibleSops
    .filter((s) => !s.role_visibility || s.role_visibility.length === 0)
    .sort((a, b) => a.title.localeCompare(b.title));

  // Admin (SUPERUSER) always groups by user role with collapsible dropdowns,
  // regardless of any ?as= preview. Everyone else groups by category.
  const groupByRole = isSuperuser;

  const isActive = (slug: string) => pathname === `/sops/${slug}`;

  const [openRoles, setOpenRoles] = useState<Record<string, boolean>>({});
  const toggleRole = (key: string) =>
    setOpenRoles((prev) => ({ ...prev, [key]: !prev[key] }));

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-0 bottom-0 w-[52px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col z-50">
        <button
          onClick={() => setCollapsed(false)}
          className="p-3 hover:bg-[var(--sidebar-hover-bg)] transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5 text-[var(--sidebar-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col z-50">
        {/* Header */}
        <div className="px-4 py-4 border-b border-[var(--sidebar-border)] flex items-center justify-between">
          <Link href="/sops" className="flex items-center gap-2">
            <Logo size="sm" variant={resolvedTheme === "dark" ? "dark" : "light"} />
          </Link>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-[var(--sidebar-hover-bg)] transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4 text-[var(--sidebar-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 sidebar-scroll">
          {isLoading ? (
            <div className="px-2 py-3 space-y-4">
              {[1, 2, 3].map((g) => (
                <div key={g}>
                  <div className="h-3 bg-[var(--sidebar-border)] rounded w-2/5 mx-2 mb-2 animate-pulse" />
                  <div className="space-y-1">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-7 bg-[var(--sidebar-border)] rounded-lg mx-1 animate-pulse opacity-50" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : groupByRole ? (
            <>
              {NON_SUPERUSER_ROLES.map((role) => {
                const roleSOPs = sopsByRole(role);
                if (roleSOPs.length === 0) return null;
                const isOpen = openRoles[role] ?? false;
                return (
                  <div key={role} className="mb-1">
                    <button
                      onClick={() => toggleRole(role)}
                      aria-expanded={isOpen}
                      className={`w-full flex items-center justify-between text-[15px] font-semibold tracking-tight px-4 py-2.5 mt-2 first:mt-0 border-l-2 transition-colors ${
                        isOpen
                          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] border-[var(--sidebar-active-text)]"
                          : "text-[var(--sidebar-text)] border-transparent hover:bg-[var(--sidebar-hover-bg)]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{ROLE_LABELS[role]}</span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            isOpen
                              ? "bg-[var(--sidebar-active-text)]/15 text-[var(--sidebar-active-text)]"
                              : "bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text-muted)]"
                          }`}
                        >
                          {roleSOPs.length}
                        </span>
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isOpen
                            ? "rotate-90 text-[var(--sidebar-active-text)]"
                            : "text-[var(--sidebar-text-muted)]"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="space-y-0.5 px-2 py-1">
                        {roleSOPs.map((sop) => (
                          <Link
                            key={`${role}-${sop.id}`}
                            href={`/sops/${sop.slug}`}
                            className={`block px-3 py-1.5 rounded-lg text-[13px] leading-snug transition-colors ${
                              isActive(sop.slug)
                                ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] font-medium"
                                : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]"
                            }`}
                          >
                            {sop.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {unassignedSops.length > 0 && (() => {
                const isOpen = openRoles["__unassigned"] ?? false;
                return (
                  <div className="mb-1">
                    <button
                      onClick={() => toggleRole("__unassigned")}
                      aria-expanded={isOpen}
                      className={`w-full flex items-center justify-between text-[15px] font-semibold tracking-tight px-4 py-2.5 mt-2 border-l-2 transition-colors ${
                        isOpen
                          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] border-[var(--sidebar-active-text)]"
                          : "text-[var(--sidebar-text)] border-transparent hover:bg-[var(--sidebar-hover-bg)]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>Unassigned</span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            isOpen
                              ? "bg-[var(--sidebar-active-text)]/15 text-[var(--sidebar-active-text)]"
                              : "bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text-muted)]"
                          }`}
                        >
                          {unassignedSops.length}
                        </span>
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isOpen
                            ? "rotate-90 text-[var(--sidebar-active-text)]"
                            : "text-[var(--sidebar-text-muted)]"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="space-y-0.5 px-2 py-1">
                        {unassignedSops.map((sop) => (
                          <Link
                            key={`unassigned-${sop.id}`}
                            href={`/sops/${sop.slug}`}
                            className={`block px-3 py-1.5 rounded-lg text-[13px] leading-snug transition-colors ${
                              isActive(sop.slug)
                                ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] font-medium"
                                : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]"
                            }`}
                          >
                            {sop.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            categories.map((cat) => {
              const catSOPs = sopsByCategory(cat.name);
              if (catSOPs.length === 0) return null;
              return (
                <div key={cat.id} className="mb-1">
                  <h3 className="text-[11px] font-semibold text-[var(--sidebar-text-muted)] uppercase tracking-wider px-4 py-2 mt-2 first:mt-0">
                    {cat.name}
                  </h3>
                  <div className="space-y-0.5 px-2">
                    {catSOPs.map((sop) => (
                      <Link
                        key={sop.id}
                        href={`/sops/${sop.slug}`}
                        className={`block px-3 py-1.5 rounded-lg text-[13px] leading-snug transition-colors ${
                          isActive(sop.slug)
                            ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] font-medium"
                            : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]"
                        }`}
                      >
                        {sop.title}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          )}

        </nav>

        {/* Bottom section: Admin Panel + User info */}
        <div className="border-t border-[var(--sidebar-border)]">
          {isSuperuser && (
            <div className="px-3 pt-4 pb-2">
              <Link
                href="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
                    : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Admin Panel
              </Link>
            </div>
          )}

          {/* User info */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0" title={`${user?.displayName ?? ""} — ${user?.role ? ROLE_LABELS[user.role] : ""}`}>
                <div className="w-9 h-9 rounded-full bg-[var(--sidebar-active-bg)] flex items-center justify-center text-[var(--sidebar-active-text)] text-sm font-semibold flex-shrink-0">
                  {user?.displayName?.charAt(0) || "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--sidebar-text)] truncate">{user?.displayName}</p>
                  <p className="text-xs text-[var(--sidebar-text-muted)] truncate">{user?.role ? ROLE_LABELS[user.role] : ""}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-1.5 rounded-lg text-[var(--sidebar-text-muted)] hover:text-red-400 hover:bg-[var(--sidebar-hover-bg)] transition-colors flex-shrink-0"
                title="Logout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setCollapsed(true)} />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-[var(--modal-overlay)]" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Log Out</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); logout(); }}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--danger)] hover:bg-[var(--danger-hover)] rounded-lg transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
