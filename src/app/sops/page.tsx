"use client";

import { useState, useEffect } from "react";
import { useSOPs } from "@/contexts/SOPContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SOPListContent() {
  const { sops, categories, isLoading, deleteSOP } = useSOPs();
  const { isSuperuser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryFilter = searchParams.get("category") || "";
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync search input when URL q param changes (e.g. from header search)
  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.replace(`/sops?${params.toString()}`);
  };

  const filtered = sops.filter((sop) => {
    const matchesCategory = !categoryFilter || sop.category_name === categoryFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      sop.title.toLowerCase().includes(q) ||
      sop.description.toLowerCase().includes(q) ||
      sop.tags.some((t) => t.toLowerCase().includes(q)) ||
      (sop.content_html && sop.content_html.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const [deleteError, setDeleteError] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError(false);
    const success = await deleteSOP(id);
    setDeleting(false);
    if (success) {
      setDeleteConfirmId(null);
    } else {
      setDeleteError(true);
    }
  };

  // Group filtered SOPs by category
  const groupedByCategory = categories
    .map((cat) => ({
      ...cat,
      sops: filtered.filter((s) => s.category_name === cat.name),
    }))
    .filter((group) => group.sops.length > 0);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3 animate-pulse" />
        <div className="h-10 bg-gray-200 rounded-lg w-full animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full mb-1" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {categoryFilter ? categoryFilter : "Knowledge Base"}
        </h1>
        <p className="text-gray-500 text-sm">
          {categoryFilter
            ? `All documentation in "${categoryFilter}"`
            : "Standard Operating Procedures & Documentation"}
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search SOPs by title, description, or content..."
            className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/sops"
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !categoryFilter
              ? "bg-[#2563EB] text-white"
              : "bg-white border border-[#E2E8F0] text-gray-600 hover:border-blue-300 hover:text-blue-600"
          }`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/sops?category=${encodeURIComponent(cat.name)}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === cat.name
                ? "bg-[#2563EB] text-white"
                : "bg-white border border-[#E2E8F0] text-gray-600 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {sops.length === 0 && !search && (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No documents yet</h2>
          <p className="text-sm text-gray-500">SOPs will appear here once they are created and assigned to your role.</p>
        </div>
      )}

      {/* Search with no results */}
      {filtered.length === 0 && (search || categoryFilter) && sops.length > 0 && (
        <div className="text-center py-16">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No results found</h2>
          <p className="text-sm text-gray-500">Try adjusting your search or category filter.</p>
        </div>
      )}

      {/* Grouped SOP Cards */}
      {filtered.length > 0 && (
        <div className="space-y-10">
          {groupedByCategory.map((group) => (
            <div key={group.id}>
              {!categoryFilter && (
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{group.name}</h2>
                  <div className="flex-1 h-px bg-[#E2E8F0]" />
                  <span className="text-xs text-gray-400">
                    {group.sops.length} {group.sops.length === 1 ? "doc" : "docs"}
                  </span>
                </div>
              )}
              <div className="space-y-3">
                {group.sops.map((sop) => (
                  <div
                    key={sop.id}
                    className="bg-white border border-[#E2E8F0] rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <Link href={`/sops/${sop.slug}`} className="flex-1 min-w-0 group/link">
                        <h3 className="text-base font-semibold text-gray-900 group-hover/link:text-[#2563EB] transition-colors">
                          {sop.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sop.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {sop.steps.length > 0 && (
                            <span className="text-xs text-gray-400">{sop.steps.length} sections</span>
                          )}
                          <span className="text-xs text-gray-400">v{sop.version}</span>
                          <div className="flex gap-1.5">
                            {sop.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 ml-4">
                        {isSuperuser && (
                          <>
                            <button
                              onClick={() => router.push(`/admin/edit/${sop.id}`)}
                              title="Edit SOP"
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(sop.id)}
                              title="Delete SOP"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                        <Link href={`/sops/${sop.slug}`} className="group/arrow">
                          <svg className="w-5 h-5 text-gray-300 group-hover/arrow:text-[#2563EB] transition-colors mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete SOP</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>&ldquo;{sops.find((s) => s.id === deleteConfirmId)?.title}&rdquo;</strong>? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">Failed to delete SOP. Please try again.</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SOPListPage() {
  return (
    <Suspense>
      <SOPListContent />
    </Suspense>
  );
}
