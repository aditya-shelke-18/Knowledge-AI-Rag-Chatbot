import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema/conversations";
import { eq, desc, sql, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// GET /api/conversations — list user's conversations
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allConversations = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));

  return NextResponse.json(allConversations);
}

// POST /api/conversations — create a new conversation
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = body.title || "New Chat";

  const [conversation] = await db
    .insert(conversations)
    .values({ userId, title, messages: [] })
    .returning();

  return NextResponse.json(conversation);
}

// DELETE /api/conversations?id=xxx — delete a conversation
export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }

  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  return NextResponse.json({ message: "Conversation deleted" });
}
