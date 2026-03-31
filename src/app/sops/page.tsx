"use client";

import { useState } from "react";
import { useSOPs } from "@/contexts/SOPContext";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SOPListContent() {
  const { sops, categories, isLoading } = useSOPs();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category") || "";
  const [search, setSearch] = useState("");

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
            onChange={(e) => setSearch(e.target.value)}
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
                  <Link
                    key={sop.id}
                    href={`/sops/${sop.slug}`}
                    className="block bg-white border border-[#E2E8F0] rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-[#2563EB] transition-colors">
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
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-[#2563EB] transition-colors flex-shrink-0 mt-1 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
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
