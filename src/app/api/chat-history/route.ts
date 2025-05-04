import { NextResponse } from 'next/server';

import { deleteUserTopics, getTopicById, getTopicMessages } from '@/db/operations';
import { withDebounce } from '@/lib/debounce';

async function handleGET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const topicId = searchParams.get('topicId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    console.log(`[chat-history] Request params: userId=${userId}, topicId=${topicId}, page=${page}, pageSize=${pageSize}`);

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!topicId) {
      return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
    }

    // 首先验证话题是否存在并且属于当前用户
    try {
      console.log(`[chat-history] Fetching topic info: ${topicId}`);
      const topic = await getTopicById(topicId);

      if (!topic) {
        console.log(`[chat-history] Topic not found: ${topicId}`);
        return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
      }

      console.log(`[chat-history] Topic found: ${JSON.stringify(topic)}`);

      if (topic.user_id !== userId) {
        console.log(`[chat-history] Permission denied: topic.user_id=${topic.user_id}, requested userId=${userId}`);
        return NextResponse.json({ error: 'You do not have permission to access this topic' }, { status: 403 });
      }

      // 获取话题的消息
      try {
        console.log(`[chat-history] Fetching messages for topic: ${topicId}`);
        const history = await getTopicMessages(topicId, page, pageSize);
        console.log(`[chat-history] Messages fetched: count=${history.messages?.length || 0}`);

        // 正确格式化响应
        return NextResponse.json({
          messages: history.messages || [],
          pagination: history.pagination
        });
      } catch (messagesError) {
        console.error(`[chat-history] Error fetching topic messages: ${messagesError instanceof Error ? messagesError.message : String(messagesError)}`);
        if (messagesError instanceof Error && messagesError.stack) {
          console.error(`[chat-history] Stack trace: ${messagesError.stack}`);
        }

        // 即使获取消息失败，也返回一个空消息列表
        return NextResponse.json({
          messages: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0
          }
        });
      }
    } catch (topicError) {
      console.error(`[chat-history] Error fetching topic: ${topicError instanceof Error ? topicError.message : String(topicError)}`);
      if (topicError instanceof Error && topicError.stack) {
        console.error(`[chat-history] Stack trace: ${topicError.stack}`);
      }

      return NextResponse.json({ error: 'Failed to verify topic' }, { status: 500 });
    }
  } catch (error) {
    console.error(`[chat-history] General error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`[chat-history] Stack trace: ${error.stack}`);
    }

    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}

async function handleDELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await deleteUserTopics(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chat history:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat history' },
      { status: 500 }
    );
  }
}

// 导出添加防抖的处理函数
export const GET = withDebounce(handleGET);
export const DELETE = withDebounce(handleDELETE); 