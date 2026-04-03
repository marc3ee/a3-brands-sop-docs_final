"use client";

import { useSOPs } from "@/contexts/SOPContext";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { SOPStep } from "@/types/database";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useToast } from "@/contexts/ToastContext";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="h-[150px] bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg animate-pulse" />,
});

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const emptyStep: SOPStep = {
  title: "",
  description: "",
  substeps: [""],
  notes: [],
  warning: "",
  codeExample: "",
  richContent: "",
};

export default function EditSOPPage() {
  const params = useParams();
  const router = useRouter();
  const { sops, addSOP, updateSOP, categories, addCategory, isLoading } = useSOPs();
  const { toast } = useToast();
  const isNew = params.id === "new";
  const existing = !isNew ? sops.find((s) => s.id === params.id) : undefined;
  const backUrl = existing ? `/sops/${existing.slug}` : "/sops";

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0");
  const [tags, setTags] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [steps, setSteps] = useState<SOPStep[]>([{ ...emptyStep, substeps: [""] }]);
  const [changeNote, setChangeNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const hasContentHtml = existing?.content_html && existing.content_html.trim().length > 0;

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setCategoryId(existing.category_id);
      setDescription(existing.description);
      setVersion(existing.version);
      setTags(existing.tags.join(", "));
      setContentHtml(existing.content_html || "");
      setSteps(existing.steps.map((s) => ({ ...s, substeps: s.substeps || [""], richContent: s.richContent || "" })));
      setExpandedSteps(new Set([0]));
    }
  }, [existing]);

  const updateStep = (index: number, field: keyof SOPStep, value: string | string[]) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addStep = () => {
    const newIndex = steps.length;
    setSteps((prev) => [...prev, { ...emptyStep, substeps: [""] }]);
    setExpandedSteps((prev) => new Set([...prev, newIndex]));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateSubstep = (stepIndex: number, subIndex: number, value: string) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        const subs = [...(s.substeps || [])];
        subs[subIndex] = value;
        return { ...s, substeps: subs };
      })
    );
  };

  const addSubstep = (stepIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        return { ...s, substeps: [...(s.substeps || []), ""] };
      })
    );
  };

  const removeSubstep = (stepIndex: number, subIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        return { ...s, substeps: (s.substeps || []).filter((_, j) => j !== subIndex) };
      })
    );
  };

  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!categoryId && !newCategory.trim()) {
      setError("Please select a category or create a new one.");
      return;
    }

    setSaving(true);
    let finalCategoryId = categoryId;

    if (newCategory.trim()) {
      const created = await addCategory(newCategory.trim());
      finalCategoryId = created?.id || categoryId;
    }

    const cleanedSteps = steps.map((s) => ({
      ...s,
      substeps: (s.substeps || []).filter((sub) => sub.trim()),
      notes: (s.notes || []).filter((n) => n.trim()),
      warning: s.warning || undefined,
      codeExample: s.codeExample || undefined,
      richContent: s.richContent || undefined,
    }));

    const tagsArray = tags.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      if (isNew) {
        const created = await addSOP({
          slug: generateSlug(title),
          title,
          category_id: finalCategoryId,
          description,
          version,
          tags: tagsArray,
          steps: cleanedSteps,
          content_html: contentHtml || undefined,
        });
        toast("SOP created successfully.");
        router.push(created ? `/sops/${created.slug}` : "/sops");
      } else {
        await updateSOP(params.id as string, {
          title,
          category_id: finalCategoryId,
          description,
          version,
          tags: tagsArray,
          steps: cleanedSteps,
          content_html: contentHtml || undefined,
          change_note: changeNote || undefined,
        });
        toast("SOP updated successfully.");
        router.push(backUrl);
      }
    } catch {
      setError("Failed to save SOP. Please try again.");
      toast("Failed to save SOP.", "error");
      setSaving(false);
    }
  };

  const inputClass =
    "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors text-[var(--text)]";
  const labelClass = "block text-sm font-medium text-[var(--text-muted)] mb-1.5";

  // Show loading skeleton while SOP data is loading
  if (isLoading && !isNew) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-4 bg-[var(--border)] rounded w-32 mb-2" />
            <div className="h-8 bg-[var(--border)] rounded w-48" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-[var(--border)] rounded-lg w-20" />
            <div className="h-10 bg-[var(--border)] rounded-lg w-32" />
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <div className="h-5 bg-[var(--border)] rounded w-40 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 h-10 bg-[var(--tag-bg)] rounded-lg" />
            <div className="h-10 bg-[var(--tag-bg)] rounded-lg" />
            <div className="h-10 bg-[var(--tag-bg)] rounded-lg" />
            <div className="h-10 bg-[var(--tag-bg)] rounded-lg" />
            <div className="h-10 bg-[var(--tag-bg)] rounded-lg" />
            <div className="col-span-2 h-20 bg-[var(--tag-bg)] rounded-lg" />
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <div className="h-5 bg-[var(--border)] rounded w-24 mb-4" />
          <div className="h-12 bg-[var(--tag-bg)] rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <nav className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-2">
            <Link href={backUrl} className="hover:text-[var(--primary)]">{existing ? existing.title : "SOPs"}</Link>
            <span>/</span>
            <span className="text-[var(--text)]">{isNew ? "New SOP" : "Edit"}</span>
          </nav>
          <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>{isNew ? "Create New SOP" : "Edit SOP"}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push(backUrl)} className="bg-[var(--bg-card)] border border-[var(--border)] text-sm rounded-lg px-4 py-2.5 text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors">
            {saving ? "Saving..." : isNew ? "Create SOP" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-[var(--danger-light)] border border-[var(--danger)] rounded-lg text-sm text-[var(--danger-text)]">{error}</div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="SOP title" />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Or create new category</label>
              <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className={inputClass} placeholder="New category name" />
            </div>
            <div>
              <label className={labelClass}>Version</label>
              <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} className={inputClass} placeholder="1.0" />
            </div>
            <div>
              <label className={labelClass}>Tags (comma-separated)</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder="tag1, tag2, tag3" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} min-h-[80px]`} placeholder="Brief description of this SOP" />
            </div>
          </div>
        </div>

        {/* Content HTML (for AI-generated SOPs) */}
        {hasContentHtml && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-1">Content</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">This SOP uses rich HTML content (e.g. generated from a PDF upload).</p>
            <RichTextEditor
              content={contentHtml}
              onChange={setContentHtml}
              placeholder="Edit the SOP content here..."
            />
          </div>
        )}

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text)]">Steps</h2>
            <button onClick={addStep} className="text-xs bg-[var(--primary-light)] text-[var(--primary)] rounded-lg px-3 py-1.5 hover:bg-[var(--primary-light)] transition-colors font-medium">+ Add Step</button>
          </div>

          {steps.map((step, i) => {
            const isExpanded = expandedSteps.has(i);
            return (
              <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                  onClick={() => toggleStep(i)}
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="text-sm text-[var(--text)]">{step.title || `Step ${i + 1}`}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {steps.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeStep(i); }}
                        className="text-xs text-[var(--danger)] hover:text-[var(--danger)] transition-colors px-2 py-1"
                      >
                        Remove
                      </button>
                    )}
                    <svg
                      className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4 border-t border-[var(--border)]">
                    <div className="pt-4">
                      <label className={labelClass}>Step Title</label>
                      <input type="text" value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)} className={inputClass} placeholder="Step title" />
                    </div>
                    <div>
                      <label className={labelClass}>Description</label>
                      <textarea value={step.description} onChange={(e) => updateStep(i, "description", e.target.value)} className={`${inputClass} min-h-[60px]`} placeholder="Step description" />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Rich Content
                        <span className="text-[var(--text-muted)] font-normal ml-2 text-xs">(screenshots, formatted text, images)</span>
                      </label>
                      <RichTextEditor
                        content={step.richContent || ""}
                        onChange={(html) => updateStep(i, "richContent", html)}
                        placeholder="Add screenshots, formatted text, or images here..."
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={labelClass}>Substeps</label>
                        <button onClick={() => addSubstep(i)} className="text-xs text-[var(--primary)] hover:text-[var(--primary)] font-medium">+ Add</button>
                      </div>
                      {(step.substeps || []).map((sub, j) => (
                        <div key={j} className="flex gap-2 mb-2">
                          <input type="text" value={sub} onChange={(e) => updateSubstep(i, j, e.target.value)} className={`${inputClass} flex-1`} placeholder={`Substep ${j + 1}`} />
                          {(step.substeps || []).length > 1 && (
                            <button onClick={() => removeSubstep(i, j)} className="text-xs text-[var(--danger)] hover:text-[var(--danger)] px-2">x</button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className={labelClass}>Warning (optional)</label>
                      <input type="text" value={step.warning || ""} onChange={(e) => updateStep(i, "warning", e.target.value)} className={inputClass} placeholder="Warning message" />
                    </div>

                    <div>
                      <label className={labelClass}>Code Example (optional)</label>
                      <textarea value={step.codeExample || ""} onChange={(e) => updateStep(i, "codeExample", e.target.value)} className={`${inputClass} min-h-[100px] font-mono text-xs`} placeholder="Code example" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Change note (only for edits) */}
        {!isNew && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
            <label className={labelClass}>Change Note <span className="text-[var(--text-muted)] font-normal">(optional - describe what you changed)</span></label>
            <input
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              className={inputClass}
              placeholder='e.g. "Updated deployment steps for new CMS platform"'
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={() => router.push(backUrl)} className="bg-[var(--bg-card)] border border-[var(--border)] text-sm rounded-lg px-6 py-2.5 text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-medium text-sm rounded-lg px-6 py-2.5 transition-colors">
            {saving ? "Saving..." : isNew ? "Create SOP" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
