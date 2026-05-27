import { db } from "@/lib/db";
import { chatbots } from "@/lib/db/schema/chatbots";
import { eq } from "drizzle-orm";
import { findRelevantContent } from "@/lib/ai/embedding";
import { openai } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: { apiKey: string } }
) {
  const [bot] = await db
    .select()
    .from(chatbots)
    .where(eq(chatbots.apiKey, params.apiKey));

  if (!bot) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const body = await req.json();
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const settings = bot.settings as any;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `You are ${settings.botName || "AI Assistant"}, a helpful assistant that answers questions strictly based on the uploaded knowledge base documents.
- Always call getInformation first to search the knowledge base.
- Answer ONLY from the knowledge base. Never use general knowledge.
- If no relevant content is found, respond warmly: acknowledge the question, explain that topic isn't covered in the available knowledge base, suggest they try rephrasing or ask something else, and invite them to contact the support team for further help.
- Be concise and friendly.`,
    messages,
    tools: {
      getInformation: tool({
        description: "Search the knowledge base",
        inputSchema: z.object({
          question: z.string(),
        }),
        execute: async ({ question }) => findRelevantContent(question, bot.userId, bot.id),
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(
  req: Request,
  { params }: { params: { apiKey: string } }
) {
  const [bot] = await db
    .select({ settings: chatbots.settings, name: chatbots.name })
    .from(chatbots)
    .where(eq(chatbots.apiKey, params.apiKey));

  if (!bot) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  return NextResponse.json(bot, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
