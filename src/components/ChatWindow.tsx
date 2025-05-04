'use client';
import {useEffect, useRef} from 'react';

import {ChatMessage} from '@/components/ChatMessage';
import {ScrollArea} from '@/components/ui/scroll-area';
import {useAppProvider} from '@/hooks/useAppProvider';
import {cn} from '@/lib/utils';

import {useSearchParams} from 'next/navigation';

import {useUser} from "@/lib/UserContext";

type ChatWindowProps = {
  isWaitingForResponse: boolean;
}

export function ChatWindow({isWaitingForResponse}: ChatWindowProps) {
  const {user} = useUser();
  const router = useSearchParams(); // 新增: 获取 router 实例
  const {conversation, messages, setCurrentConversation, setMessages} = useAppProvider(); // 假设上下文支持设置方法
  const scrollRef = useRef<HTMLDivElement>(null);
  const convId = router.get('convId')

  // 新增: 监听 URL 中的 convId 参数
  useEffect(() => {
    if (convId && user?.id) {
      fetchConversation(convId as string, user.id);
    }
  }, [convId, user?.id]);

  // 新增: 根据 convId 获取对话内容
  const fetchConversation = async (convId: string, userId: string) => {
    try {
      const response = await fetch(`/api/conversations?topicId=${convId}&userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }

      const data = await response.json();
      if (data.topic) {
        setCurrentConversation(data.topic);
      }

      const historyResponse = await fetch(`/api/chat-history?topicId=${convId}&userId=${userId}`);
      if (!historyResponse.ok) {
        throw new Error('Failed to fetch chat history');
      }

      const historyData = await historyResponse.json();
      const formattedMessages = historyData.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === 'user',
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [conversation, messages]);

  // Legacy support for string-based conversation if messages array is empty
  const legacyMessages = conversation && messages.length === 0
    ? conversation.split(/(?=User:|AI:)/)
      .filter(msg => msg.trim())
      .map(msg => {
        const isUser = msg.startsWith('User:');
        const content = msg.replace(/^(User:|AI:)/, '').trim();
        return {isUser, content, imageUrl: undefined};
      })
    : [];

  // Use either new message objects or legacy parsed messages
  const displayMessages = messages.length > 0 ? messages : legacyMessages;
  const hasMessages = displayMessages.length > 0;

  return (
    <div className={cn("flex flex-col gap-4 p-4", {'pb-16': !hasMessages})}>
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
            <div ref={scrollRef}/>
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
