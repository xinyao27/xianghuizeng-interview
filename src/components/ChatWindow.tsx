'use client';
import { useEffect, useRef } from 'react';

import { ChatMessage } from '@/components/ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppProvider } from '@/hooks/useAppProvider';
import { cn } from '@/lib/utils';

type ChatWindowProps = {
  isWaitingForResponse: boolean;
}

export function ChatWindow({ isWaitingForResponse }: ChatWindowProps) {
  const { conversation, messages } = useAppProvider();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, messages]);

  // Legacy support for string-based conversation if messages array is empty
  const legacyMessages = conversation && messages.length === 0
    ? conversation.split(/(?=User:|AI:)/)
      .filter(msg => msg.trim())
      .map(msg => {
        const isUser = msg.startsWith('User:');
        const content = msg.replace(/^(User:|AI:)/, '').trim();
        return { isUser, content, imageUrl: undefined };
      })
    : [];

  // Use either new message objects or legacy parsed messages
  const displayMessages = messages.length > 0 ? messages : legacyMessages;
  const hasMessages = displayMessages.length > 0;

  return (
    <div className={cn("flex flex-col gap-4 p-4", { 'pb-16': !hasMessages })}>
      {!hasMessages && isWaitingForResponse && (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          <div className="text-center space-y-2">
            <h3 className="text-5xl font-semibold pb-4">...</h3>
          </div>
        </div>
      )}
      {hasMessages ? (
        <ScrollArea className="flex-1 w-[800px] mx-auto h-[calc(100vh-180px)]">
          <div className="flex flex-col gap-4">
            {displayMessages.map((message, index) => (
              <ChatMessage
                key={index}
                content={message.content}
                isUser={message.isUser}
                imageUrl={message.imageUrl}
              />
            ))}
            {isWaitingForResponse && (
              <div className="flex justify-center py-4">
                <div className="text-center space-y-2">
                  <h3 className="text-xl">...</h3>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      ) : (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          <div className="text-center space-y-2">
            <h3 className="text-5xl font-semibold pb-4">Welcome to Simple Chat</h3>
            <p className='text-3xl'>How can I help you today?</p>
          </div>
        </div>
      )}
    </div>
  );
}
