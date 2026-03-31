"use client";

import { useSOPs } from "@/contexts/SOPContext";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

const SOPContentEditor = dynamic(() => import("@/components/SOPContentEditor"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center"><p className="text-gray-500">Loading editor...</p></div>,
});

export default function SOPDetailPage() {
  const { getSOP, updateSOP, isLoading } = useSOPs();
  const { isSuperuser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const sop = getSOP(params.id as string);
  const [editing, setEditing] = useState(false);

  const handleSave = useCallback(async (html: string) => {
    if (!sop) return;
    await fetch(`/api/sops/${sop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_html: html }),
    });
    // Refresh the SOP in context without page reload
    await updateSOP(sop.id, { content_html: html });
    setEditing(false);
  }, [sop, updateSOP]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">SOP Not Found</h1>
        <p className="text-gray-500 mb-4">The requested SOP does not exist.</p>
        <Link href="/sops" className="text-blue-600 hover:underline text-sm">&larr; Back to all SOPs</Link>
      </div>
    );
  }

  // Show editor overlay
  if (editing && sop.content_html !== null) {
    return (
      <SOPContentEditor
        sopId={sop.id}
        initialContent={sop.content_html}
        onSave={handleSave}
        onClose={() => setEditing(false)}
      />
    );
  }

  const hasContentHtml = sop.content_html && sop.content_html.trim().length > 0;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/sops" className="hover:text-blue-600 transition-colors">SOPs</Link>
        <span>/</span>
        <span className="hover:text-blue-600 transition-colors cursor-pointer" onClick={() => router.push(`/sops?category=${encodeURIComponent(sop.category_name)}`)}>
          {sop.category_name}
        </span>
        <span>/</span>
        <span className="text-gray-900">{sop.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{sop.title}</h1>
          {isSuperuser && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
        <p className="text-gray-500 mb-4">{sop.description}</p>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">{sop.category_name}</span>
          <span className="text-xs text-gray-500 font-mono">v{sop.version}</span>
          <span className="text-xs text-gray-500">Last updated: {sop.last_updated}</span>
        </div>
        <div className="flex gap-2 mt-3">
          {sop.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{tag}</span>
          ))}
        </div>
      </div>

      {/* Content HTML (AI-generated SOPs) */}
      {hasContentHtml && (
        <div
          className="sop-content prose prose-blue max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: sop.content_html! }}
        />
      )}

      {/* Steps (manually created SOPs) */}
      {!hasContentHtml && sop.steps.length > 0 && (
        <>
          {/* Table of Contents */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">On this page</h2>
            <ol className="space-y-1.5">
              {sop.steps.map((step, i) => (
                <li key={i}>
                  <a href={`#step-${i}`} className="text-sm text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-2">
                    <span className="font-mono text-xs text-blue-600">{i + 1}</span>
                    {step.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* Steps */}
          <div className="space-y-10">
            {sop.steps.map((step, i) => (
              <section key={i} id={`step-${i}`} className="scroll-mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">{i + 1}</span>
                  <h2 className="text-xl font-bold text-gray-900">{step.title}</h2>
                </div>
                <p className="text-gray-500 mb-4 leading-relaxed">{step.description}</p>

                {step.richContent && (
                  <div
                    className="rich-content mb-4"
                    dangerouslySetInnerHTML={{ __html: step.richContent }}
                  />
                )}

                {step.warning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex gap-3">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-amber-700">Warning</p>
                      <p className="text-sm text-amber-600 mt-0.5">{step.warning}</p>
                    </div>
                  </div>
                )}

                {step.substeps && (
                  <div className="space-y-2 mb-4">
                    {step.substeps.map((sub, j) => (
                      <div key={j} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-5 h-5 rounded border border-gray-300 bg-gray-50 flex items-center justify-center mt-0.5">
                          <span className="text-[10px] text-gray-500 font-mono">{j + 1}</span>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed">{sub}</p>
                      </div>
                    ))}
                  </div>
                )}

                {step.codeExample && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-t-lg px-4 py-2">
                      <span className="text-xs text-gray-400 font-mono">Example</span>
                      <button onClick={() => navigator.clipboard.writeText(step.codeExample!)} className="text-xs text-gray-400 hover:text-white transition-colors">Copy</button>
                    </div>
                    <pre className="bg-gray-900 border border-t-0 border-gray-700 rounded-b-lg p-4 overflow-x-auto">
                      <code className="text-sm font-mono text-gray-300 leading-relaxed whitespace-pre">{step.codeExample}</code>
                    </pre>
                  </div>
                )}

                {step.notes && step.notes.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <p className="text-xs font-medium text-blue-600 mb-2 uppercase tracking-wider">Notes</p>
                    {step.notes.map((note, k) => (
                      <p key={k} className="text-sm text-blue-700 leading-relaxed mb-1 last:mb-0">&bull; {note}</p>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!hasContentHtml && sop.steps.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">This SOP has no content yet.</p>
          {isSuperuser && (
            <button
              onClick={() => setEditing(true)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              Click Edit to add content
            </button>
          )}
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-gray-200 flex justify-between">
        <Link href="/sops" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">&larr; Back to all SOPs</Link>
      </div>
    </>
  );
}
