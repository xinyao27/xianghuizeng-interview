import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export const chatHistory = pgTable("chat_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  parent_id: uuid("parent_id").references(() => chatHistory.id),
});

export type ChatHistory = InferSelectModel<typeof chatHistory>;
export type NewChatHistory = InferInsertModel<typeof chatHistory>;

export const todo = pgTable("todo", {
  id: integer("id").primaryKey(),
  text: text("text").notNull(),
  done: boolean("done").default(false).notNull(),
});