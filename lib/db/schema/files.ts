import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { nanoid } from "@/lib/utils";
import { users } from "./users";
import { chatbots } from "./chatbots";

export const files = pgTable("files", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: varchar("user_id", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chatbotId: varchar("chatbot_id", { length: 191 })
    .references(() => chatbots.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  size: integer("size").notNull().default(0),
  chunkCount: integer("chunk_count").notNull().default(0),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});
