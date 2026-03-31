import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth-guard";
import { createServerClient } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const SOP_SYSTEM_PROMPT = `You are an SOP documentation specialist. Given the raw text of a PDF document, extract and reformat it into a clean, structured SOP. Output format: Title (H1), Purpose (paragraph), Scope (bullet list), Roles Involved (bullet list), Step-by-Step Procedure (numbered list with sub-steps), Notes & Warnings (callout blocks). Do not fabricate steps. Use only what is in the source text. Output valid HTML only — no markdown. Use semantic HTML tags: <h1>, <h2>, <p>, <ul>, <ol>, <li>, <blockquote>, <strong>, <em>, <code>. For warnings, wrap them in <blockquote class="warning">. For notes, wrap them in <blockquote class="note">.`;

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractTitleFromHtml(html: string): string {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (match) {
    return match[1].replace(/<[^>]+>/g, "").trim();
  }
  return "Untitled SOP";
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
      return NextResponse.json({ error: "File exceeds 50MB limit." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }

    // Extract text from PDF using pdf-parse v2
    const arrayBuffer = await file.arrayBuffer();
    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    const textResult = await parser.getText();
    const rawText = typeof textResult === "string" ? textResult : String(textResult);

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: "Could not extract text from PDF. The file may be image-based or empty." }, { status: 400 });
    }

    // Send to Anthropic API
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5-20250514",
      max_tokens: 8192,
      system: SOP_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the raw text extracted from a PDF document. Please convert it into a well-structured SOP in HTML format:\n\n${rawText}`,
        },
      ],
    });

    const contentBlock = message.content[0];
    const contentHtml = contentBlock.type === "text" ? contentBlock.text : "";

    // Extract title from generated HTML
    const title = extractTitleFromHtml(contentHtml);
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
        description: `SOP generated from uploaded PDF: ${file.name}`,
        version: "1.0",
        tags: ["uploaded", "ai-generated"],
        steps: [],
        content_html: contentHtml,
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
