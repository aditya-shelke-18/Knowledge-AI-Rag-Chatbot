import { createResource } from "@/lib/actions/resources";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema/files";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const { text } = await pdfParse(buffer);
    return text;
  }

  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv")
  ) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    return workbook.SheetNames.map((sheet) =>
      XLSX.utils.sheet_to_csv(workbook.Sheets[sheet])
    ).join("\n");
  }

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  return buffer.toString("utf-8");
}

function getFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const typeMap: Record<string, string> = {
    pdf: "pdf",
    xlsx: "excel",
    xls: "excel",
    csv: "csv",
    docx: "word",
    doc: "word",
    txt: "text",
    md: "markdown",
  };
  return typeMap[ext] ?? "text";
}

/**
 * Sentence-aware chunking with overlap for upload.
 * Splits on sentence boundaries, targets ~800 chars per chunk with ~150 overlap.
 */
function chunkText(text: string, targetSize = 800, overlap = 150): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  const sentenceEndings = /(?<=[.!?])\s+|(?<=\n\n)/g;
  const sentences = cleaned
    .split(sentenceEndings)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return [cleaned];

  const chunks: string[] = [];
  let currentChunk = "";
  let overlapBuffer = "";

  for (const sentence of sentences) {
    if (
      currentChunk.length + sentence.length > targetSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      overlapBuffer = currentChunk.slice(-overlap).trim();
      currentChunk = overlapBuffer ? overlapBuffer + " " + sentence : sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_FILE_SIZE)
    return NextResponse.json(
      { error: `File too large. Maximum size is 10MB.` },
      { status: 400 }
    );

  let text: string;
  try {
    text = await extractText(file);
  } catch (e) {
    console.error("extractText error:", e);
    return NextResponse.json(
      { error: `Failed to parse file: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  if (!text.trim())
    return NextResponse.json(
      { error: "No text content found in file" },
      { status: 400 }
    );

  const chunks = chunkText(text);

  // Create file record in database
  const [fileRecord] = await db
    .insert(files)
    .values({
      userId: session.user.id,
      name: file.name,
      type: getFileType(file.name),
      size: file.size,
      chunkCount: chunks.length,
    })
    .returning();

  // Create resource + embeddings for each chunk, linked to the file and user
  await Promise.all(
    chunks.map((chunk) =>
      createResource(
        { content: chunk, fileId: fileRecord.id },
        file.name,
        session.user.id
      )
    )
  );

  return NextResponse.json({
    message: `✅ Uploaded "${file.name}" — ${chunks.length} chunks processed`,
    file: fileRecord,
  });
}
