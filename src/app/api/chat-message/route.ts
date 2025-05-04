import { NextResponse } from 'next/server';

import {
  createMessage,
  deleteMessage,
  getMessageById,
  getMessageThread,
  getTopicById,
  updateMessage
} from '@/db/operations';
import type { MessageRole } from '@/db/schema';
import { withDebounce } from '@/lib/debounce';

async function handleGET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');
    const thread = searchParams.get('thread') === 'true';

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // 如果请求包含thread=true，则返回完整的消息线程
    if (thread) {
      const messages = await getMessageThread(messageId);
      return NextResponse.json({ messages });
    }
    // 否则只返回单条消息
    const message = await getMessageById(messageId);

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ message });

  } catch (error) {
    console.error('Failed to get chat message:', error);
    return NextResponse.json(
      { error: 'Failed to get chat message' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const { topicId, content, role, userId, metadata, created_at } = body;

    // 详细的参数验证和日志
    console.log('Creating message with params:', {
      topicId,
      role,
      userId,
      hasMetadata: !!metadata,
      contentLength: content?.length,
      created_at
    });

    if (!topicId) {
      console.error('Message creation failed: Missing topicId');
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
    }

    if (!content) {
      console.error('Message creation failed: Missing content');
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (!role) {
      console.error('Message creation failed: Missing role');
      return NextResponse.json({ error: 'Message role is required' }, { status: 400 });
    }

    if (!userId) {
      console.error('Message creation failed: Missing userId');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 验证created_at是否为有效的ISO日期字符串
    let parsedCreatedAt: string;
    try {
      parsedCreatedAt = created_at ? new Date(created_at).toISOString() : new Date().toISOString();
    } catch (error) {
      console.error('Invalid created_at date format:', error);
      return NextResponse.json({ error: 'Invalid created_at date format' }, { status: 400 });
    }

    // 验证用户是否有权限在该话题中创建消息
    try {
      const topic = await getTopicById(topicId);
      if (!topic) {
        console.error(`Message creation failed: Topic ${topicId} not found`);
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
      }
      if (topic.user_id !== userId) {
        console.error(`Message creation failed: User ${userId} not authorized for topic ${topicId}`);
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } catch (error) {
      console.error('Failed to verify topic access:', error);
      return NextResponse.json({ error: 'Failed to verify topic access' }, { status: 500 });
    }

    // 创建消息
    try {
      const newMessage = await createMessage({
        userId,
        topicId,
        content,
        role: role as MessageRole,
        metadata,
        created_at: parsedCreatedAt
      });

      console.log('Message created successfully:', {
        messageId: newMessage.id,
        topicId: newMessage.topic_id
      });

      return NextResponse.json(newMessage);
    } catch (error) {
      console.error('Database error while creating message:', error);
      return NextResponse.json(
        { error: 'Failed to create message in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in message creation:', error);
    return NextResponse.json(
      { error: 'Internal server error during message creation' },
      { status: 500 }
    );
  }
}

async function handlePATCH(request: Request) {
  try {
    const body = await request.json();
    const { messageId, content, userId, metadata } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // 验证消息是否存在
    const message = await getMessageById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // 如果提供了userId，验证用户是否有权限更新该消息
    if (userId) {
      const topic = await getTopicById(message.topic_id);
      if (!topic || topic.user_id !== userId) {
        return NextResponse.json({ error: 'You do not have permission to update this message' }, { status: 403 });
      }
    }

    // 更新消息
    const updatedMessage = await updateMessage(messageId, content, metadata);
    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error('Failed to update message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

async function handleDELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // 验证消息是否存在
    const message = await getMessageById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // 如果提供了userId，验证用户是否有权限删除该消息
    if (userId) {
      const topic = await getTopicById(message.topic_id);
      if (!topic || topic.user_id !== userId) {
        return NextResponse.json({ error: 'You do not have permission to delete this message' }, { status: 403 });
      }
    }

    // 使用新的deleteMessage函数删除单条消息
    const deletedMessage = await deleteMessage(messageId);

    return NextResponse.json({ success: true, deletedMessage });
  } catch (error) {
    console.error('Failed to delete message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}

// 导出添加防抖的处理函数
export const GET = withDebounce(handleGET);
export const POST = withDebounce(handlePOST);
export const PATCH = withDebounce(handlePATCH);
export const DELETE = withDebounce(handleDELETE); 