import { db } from "@/lib/db";
import { files } from "@/lib/db/schema/files";
import { resources } from "@/lib/db/schema/resources";
import { embeddings } from "@/lib/db/schema/embeddings";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allFiles = await db
    .select()
    .from(files)
    .where(eq(files.userId, session.user.id))
    .orderBy(desc(files.createdAt));

  return NextResponse.json(allFiles);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return NextResponse.json({ error: "Missing file id" }, { status: 400 });
  }

  const fileResources = await db
    .select({ id: resources.id })
    .from(resources)
    .where(eq(resources.fileId, fileId));

  for (const res of fileResources) {
    await db.delete(embeddings).where(eq(embeddings.resourceId, res.id));
  }

  await db.delete(resources).where(eq(resources.fileId, fileId));
  await db.delete(files).where(and(eq(files.id, fileId), eq(files.userId, session.user.id)));

  return NextResponse.json({ message: "File deleted successfully" });
}
