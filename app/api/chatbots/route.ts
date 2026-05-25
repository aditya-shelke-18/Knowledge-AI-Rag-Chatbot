import { db } from "@/lib/db";
import { chatbots } from "@/lib/db/schema/chatbots";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bots = await db.select().from(chatbots).where(eq(chatbots.userId, session.user.id));
  return NextResponse.json(bots);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const [bot] = await db
    .insert(chatbots)
    .values({
      userId: session.user.id,
      name: body.name || "My Chatbot",
      settings: {
        primaryColor: body.primaryColor || "#7c3aed",
        botName: body.botName || "AI Assistant",
        welcomeMessage: body.welcomeMessage || "Hi! How can I help you today?",
        placeholder: body.placeholder || "Ask me anything...",
      },
    })
    .returning();

  return NextResponse.json(bot, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, primaryColor, botName, welcomeMessage, placeholder } = body;

  const [updated] = await db
    .update(chatbots)
    .set({
      name,
      settings: { primaryColor, botName, welcomeMessage, placeholder },
    })
    .where(and(eq(chatbots.id, id), eq(chatbots.userId, session.user.id)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(chatbots).where(and(eq(chatbots.id, id), eq(chatbots.userId, session.user.id)));
  return NextResponse.json({ message: "Deleted" });
}
