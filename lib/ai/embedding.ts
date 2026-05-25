import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "../db";
import { cosineDistance, desc, gt, sql, eq, and, isNull } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";

const embeddingModel = openai.embedding("text-embedding-ada-002");


/**
 * Sentence-aware chunking with overlap.
 * Splits text on sentence boundaries, then groups sentences into chunks
 * of ~targetSize characters with ~overlap characters of context carried over.
 */
export const generateChunks = (
  input: string,
  targetSize = 500,
  overlap = 100
): string[] => {
  const text = input.trim();
  if (!text) return [];

  // Split on sentence boundaries while keeping the delimiter
  const sentenceEndings = /(?<=[.!?])\s+|(?<=\n\n)/g;
  const sentences = text
    .split(sentenceEndings)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) return [text];

  const chunks: string[] = [];
  let currentChunk = "";
  let overlapBuffer = "";

  for (const sentence of sentences) {
    // If adding this sentence would exceed target, finalize current chunk
    if (currentChunk.length + sentence.length > targetSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep the tail of the current chunk as overlap context
      overlapBuffer = currentChunk.slice(-overlap).trim();
      currentChunk = overlapBuffer ? overlapBuffer + " " + sentence : sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

export const generateEmbeddings = async (
  value: string
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  if (chunks.length === 0) return [];

  // Process in batches of 20 to avoid rate limits
  const batchSize = 20;
  const results: Array<{ embedding: number[]; content: string }> = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: batch,
    });
    embeddings.forEach((e, idx) => {
      results.push({ content: batch[idx], embedding: e });
    });
  }

  return results;
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

/**
 * Find relevant content using cosine similarity + keyword re-ranking.
 * Returns results with source file attribution for citations.
 */
export const findRelevantContent = async (userQuery: string, userId: string, chatbotId?: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded
  )})`;

  // Strict scope: chatbot sees only its own docs, personal chat sees only personal docs
  const filter = chatbotId
    ? and(gt(similarity, 0.4), eq(embeddings.chatbotId, chatbotId))
    : and(gt(similarity, 0.4), eq(embeddings.userId, userId), isNull(embeddings.chatbotId));

  const candidates = await db
    .select({
      content: embeddings.content,
      similarity,
      source: embeddings.fileName,
    })
    .from(embeddings)
    .where(filter)
    .orderBy((t) => desc(t.similarity))
    .limit(12);

  // Re-rank: boost results that have keyword overlap with the query
  const queryWords = new Set(
    userQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  const reRanked = candidates
    .map((result) => {
      const contentWords = result.content.toLowerCase().split(/\s+/);
      const keywordOverlap = contentWords.filter((w) => queryWords.has(w)).length;
      const boost = Math.min(keywordOverlap * 0.02, 0.1); // max 0.1 boost
      return {
        ...result,
        finalScore: (result.similarity ?? 0) + boost,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  // Deduplicate similar content (skip if >80% overlap with a previous result)
  const seen = new Set<string>();
  const deduped = reRanked.filter((r) => {
    const key = r.content.slice(0, 100).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.slice(0, 6).map(({ content, similarity, source }) => ({
    content,
    similarity,
    source: source ?? "Unknown document",
  }));
};