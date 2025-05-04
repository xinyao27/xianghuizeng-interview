import { and, count, desc, eq, like, sql } from 'drizzle-orm';
import 'server-only';

import { db } from './drizzle';
import { MessageRole, messages, topics, users } from './schema';

// Helper function to ensure db is available
function ensureDb() {
  if (!db) {
    console.error('[ensureDb] Database connection not available. DATABASE_URL may be missing or invalid.');

    if (typeof window === 'undefined') {
      // 服务器端：检查环境变量
      if (!process.env.DATABASE_URL) {
        console.error('[ensureDb] DATABASE_URL environment variable is missing');
      } else {
        console.log('[ensureDb] DATABASE_URL exists but connection failed');
      }
    } else {
      console.error('[ensureDb] Attempted to access database from client side');
    }

    throw new Error('Database connection not available');
  }
  return db;
}

// User operations
export async function createUser(username: string) {
  const database = ensureDb();
  const [user] = await database.insert(users)
    .values({
      id: crypto.randomUUID(),
      username,
    })
    .returning();
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

// Topic operations (formerly Conversation operations)
export const createTopic = async (userId: string, title: string, description?: string) => {
  try {
    const database = ensureDb();
    const newTopic = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: title,
      description: description,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await database.insert(topics).values(newTopic).returning();
    return result[0];
  } catch (error) {
    console.error('Error creating topic:', error);
    throw error;
  }
};

export const getTopicById = async (topicId: string) => {
  try {
    const database = ensureDb();
    const result = await database.select().from(topics).where(eq(topics.id, topicId));
    return result[0];
  } catch (error) {
    console.error('Error getting topic by ID:', error);
    throw error;
  }
};

export const updateTopicTitle = async (topicId: string, title: string, description?: string) => {
  try {
    const database = ensureDb();
    const result = await database.update(topics)
      .set({
        title,
        description,
        updated_at: new Date()
      })
      .where(eq(topics.id, topicId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error updating topic title:', error);
    throw error;
  }
};

export const getUserTopics = async (userId: string, page: number = 1, pageSize: number = 10) => {
  try {
    const database = ensureDb();
    const offset = (page - 1) * pageSize;

    // Get topics for the user
    const topicsResult = await database.select()
      .from(topics)
      .where(eq(topics.user_id, userId))
      .orderBy(desc(topics.updated_at))
      .limit(pageSize)
      .offset(offset);

    // Count total topics for pagination
    const countResult = await database.select({ count: sql`count(*)` })
      .from(topics)
      .where(eq(topics.user_id, userId));

    const total = Number(countResult[0].count);
    const totalPages = Math.ceil(total / pageSize);

    return {
      topics: topicsResult,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    };
  } catch (error) {
    console.error('Error getting user topics:', error);
    throw error;
  }
};

export const deleteTopic = async (topicId: string) => {
  try {
    const database = ensureDb();
    // First delete all messages associated with the topic
    await database.delete(messages).where(eq(messages.topic_id, topicId));

    // Then delete the topic
    const result = await database.delete(topics).where(eq(topics.id, topicId)).returning();
    return result[0];
  } catch (error) {
    console.error('Error deleting topic:', error);
    throw error;
  }
};

export const deleteUserTopics = async (userId: string) => {
  try {
    const database = ensureDb();
    // Get all topics for the user
    const userTopics = await database.select({ id: topics.id })
      .from(topics)
      .where(eq(topics.user_id, userId));

    // Delete messages for each topic
    for (const topic of userTopics) {
      await database.delete(messages).where(eq(messages.topic_id, topic.id));
    }

    // Delete all topics
    await database.delete(topics).where(eq(topics.user_id, userId));

    return { success: true };
  } catch (error) {
    console.error('Error deleting user topics:', error);
    throw error;
  }
};

export async function getUserStats(userId: string) {
  const database = ensureDb();

  // First get all topics belonging to this user
  const userTopics = await database.select({ id: topics.id })
    .from(topics)
    .where(eq(topics.user_id, userId));

  // Then count messages from these topics
  const topicIds = userTopics.map(topic => topic.id);

  // If no topics, return zero counts
  if (topicIds.length === 0) {
    return {
      messageCount: 0,
      firstMessage: null,
      lastMessage: null
    };
  }

  const [stats] = await database.select({
    messageCount: count(),
    firstMessage: sql<string>`min(${messages.created_at})`,
    lastMessage: sql<string>`max(${messages.created_at})`,
  })
    .from(messages)
    .where(
      topicIds.length === 1
        ? eq(messages.topic_id, topicIds[0])
        : sql`${messages.topic_id} = ANY(${topicIds})`
    );

  return stats;
}

// Message operations (formerly Chat operations)
interface MessageCreateParams {
  id?: string;
  userId: string;
  topicId: string;
  content: string;
  role: MessageRole;
  hasImage?: boolean;
  metadata?: string;
  created_at: string
}

export const createMessage = async (params: MessageCreateParams) => {
  try {
    const database = ensureDb();

    // 验证必需参数
    if (!params.topicId || !params.content || !params.role || !params.userId) {
      console.error('[createMessage] Missing required parameters:', {
        hasTopicId: !!params.topicId,
        hasContent: !!params.content,
        hasRole: !!params.role,
        hasUserId: !!params.userId
      });
      throw new Error('Missing required message parameters');
    }

    // 验证话题是否存在
    const topic = await database
      .select()
      .from(topics)
      .where(eq(topics.id, params.topicId))
      .limit(1);

    if (!topic.length) {
      console.error(`[createMessage] Topic not found: ${params.topicId}`);
      throw new Error('Topic not found');
    }

    // 验证created_at格式
    let createdAt: string;
    try {
      createdAt = params.created_at ? new Date(params.created_at).toISOString() : new Date().toISOString();
    } catch (error) {
      console.error('[createMessage] Invalid created_at format:', error);
      throw new Error('Invalid created_at date format');
    }

    // 创建消息
    const messageData = {
      id: params.id || crypto.randomUUID(),
      topic_id: params.topicId,
      user_id: params.userId,
      content: params.content,
      role: params.role,
      metadata: params.metadata,
      created_at: new Date(createdAt)
    };

    console.log('[createMessage] Creating new message:', {
      messageId: messageData.id,
      topicId: messageData.topic_id,
      role: messageData.role,
      created_at: messageData.created_at
    });

    const [newMessage] = await database
      .insert(messages)
      .values(messageData)
      .returning();

    // 更新话题的更新时间
    await database
      .update(topics)
      .set({ updated_at: new Date() })
      .where(eq(topics.id, params.topicId));

    return newMessage;
  } catch (error) {
    console.error('[createMessage] Error creating message:', error);
    throw error;
  }
};

export const getTopicMessages = async (topicId: string, page: number = 1, pageSize: number = 50) => {
  try {
    console.log(`[getTopicMessages] Starting: topicId=${topicId}, page=${page}, pageSize=${pageSize}`);
    const database = ensureDb();
    const offset = (page - 1) * pageSize;

    // Get messages for the topic
    console.log(`[getTopicMessages] Executing query with params: topicId=${topicId}, limit=${pageSize}, offset=${offset}`);
    const messagesResult = await database.select()
      .from(messages)
      .where(eq(messages.topic_id, topicId))
      .orderBy(messages.created_at)
      .limit(pageSize)
      .offset(offset);

    console.log(`[getTopicMessages] Query completed: found ${messagesResult.length} messages`);

    // Count total messages for pagination
    console.log(`[getTopicMessages] Counting total messages for topic`);
    const countResult = await database.select({ count: sql`count(*)` })
      .from(messages)
      .where(eq(messages.topic_id, topicId));

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / pageSize) || 1;

    console.log(`[getTopicMessages] Count completed: total=${total}, totalPages=${totalPages}`);

    return {
      messages: messagesResult || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    };
  } catch (error) {
    console.error(`[getTopicMessages] Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`[getTopicMessages] Stack trace: ${error.stack}`);
    }

    // 重新抛出错误以便上层处理
    throw error;
  }
};

export async function getUserRecentActivity(userId: string, page = 1, pageSize = 10) {
  const database = ensureDb();

  // 获取用户的所有话题，按最后消息时间排序
  const { topics: userTopics } = await getUserTopics(userId, page, pageSize);

  // 对于每个话题，获取最后一条消息作为预览
  const results = [];
  for (const topic of userTopics) {
    const [lastMessage] = await database.select({
      id: messages.id,
      content: messages.content,
      role: messages.role,
      created_at: messages.created_at,
      metadata: messages.metadata,
    })
      .from(messages)
      .where(
        and(
          eq(messages.topic_id, topic.id),
          eq(messages.role, 'user')
        )
      )
      .orderBy(desc(messages.created_at))
      .limit(1);

    if (lastMessage) {
      results.push({
        topic,
        lastMessage,
      });
    }
  }

  return results;
}

export async function deleteMessagesForTopics(topicIds: string[]) {
  const database = ensureDb();
  await Promise.all(
    topicIds.map(topicId =>
      database.delete(messages).where(eq(messages.topic_id, topicId))
    )
  );
}

export async function deleteMessage(messageId: string) {
  const database = ensureDb();
  const [deletedMessage] = await database
    .delete(messages)
    .where(eq(messages.id, messageId))
    .returning();
  return deletedMessage;
}

export async function getMessageById(messageId: string) {
  const database = ensureDb();
  const [message] = await database.select()
    .from(messages)
    .where(eq(messages.id, messageId));
  return message;
}

export async function getMessageThread(messageId: string) {
  const message = await getMessageById(messageId);
  if (!message) return null;

  // 递归查找所有父消息
  const thread = [message];
  let currentId = message.topic_id;

  while (currentId) {
    const parentMessage = await getMessageById(currentId);
    if (!parentMessage) break;

    thread.unshift(parentMessage); // 添加到线程的开头
    currentId = parentMessage.topic_id;
  }

  return thread;
}

export async function getChildMessages(
  messageId: string,
  page = 1,
  pageSize = 20
) {
  const database = ensureDb();
  const offset = (page - 1) * pageSize;

  const children = await database.select({
    id: messages.id,
    content: messages.content,
    role: messages.role,
    created_at: messages.created_at,
    topic_id: messages.topic_id,
    metadata: messages.metadata,
  })
    .from(messages)
    .where(eq(messages.topic_id, messageId))
    .orderBy(messages.created_at)
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await database.select({
    total: count(),
  })
    .from(messages)
    .where(eq(messages.topic_id, messageId));

  return {
    messages: children,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      total,
    },
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

  // 查找用户话题中包含查询词的消息
  const searchResults = await database.select({
    message: {
      id: messages.id,
      content: messages.content,
      role: messages.role,
      created_at: messages.created_at,
    },
    topic: {
      id: topics.id,
      title: topics.title,
    },
  })
    .from(messages)
    .innerJoin(topics, eq(messages.topic_id, topics.id))
    .where(
      and(
        eq(topics.user_id, userId),
        like(messages.content, `%${query}%`)
      )
    )
    .orderBy(desc(messages.created_at))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await database.select({
    total: count(),
  })
    .from(messages)
    .innerJoin(topics, eq(messages.topic_id, topics.id))
    .where(
      and(
        eq(topics.user_id, userId),
        like(messages.content, `%${query}%`)
      )
    );

  return {
    results: searchResults,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      total,
    },
  };
}

export async function updateMessage(messageId: string, content: string, metadata?: string) {
  const database = ensureDb();
  const updateData: any = { content };

  if (metadata !== undefined) {
    updateData.metadata = metadata;
  }

  const [message] = await database.update(messages)
    .set(updateData)
    .where(eq(messages.id, messageId))
    .returning();
  return message;
}

export async function getRecentMessages(
  userId: string,
  limit = 5
) {
  const database = ensureDb();
  const recentMessages = await database.select({
    message: {
      id: messages.id,
      content: messages.content,
      role: messages.role,
      created_at: messages.created_at,
    },
    topic: {
      id: topics.id,
      title: topics.title,
    },
  })
    .from(messages)
    .innerJoin(topics, eq(messages.topic_id, topics.id))
    .where(eq(topics.user_id, userId))
    .orderBy(desc(messages.created_at))
    .limit(limit);

  return recentMessages;
}

export async function getRoleMessages(
  userId: string,
  role: MessageRole,
  page = 1,
  pageSize = 20
) {
  const database = ensureDb();
  const offset = (page - 1) * pageSize;

  const roleMessages = await database.select({
    message: {
      id: messages.id,
      content: messages.content,
      role: messages.role,
      created_at: messages.created_at,
    },
    topic: {
      id: topics.id,
      title: topics.title,
    },
  })
    .from(messages)
    .innerJoin(topics, eq(messages.topic_id, topics.id))
    .where(
      and(
        eq(topics.user_id, userId),
        eq(messages.role, role)
      )
    )
    .orderBy(desc(messages.created_at))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await database.select({
    total: count(),
  })
    .from(messages)
    .innerJoin(topics, eq(messages.topic_id, topics.id))
    .where(
      and(
        eq(topics.user_id, userId),
        eq(messages.role, role)
      )
    );

  return {
    messages: roleMessages,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      total,
    },
  };
}

export async function getMessageWithReplies(messageId: string) {
  const message = await getMessageById(messageId);
  if (!message) return null;

  const { messages: replies } = await getChildMessages(messageId);

  return {
    message,
    replies,
  };
}
