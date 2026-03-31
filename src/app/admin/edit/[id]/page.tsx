"use client";

import { useSOPs } from "@/contexts/SOPContext";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { SOPStep } from "@/types/database";
import Link from "next/link";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="h-[150px] bg-gray-50 border border-[#E2E8F0] rounded-lg animate-pulse" />,
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
  const { sops, addSOP, updateSOP, categories, addCategory } = useSOPs();
  const isNew = params.id === "new";
  const existing = !isNew ? sops.find((s) => s.id === params.id) : undefined;

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

    if (isNew) {
      await addSOP({
        slug: generateSlug(title),
        title,
        category_id: finalCategoryId,
        description,
        version,
        tags: tagsArray,
        steps: cleanedSteps,
      });
    } else {
      await updateSOP(params.id as string, {
        title,
        category_id: finalCategoryId,
        description,
        version,
        tags: tagsArray,
        steps: cleanedSteps,
      });
    }
    router.push("/admin");
  };

  const inputClass =
    "w-full bg-white border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-gray-900";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <span className="text-gray-900">{isNew ? "New SOP" : "Edit SOP"}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? "Create New SOP" : "Edit SOP"}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/admin")} className="bg-white border border-[#E2E8F0] text-sm rounded-lg px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-colors">
            {saving ? "Saving..." : isNew ? "Create SOP" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
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

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={() => router.push("/admin")} className="bg-white border border-[#E2E8F0] text-sm rounded-lg px-6 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium text-sm rounded-lg px-6 py-2.5 transition-colors">
            {saving ? "Saving..." : isNew ? "Create SOP" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
