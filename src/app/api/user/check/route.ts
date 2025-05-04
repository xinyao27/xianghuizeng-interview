import { NextRequest, NextResponse } from 'next/server';

import { searchUsers } from '@/db/operations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    const matchingUsers = await searchUsers(username);
    const exists = matchingUsers.some(user => user.username === username);

    return NextResponse.json({ exists });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Failed to check username' },
      { status: 500 }
    );
  }
} 