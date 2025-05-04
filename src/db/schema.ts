import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type UserInsertType = typeof users.$inferInsert;

// Topics (conversations) table
export const topics = pgTable('topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type Topic = typeof topics.$inferSelect;
export type TopicInsertType = typeof topics.$inferInsert;

// Messages table
export type MessageRole = 'user' | 'assistant' | 'system';

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  topic_id: uuid('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
  role: text('role').$type<MessageRole>().notNull(),
  content: text('content').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  metadata: text('metadata'),
});

export type Message = typeof messages.$inferSelect;
export type MessageInsertType = typeof messages.$inferInsert;
export type MessageSelectType = typeof messages.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  user: one(users, {
    fields: [topics.user_id],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  topic: one(topics, {
    fields: [messages.topic_id],
    references: [topics.id],
  }),
}));