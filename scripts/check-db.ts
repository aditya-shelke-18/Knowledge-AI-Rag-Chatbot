import postgres from "postgres";
import * as dotenv from "dotenv";
import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";

dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const embeddingModel = openaiProvider.embedding("text-embedding-ada-002");

async function main() {
  const query = "SQL joins and queries";
  console.log(`\n🔍 Testing similarity search for: "${query}"\n`);

  const { embedding: queryVec } = await embed({
    model: embeddingModel,
    value: query,
  });

  // Build vector string for raw SQL
  const vecStr = JSON.stringify(queryVec);

  // Run similarity search with NO threshold to see raw scores
  const results = (await sql.unsafe(`
    SELECT content, file_name,
           1 - (embedding <=> '${vecStr}'::vector) AS similarity
    FROM embeddings
    ORDER BY similarity DESC
    LIMIT 10
  `)) as Array<{ content: string; file_name: string; similarity: string }>;

  console.log("Top 10 results (no threshold):");
  for (const row of results) {
    console.log(
      `  similarity=${parseFloat(row.similarity).toFixed(4)}  file=${row.file_name}  snippet="${row.content.slice(0, 80)}..."`
    );
  }

  await sql.end();
}

main().catch(console.error);
