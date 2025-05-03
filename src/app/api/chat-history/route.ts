import { NextResponse } from 'next/server';

import { deleteUserChatHistory, getUserChatHistory } from '@/db/operations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const history = await getUserChatHistory(userId, page, pageSize);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Failed to get chat history:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await deleteUserChatHistory(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chat history:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat history' },
      { status: 500 }
    );
  }
} 