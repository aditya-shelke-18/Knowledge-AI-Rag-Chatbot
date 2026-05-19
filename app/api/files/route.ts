import { db } from "@/lib/db";
import { files } from "@/lib/db/schema/files";
import { resources } from "@/lib/db/schema/resources";
import { embeddings } from "@/lib/db/schema/embeddings";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/files — list all uploaded files
export async function GET() {
  const allFiles = await db
    .select()
    .from(files)
    .orderBy(desc(files.createdAt));

  return NextResponse.json(allFiles);
}

// DELETE /api/files?id=xxx — delete a file and cascade its resources/embeddings
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return NextResponse.json({ error: "Missing file id" }, { status: 400 });
  }

  // Delete embeddings linked to resources of this file
  const fileResources = await db
    .select({ id: resources.id })
    .from(resources)
    .where(eq(resources.fileId, fileId));

  for (const res of fileResources) {
    await db.delete(embeddings).where(eq(embeddings.resourceId, res.id));
  }

  // Delete resources linked to this file
  await db.delete(resources).where(eq(resources.fileId, fileId));

  // Delete the file record
  await db.delete(files).where(eq(files.id, fileId));

  return NextResponse.json({ message: "File deleted successfully" });
}
