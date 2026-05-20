import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "@/lib/utils";
import { users } from "./users";

export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: varchar("user_id", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  messages: jsonb("messages").notNull().default([]),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`),
});
