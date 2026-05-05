import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth-guard";
import { createServerClient } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import Anthropic from "@anthropic-ai/sdk";
import type { SOPStep } from "@/types/database";

// Claude's document API limit is 32MB per PDF.
const MAX_FILE_SIZE = 32 * 1024 * 1024;

const SOP_SYSTEM_PROMPT = `You are a document transcriber. You will be given a PDF (which may include scanned pages, screenshots, diagrams, or tables). Your job is to faithfully transcribe its contents and place them into the JSON structure below — NOT to author or rewrite an SOP.

Return ONLY a JSON object — no prose, no markdown fences, no explanation — matching this exact shape:

{
  "title": string,                  // copy the document's own title verbatim (or its main heading if no explicit title)
  "description": string,            // copy any subtitle / purpose / overview sentence verbatim from the document; "" if none exists
  "steps": [
    {
      "title": string,              // copy the section/step heading verbatim from the document
      "description": string,        // copy the body text under that heading verbatim
      "substeps": string[]?,        // copy bulleted/numbered sub-items verbatim, in order
      "notes": string[]?,           // copy items the document itself marks as notes/captions/callouts
      "warning": string?,           // copy items the document itself marks as warnings/cautions
      "codeExample": string?        // copy any code, command, URL, or template block verbatim
    }
  ]
}

Strict rules — read carefully:
- TRANSCRIBE, DO NOT REPHRASE. Use the exact wording from the document. Do not paraphrase, summarize, soften, or convert to imperative voice.
- DO NOT INVENT CONTENT. If the document has no purpose statement, leave description as "". If a section has no body text, omit "description"… actually since "description" is required, copy the section heading text again rather than inventing.
- DO NOT ADD STRUCTURE THAT ISN'T THERE. No fabricated "Purpose", "Scope", "Roles", "Prerequisites" sections unless those exact sections exist in the document.
- PRESERVE ORDER. Steps appear in the same order as the source document.
- PRESERVE GRANULARITY. If the document has 7 sections, return 7 steps. Do not merge or split. Do not skip sections.
- Read text inside screenshots/scanned pages and transcribe it the same way as native text. Treat a screenshot of a workflow diagram as a step whose description is the diagram's labels/caption.
- Only populate "warning" / "notes" if the source document explicitly marks something as a warning, caution, note, or tip. Do not reclassify normal body text into these slots.
- Plain text only in string fields (no HTML, no markdown).
- Omit empty optional fields entirely (do not emit empty strings or empty arrays).
- Output must be valid JSON parseable by JSON.parse — no trailing commas, no comments.

Your output is an exact mirror of the source document, just placed into this JSON shape.`;

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractJson(text: string): string {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return t.slice(start, end + 1);
  }
  return t;
}

interface ParsedSOP {
  title: string;
  description: string;
  steps: SOPStep[];
}

function sanitizeSteps(raw: unknown): SOPStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s): SOPStep | null => {
      if (!s || typeof s !== "object") return null;
      const o = s as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title.trim() : "";
      const description = typeof o.description === "string" ? o.description.trim() : "";
      if (!title || !description) return null;
      const step: SOPStep = { title, description };
      if (Array.isArray(o.substeps)) {
        const subs = o.substeps.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
        if (subs.length) step.substeps = subs;
      }
      if (Array.isArray(o.notes)) {
        const notes = o.notes.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
        if (notes.length) step.notes = notes;
      }
      if (typeof o.warning === "string" && o.warning.trim()) step.warning = o.warning.trim();
      if (typeof o.codeExample === "string" && o.codeExample.trim()) step.codeExample = o.codeExample;
      return step;
    })
    .filter((s): s is SOPStep => s !== null);
}

export async function POST(req: NextRequest) {
  // Enforce SUPERUSER role server-side
  const userOrRes = requireSuperuser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 32MB limit." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }

    // Send the PDF directly to Claude as a document block. Claude reads both
    // the embedded text layer AND the visual content (screenshots, scanned
    // pages, diagrams), so image-based PDFs work without a separate OCR step.
    const arrayBuffer = await file.arrayBuffer();
    const base64Pdf = Buffer.from(arrayBuffer).toString("base64");

    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: SOP_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: "Transcribe the attached PDF into the JSON structure described in the system prompt. Use the document's own wording verbatim. Do not paraphrase, do not invent sections, do not skip sections. Read text inside screenshots and scanned pages and include it the same way.",
            },
          ],
        },
      ],
    });

    const contentBlock = message.content[0];
    const rawResponse = contentBlock.type === "text" ? contentBlock.text : "";

    let parsed: ParsedSOP;
    try {
      const jsonText = extractJson(rawResponse);
      const obj = JSON.parse(jsonText) as Record<string, unknown>;
      parsed = {
        title: typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : "Untitled SOP",
        description: typeof obj.description === "string" ? obj.description.trim() : "",
        steps: sanitizeSteps(obj.steps),
      };
    } catch {
      return NextResponse.json(
        { error: "AI returned an unparseable response. Please try again or use manual entry." },
        { status: 502 }
      );
    }

    if (parsed.steps.length === 0) {
      return NextResponse.json(
        { error: "Could not extract any structured steps from this PDF. Try a more clearly formatted document." },
        { status: 422 }
      );
    }

    const title = parsed.title;
    const slug = generateSlug(title) + "-" + Date.now().toString(36);

    // Get or create a default category for uploaded SOPs
    const supabase = createServerClient();
    let categoryId: string;

    const { data: existingCat } = await supabase
      .from("categories")
      .select("id")
      .eq("name", "Uploaded SOPs")
      .single();

    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      const { data: newCat } = await supabase
        .from("categories")
        .insert({ name: "Uploaded SOPs", sort_order: 99 })
        .select("id")
        .single();
      categoryId = newCat!.id;
    }

    // Store in database
    const { data: sop, error } = await supabase
      .from("sops")
      .insert({
        slug,
        title,
        category_id: categoryId,
        description: parsed.description || `SOP generated from uploaded PDF: ${file.name}`,
        version: "1.0",
        tags: ["uploaded", "ai-generated"],
        steps: parsed.steps,
        content_html: null,
        role_visibility: [],
        created_by: user.email,
        last_updated: new Date().toISOString().split("T")[0],
      })
      .select("*, categories(name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit
    await logAudit(user, "PDF_UPLOAD", sop.id, title, `Uploaded file: ${file.name}`);
    await logAudit(user, "SOP_GENERATED", sop.id, title, "AI-generated SOP from PDF upload");

    return NextResponse.json(sop, { status: 201 });
  } catch (err) {
    console.error("PDF upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process PDF." },
      { status: 500 }
    );
  }
}
