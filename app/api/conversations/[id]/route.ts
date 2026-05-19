import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema/conversations";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/conversations/[id] — get a single conversation with messages
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.id));

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

// PATCH /api/conversations/[id] — update conversation title and/or messages
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const updates: Record<string, any> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.messages !== undefined) updates.messages = body.messages;
  updates.updatedAt = sql`now()`;

  const [updated] = await db
    .update(conversations)
    .set(updates)
    .where(eq(conversations.id, params.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
