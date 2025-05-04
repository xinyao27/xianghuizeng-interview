'use client';
import { useState } from 'react';

import { ChatInput } from '@/components/ChatInput';
import { ChatWindow } from '@/components/ChatWindow';

export function ChatLayout() {
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <ChatWindow isWaitingForResponse={isWaitingForResponse} />
      </div>
      <ChatInput setIsWaitingForResponse={setIsWaitingForResponse} />
    </div>
  );
}
