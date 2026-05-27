import { createResource } from "@/lib/actions/resources";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema/files";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function chunkText(text: string, targetSize = 800, overlap = 150): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  if (sentences.length === 0) return [cleaned];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current.length + sentence.length > targetSize && current.length > 0) {
      chunks.push(current.trim());
      current = current.slice(-overlap) + " " + sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, chatbotId } = await req.json();
  if (!url || !/^https?:\/\/.+/.test(url))
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KnowledgeAI/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch URL: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  const text = htmlToText(html);
  if (!text.trim())
    return NextResponse.json(
      { error: "No readable content found at that URL" },
      { status: 400 }
    );

  const chunks = chunkText(text);
  const hostname = new URL(url).hostname;

  const [fileRecord] = await db
    .insert(files)
    .values({
      userId: session.user.id,
      chatbotId: chatbotId ?? null,
      name: url,
      type: "website",
      size: Buffer.byteLength(text, "utf8"),
      chunkCount: chunks.length,
    })
    .returning();

  await Promise.all(
    chunks.map((chunk) =>
      createResource(
        { content: chunk, fileId: fileRecord.id },
        hostname,
        session.user.id,
        chatbotId ?? undefined
      )
    )
  );

  return NextResponse.json({
    message: `✅ Scraped "${hostname}" — ${chunks.length} chunks indexed`,
    file: fileRecord,
  });
}
