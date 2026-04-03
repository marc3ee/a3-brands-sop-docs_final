"use client";

import { useSOPs } from "@/contexts/SOPContext";
import { useState, useEffect } from "react";
import type { SOPStep } from "@/types/database";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="h-[150px] bg-gray-50 border border-[#E2E8F0] rounded-lg animate-pulse" />,
});

const emptyStep: SOPStep = {
  title: "",
  description: "",
  substeps: [""],
  notes: [],
  warning: "",
  codeExample: "",
  richContent: "",
};

interface SOPEditModalProps {
  sopId: string;
  onClose: () => void;
  onSaved?: () => void;
  onDelete?: () => void;
}

export default function SOPEditModal({ sopId, onClose, onSaved, onDelete }: SOPEditModalProps) {
  const { sops, updateSOP, deleteSOP, categories, addCategory } = useSOPs();
  const existing = sops.find((s) => s.id === sopId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0");
  const [tags, setTags] = useState("");
  const [steps, setSteps] = useState<SOPStep[]>([{ ...emptyStep, substeps: [""] }]);
  const [saving, setSaving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setCategoryId(existing.category_id);
      setDescription(existing.description);
      setVersion(existing.version);
      setTags(existing.tags.join(", "));
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

  const handleSave = async () => {
    setSaving(true);
    let finalCategoryId = categoryId;

    if (newCategory) {
      const created = await addCategory(newCategory);
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

    await updateSOP(sopId, {
      title,
      category_id: finalCategoryId,
      description,
      version,
      tags: tagsArray,
      steps: cleanedSteps,
    });

    setSaving(false);
    onSaved?.();
    onClose();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteSOP(sopId);
    setDeleting(false);
    onDelete?.();
    onClose();
  };

  const inputClass =
    "w-full bg-white border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-gray-900";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#F8FAFC] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl mt-[5vh] mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E2E8F0] rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
          <h1 className="text-xl font-bold text-gray-900">Edit SOP</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="border border-red-200 text-red-600 hover:bg-red-50 text-sm rounded-lg px-4 py-2 transition-colors"
            >
              Delete
            </button>
            <button onClick={onClose} className="bg-white border border-[#E2E8F0] text-sm rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium text-sm rounded-lg px-4 py-2 transition-colors">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
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

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Steps</h2>
              <button onClick={addStep} className="text-xs bg-blue-50 text-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors font-medium">+ Add Step</button>
            </div>

            {steps.map((step, i) => {
              const isExpanded = expandedSteps.has(i);
              return (
                <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleStep(i)}
                  >
                    <h3 className="font-semibold flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="text-sm text-gray-900">{step.title || `Step ${i + 1}`}</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {steps.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeStep(i); }}
                          className="text-xs text-red-500 hover:text-red-600 transition-colors px-2 py-1"
                        >
                          Remove
                        </button>
                      )}
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 space-y-4 border-t border-[#E2E8F0]">
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
                          <span className="text-gray-500 font-normal ml-2 text-xs">(screenshots, formatted text, images)</span>
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
                          <button onClick={() => addSubstep(i)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add</button>
                        </div>
                        {(step.substeps || []).map((sub, j) => (
                          <div key={j} className="flex gap-2 mb-2">
                            <input type="text" value={sub} onChange={(e) => updateSubstep(i, j, e.target.value)} className={`${inputClass} flex-1`} placeholder={`Substep ${j + 1}`} />
                            {(step.substeps || []).length > 1 && (
                              <button onClick={() => removeSubstep(i, j)} className="text-xs text-red-500 hover:text-red-600 px-2">x</button>
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

          {/* Bottom actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={onClose} className="bg-white border border-[#E2E8F0] text-sm rounded-lg px-6 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium text-sm rounded-lg px-6 py-2.5 transition-colors">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !deleting && setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete SOP</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete &ldquo;{existing?.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
