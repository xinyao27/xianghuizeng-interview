'use client';
import { useState } from 'react';

import { ChatInput } from '@/components/ChatInput';
import { ChatWindow } from '@/components/ChatWindow';
import { useAppProvider } from '@/hooks/useAppProvider';

export function ChatLayout() {
  const { messages } = useAppProvider();
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  return (
    <div className="flex flex-col flex-1 justify-center p-3  overflow-hidden">
      <ChatWindow isWaitingForResponse={isWaitingForResponse} />
      <ChatInput setIsWaitingForResponse={setIsWaitingForResponse} />
      {messages.length === 0 ? <div className='h-80' /> : null}
    </div>
  );
}
