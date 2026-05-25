import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { nanoid } from "@/lib/utils";
import { users } from "./users";

export const chatbots = pgTable("chatbots", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: varchar("user_id", { length: 191 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("My Chatbot"),
  apiKey: varchar("api_key", { length: 64 })
    .notNull()
    .$defaultFn(() => nanoid(48)),
  settings: jsonb("settings").notNull().default({
    primaryColor: "#7c3aed",
    botName: "AI Assistant",
    welcomeMessage: "Hi! How can I help you today?",
    placeholder: "Ask me anything...",
  }),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
});
