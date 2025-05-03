import { and, count, desc, eq, like, sql } from 'drizzle-orm';
import 'server-only';

import { db } from './drizzle';
import { chatHistory, users } from './schema';

// Helper function to ensure db is available
function ensureDb() {
  if (!db) {
    throw new Error('Database connection not available');
  }
  return db;
}

// User operations
export async function createUser(username: string) {
  const database = ensureDb();
  const [user] = await database.insert(users)
    .values({ username })
    .returning();
  return user;
}

export async function getUserById(id: string) {
  const database = ensureDb();
  const [user] = await database.select()
    .from(users)
    .where(eq(users.id, id));
  return user;
}

export async function getUserByUsername(username: string) {
  const database = ensureDb();
  const [user] = await database.select()
    .from(users)
    .where(eq(users.username, username));
  return user;
}

export async function searchUsers(query: string, limit = 10) {
  const database = ensureDb();
  const searchResults = await database.select()
    .from(users)
    .where(like(users.username, `%${query}%`))
    .limit(limit);
  return searchResults;
}

export async function getUserStats(userId: string) {
  const database = ensureDb();
  const [stats] = await database.select({
    messageCount: count(),
    firstMessage: sql<string>`min(${chatHistory.created_at})`,
    lastMessage: sql<string>`max(${chatHistory.created_at})`,
  })
    .from(chatHistory)
    .where(eq(chatHistory.user_id, userId));

  return stats;
}

// Chat operations
export async function createChatMessage({
  userId,
  role,
  content,
  parentId,
}: {
  userId: string;
  role: string;
  content: string;
  parentId?: string;
}) {
  const database = ensureDb();
  const [message] = await database.insert(chatHistory)
    .values({
      user_id: userId,
      role,
      content,
      parent_id: parentId,
    })
    .returning();
  return message;
}

export async function getUserChatHistory(userId: string, page = 1, pageSize = 10) {
  const database = ensureDb();
  const offset = (page - 1) * pageSize;

  const messages = await database.select({
    id: chatHistory.id,
    content: chatHistory.content,
    role: chatHistory.role,
    created_at: chatHistory.created_at,
  })
    .from(chatHistory)
    .where(eq(chatHistory.user_id, userId))
    .orderBy(desc(chatHistory.created_at))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await database.select({
    total: count(),
  })
    .from(chatHistory)
    .where(eq(chatHistory.user_id, userId));

  return {
    messages,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      total,
    },
  };
}

export async function getMessageThread(messageId: string) {
  const database = ensureDb();
  const messages = [];
  let currentId = messageId;

  while (currentId) {
    const [message] = await database.select()
      .from(chatHistory)
      .where(eq(chatHistory.id, currentId));

    if (!message) break;

    messages.unshift(message);
    currentId = message.parent_id || '';
  }

  return messages;
}

export async function getChildMessages(
  messageId: string,
  page = 1,
  pageSize = 20
) {
  const database = ensureDb();
  const offset = (page - 1) * pageSize;
  const messages = await database.select()
    .from(chatHistory)
    .where(eq(chatHistory.parent_id, messageId))
    .orderBy(desc(chatHistory.created_at))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await database.select({
    total: count()
  })
    .from(chatHistory)
    .where(eq(chatHistory.parent_id, messageId));

  return {
    messages,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

export async function searchMessages(
  userId: string,
  query: string,
  page = 1,
  pageSize = 20
) {
  const database = ensureDb();
  const offset = (page - 1) * pageSize;
  const messages = await database.select()
    .from(chatHistory)
    .where(
      and(
        eq(chatHistory.user_id, userId),
        like(chatHistory.content, `%${query}%`)
      )
    )
    .orderBy(desc(chatHistory.created_at))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await database.select({
    total: count()
  })
    .from(chatHistory)
    .where(
      and(
        eq(chatHistory.user_id, userId),
        like(chatHistory.content, `%${query}%`)
      )
    );

  return {
    messages,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

export async function deleteUserChatHistory(userId: string) {
  const database = ensureDb();
  await database.delete(chatHistory)
    .where(eq(chatHistory.user_id, userId));
}

export async function updateMessage(messageId: string, content: string) {
  const database = ensureDb();
  const [message] = await database.update(chatHistory)
    .set({ content })
    .where(eq(chatHistory.id, messageId))
    .returning();
  return message;
}

export async function getRecentChats(
  userId: string,
  limit = 5
) {
  const database = ensureDb();
  const messages = await database.select()
    .from(chatHistory)
    .where(eq(chatHistory.user_id, userId))
    .orderBy(desc(chatHistory.created_at))
    .limit(limit);
  return messages;
}

export async function getRoleMessages(
  userId: string,
  role: string,
  page = 1,
  pageSize = 20
) {
  const database = ensureDb();
  const offset = (page - 1) * pageSize;
  const messages = await database.select()
    .from(chatHistory)
    .where(
      and(
        eq(chatHistory.user_id, userId),
        eq(chatHistory.role, role)
      )
    )
    .orderBy(desc(chatHistory.created_at))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await database.select({
    total: count()
  })
    .from(chatHistory)
    .where(
      and(
        eq(chatHistory.user_id, userId),
        eq(chatHistory.role, role)
      )
    );

  return {
    messages,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

export async function getChatThread(messageId: string) {
  const messages = await db.select()
    .from(chatHistory)
    .where(eq(chatHistory.id, messageId))
    .orderBy(desc(chatHistory.created_at));

  return messages;
} 