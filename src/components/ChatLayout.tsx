'use client';
import { useState } from 'react';

import { ChatInput } from '@/components/ChatInput';
import { ChatWindow } from '@/components/ChatWindow';

export function ChatLayout() {
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  return (
    <div className="flex flex-col flex-1 justify-center">
      <ChatWindow isWaitingForResponse={isWaitingForResponse} />
      <ChatInput setIsWaitingForResponse={setIsWaitingForResponse} />
    </div>
  );
}
