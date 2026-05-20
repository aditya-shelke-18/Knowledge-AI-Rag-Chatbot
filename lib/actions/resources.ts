"use server";

import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from "@/lib/db/schema/resources";
import { db } from "../db";
import { generateEmbeddings } from "../ai/embedding";
import { embeddings as embeddingsTable } from "../db/schema/embeddings";

export const createResource = async (
  input: NewResourceParams,
  fileName?: string,
  userId?: string
) => {
  try {
    const parsed = insertResourceSchema.parse(input);

    const [resource] = await db
      .insert(resources)
      .values({
        content: parsed.content,
        fileId: parsed.fileId ?? null,
      })
      .returning();

    const embeddings = await generateEmbeddings(resource.content);
    if (embeddings.length > 0) {
      await db.insert(embeddingsTable).values(
        embeddings.map((embedding) => ({
          resourceId: resource.id,
          userId: userId ?? null,
          ...embedding,
          fileName: fileName ?? null,
        }))
      );
    }

    return "Resource successfully created and embedded.";
  } catch (error) {
    return error instanceof Error && error.message.length > 0
      ? error.message
      : "Error, please try again.";
  }
};