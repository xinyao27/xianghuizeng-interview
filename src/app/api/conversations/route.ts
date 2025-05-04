import { NextResponse } from 'next/server';

import {
  createTopic,
  deleteTopic,
  getTopicById,
  getUserTopics,
  updateTopicTitle
} from '@/db/operations';
import { withDebounce } from '@/lib/debounce';

// 获取话题列表
async function handleGET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const topicId = searchParams.get('topicId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (!userId) {
      return NextResponse.json({ error: '用户ID是必需的' }, { status: 400 });
    }

    // 如果提供了topicId，则获取该话题的信息（仅话题本身，不包括消息）
    if (topicId) {
      const topic = await getTopicById(topicId);

      if (!topic || topic.user_id !== userId) {
        return NextResponse.json({ error: '话题不存在或无权访问' }, { status: 404 });
      }

      // 只返回话题信息，不包括消息
      return NextResponse.json({ topic });
    }

    // 否则获取用户的所有话题
    const topics = await getUserTopics(userId, page, pageSize);
    return NextResponse.json(topics);
  } catch (error) {
    console.error('获取话题失败:', error);
    return NextResponse.json(
      { error: '获取话题失败' },
      { status: 500 }
    );
  }
}

// 创建新话题
async function handlePOST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, description } = body;

    if (!userId) {
      return NextResponse.json({ error: '用户ID是必需的' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: '话题标题是必需的' }, { status: 400 });
    }

    const topic = await createTopic(userId, title, description);
    return NextResponse.json(topic);
  } catch (error) {
    console.error('创建话题失败:', error);
    return NextResponse.json(
      { error: '创建话题失败' },
      { status: 500 }
    );
  }
}

// 更新话题标题
async function handlePATCH(request: Request) {
  try {
    const body = await request.json();
    const { topicId, title, description, userId } = body;

    if (!topicId) {
      return NextResponse.json({ error: '话题ID是必需的' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: '话题标题是必需的' }, { status: 400 });
    }

    // 验证用户是否有权限更新话题
    if (userId) {
      const topic = await getTopicById(topicId);
      if (!topic || topic.user_id !== userId) {
        return NextResponse.json({ error: '话题不存在或无权访问' }, { status: 404 });
      }
    }

    const updatedTopic = await updateTopicTitle(topicId, title, description);
    return NextResponse.json(updatedTopic);
  } catch (error) {
    console.error('更新话题失败:', error);
    return NextResponse.json(
      { error: '更新话题失败' },
      { status: 500 }
    );
  }
}

// 删除话题
async function handleDELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');
    const userId = searchParams.get('userId');

    if (!topicId) {
      return NextResponse.json({ error: '话题ID是必需的' }, { status: 400 });
    }

    // 验证用户是否有权限删除话题
    if (userId) {
      const topic = await getTopicById(topicId);
      if (!topic || topic.user_id !== userId) {
        return NextResponse.json({ error: '话题不存在或无权访问' }, { status: 404 });
      }
    }

    await deleteTopic(topicId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除话题失败:', error);
    return NextResponse.json(
      { error: '删除话题失败' },
      { status: 500 }
    );
  }
}

// 导出添加防抖的处理函数
export const GET = withDebounce(handleGET);
export const POST = withDebounce(handlePOST);
export const PATCH = withDebounce(handlePATCH);
export const DELETE = withDebounce(handleDELETE); 