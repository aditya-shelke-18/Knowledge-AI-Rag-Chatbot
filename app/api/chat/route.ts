import { createResource } from "@/lib/actions/resources";
import { openai } from "@ai-sdk/openai";
import { findRelevantContent } from "@/lib/ai/embedding";
import { convertToModelMessages, streamText, tool, UIMessage, stepCountIs } from "ai";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();
  const messages: UIMessage[] = Array.isArray(body.messages) ? body.messages : [];

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `You are an AI assistant that answers questions STRICTLY based on the uploaded knowledge base documents.

## Instructions
- When a user asks a question, ALWAYS call getInformation first to search the knowledge base.
- Answer ONLY using information found in the knowledge base. Do NOT use your own training knowledge.
- **Always cite your sources**: When you use information from a document, mention the source file name in your response like this: *(Source: filename.pdf)*
- If multiple sources are relevant, cite each one where used.
- Use markdown features like headings, bullet points, code blocks, and tables when they improve clarity.
- If the knowledge base returns no relevant results, respond with: "I don't have any information about that in the uploaded documents. Please upload a relevant file first."
- To save new information the user provides, call addResource.
- Never answer from general knowledge — only from documents in the knowledge base.`,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      addResource: tool({
        description: "Save new information to the knowledge base.",
        inputSchema: z.object({
          content: z.string().describe("the content to save"),
        }),
        execute: async ({ content }) => createResource({ content }, undefined, userId),
      }),
      getInformation: tool({
        description:
          "Search the knowledge base to answer a question. Returns relevant content chunks with source file names for citation.",
        inputSchema: z.object({
          question: z.string().describe("the question to search for"),
        }),
        execute: async ({ question }) => findRelevantContent(question, userId),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
