import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema/conversations";
import { eq, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/conversations — list all conversations (without full messages for sidebar)
export async function GET() {
  const allConversations = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .orderBy(desc(conversations.updatedAt));

  return NextResponse.json(allConversations);
}

// POST /api/conversations — create a new conversation
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title = body.title || "New Chat";

  const [conversation] = await db
    .insert(conversations)
    .values({ title, messages: [] })
    .returning();

  return NextResponse.json(conversation);
}

// DELETE /api/conversations?id=xxx — delete a conversation
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }

  await db.delete(conversations).where(eq(conversations.id, id));
  return NextResponse.json({ message: "Conversation deleted" });
}
