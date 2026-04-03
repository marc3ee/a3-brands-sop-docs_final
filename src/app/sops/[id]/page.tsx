"use client";

import { useSOPs } from "@/contexts/SOPContext";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";

export default function SOPDetailPage() {
  const { getSOP, deleteSOP, isLoading } = useSOPs();
  const { isSuperuser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sop = getSOP(params.id as string);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [versions, setVersions] = useState<{ id: string; user_email: string; action: string; details: string | null; created_at: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch version history on demand from audit logs
  useEffect(() => {
    if (showHistory && sop && versions.length === 0) {
      fetch(`/api/sops/${sop.id}/history`)
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setVersions(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [showHistory, sop, versions.length]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDelete = async () => {
    if (!sop) return;
    setDeleting(true);
    setDeleteError(false);
    const success = await deleteSOP(sop.id);
    if (success) {
      toast("SOP deleted successfully.");
      router.push("/sops");
    } else {
      setDeleting(false);
      setDeleteError(true);
      toast("Failed to delete SOP.", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-[var(--border)] rounded w-2/3" />
        <div className="h-4 bg-[var(--border)] rounded w-full" />
        <div className="h-4 bg-[var(--border)] rounded w-3/4" />
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="text-center py-20">
        <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h1 className="text-xl font-bold text-[var(--text)] mb-2">SOP Not Found</h1>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          This document doesn&apos;t exist or you may not have access to it.
        </p>
        <Link href="/sops" className="text-[var(--primary)] hover:underline text-sm">&larr; Back to all SOPs</Link>
      </div>
    );
  }

  const hasContentHtml = sop.content_html && sop.content_html.trim().length > 0;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-6">
        <Link href="/sops" className="hover:text-[var(--primary)] transition-colors">SOPs</Link>
        <span>/</span>
        <span className="hover:text-[var(--primary)] transition-colors cursor-pointer" onClick={() => router.push(`/sops?category=${encodeURIComponent(sop.category_name)}`)}>
          {sop.category_name}
        </span>
        <span>/</span>
        <span className="text-[var(--text)]">{sop.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8 pb-6 border-b border-[var(--border)]">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>{sop.title}</h1>
          {isSuperuser && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/admin/edit/${sop.id}`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary-light)] rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--danger-text)] bg-[var(--danger-light)] hover:bg-[var(--danger-light)] rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
        <p className="text-[var(--text-muted)] mb-4">{sop.description}</p>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-[var(--primary-light)] text-[var(--primary)] px-3 py-1 rounded-full font-medium">{sop.category_name}</span>
          <span className="text-xs text-[var(--text-muted)] font-mono">v{sop.version}</span>
          <span className="text-xs text-[var(--text-muted)]">Last updated: {sop.last_updated}</span>
        </div>
        <div className="flex gap-2 mt-3">
          {sop.tags.map((tag) => (
            <span key={tag} className="text-xs bg-[var(--tag-bg)] text-[var(--text-muted)] px-2 py-0.5 rounded border border-[var(--border)]">{tag}</span>
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
          <div className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl p-6 mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">On this page</h2>
            <ol className="space-y-1.5">
              {sop.steps.map((step, i) => (
                <li key={i}>
                  <a href={`#step-${i}`} className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--primary)]">{i + 1}</span>
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
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-sm font-bold">{i + 1}</span>
                  <h2 className="text-xl font-bold text-[var(--text)]">{step.title}</h2>
                </div>
                <p className="text-[var(--text-muted)] mb-4 leading-relaxed">{step.description}</p>

                {step.richContent && (
                  <div
                    className="rich-content mb-4"
                    dangerouslySetInnerHTML={{ __html: step.richContent }}
                  />
                )}

                {step.warning && (
                  <div className="bg-[var(--warning-bg)] border border-[var(--warning-border)] rounded-lg px-4 py-3 mb-4 flex gap-3">
                    <svg className="w-5 h-5 text-[var(--warning-border)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-[var(--warning-text)]">Warning</p>
                      <p className="text-sm text-[var(--warning-text)] mt-0.5">{step.warning}</p>
                    </div>
                  </div>
                )}

                {step.substeps && (
                  <div className="space-y-2 mb-4">
                    {step.substeps.map((sub, j) => (
                      <div key={j} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-5 h-5 rounded border border-[var(--border)] bg-[var(--bg-hover)] flex items-center justify-center mt-0.5">
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">{j + 1}</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{sub}</p>
                      </div>
                    ))}
                  </div>
                )}

                {step.codeExample && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-t-lg px-4 py-2">
                      <span className="text-xs text-gray-400 font-mono">Example</span>
                      <button
                        onClick={() => handleCopy(step.codeExample!, i)}
                        className={`text-xs transition-colors ${copiedIndex === i ? "text-green-400" : "text-gray-400 hover:text-white"}`}
                      >
                        {copiedIndex === i ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <pre className="bg-gray-900 border border-t-0 border-gray-700 rounded-b-lg p-4 overflow-x-auto">
                      <code className="text-sm font-mono text-gray-300 leading-relaxed whitespace-pre">{step.codeExample}</code>
                    </pre>
                  </div>
                )}

                {step.notes && step.notes.length > 0 && (
                  <div className="bg-[var(--primary-light)] border border-[var(--info-border)] rounded-lg px-4 py-3">
                    <p className="text-xs font-medium text-[var(--primary)] mb-2 uppercase tracking-wider">Notes</p>
                    {step.notes.map((note, k) => (
                      <p key={k} className="text-sm text-[var(--info-text)] leading-relaxed mb-1 last:mb-0">&bull; {note}</p>
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
        <div className="text-center py-12 text-[var(--text-muted)]">
          <p className="text-lg">This SOP has no content yet.</p>
          {isSuperuser && (
            <button
              onClick={() => router.push(`/admin/edit/${sop.id}`)}
              className="mt-4 text-sm text-[var(--primary)] hover:text-[var(--primary)]"
            >
              Click Edit to add content
            </button>
          )}
        </div>
      )}

      {/* Version History */}
      <div className="mt-12 pt-6 border-t border-[var(--border)]">
        <button
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showHistory ? "Hide" : "Show"} Version History
          <svg className={`w-3 h-3 transition-transform ${showHistory ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showHistory && (
          <div className="mb-6">
            {versions.length > 0 ? (
              <div className="space-y-3">
                {versions.map((v, i) => (
                  <div key={v.id} className="flex gap-4 items-start">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${i === 0 ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`} />
                      {i < versions.length - 1 && <div className="w-px h-full bg-[var(--border)] min-h-[40px]" />}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text)]">{v.action === "SOP_CREATED" ? "Created" : "Updated"}</span>
                        <span className="text-xs text-[var(--text-muted)]">&mdash; {new Date(v.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">by {v.user_email}</p>
                      {v.details && (
                        <p className="text-sm text-[var(--text-muted)] mt-1 italic">&ldquo;{v.details}&rdquo;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No version history available.</p>
            )}
          </div>
        )}

        <Link href="/sops" className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">&larr; Back to all SOPs</Link>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-[var(--modal-overlay)]" onClick={() => !deleting && setShowDeleteConfirm(false)} />
          <div className="relative bg-[var(--bg-card)] rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Delete SOP</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Are you sure you want to delete <strong>&ldquo;{sop.title}&rdquo;</strong>? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-[var(--danger-text)] bg-[var(--danger-light)] border border-[var(--danger)] rounded-lg px-3 py-2 mb-4">Failed to delete SOP. Please try again.</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--danger)] hover:bg-[var(--danger-hover)] disabled:opacity-50 rounded-lg transition-colors"
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
