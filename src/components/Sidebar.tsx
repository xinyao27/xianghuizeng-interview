'use client';
import { Edit, PanelLeft, Plus, Trash2 } from 'lucide-react';
import {useRouter} from "next/navigation";
import { useEffect, useLayoutEffect, useState } from 'react';


import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAppProvider } from '@/hooks/useAppProvider';
import { debounce } from '@/lib/debounce';
import { useUser } from '@/lib/UserContext';
import { cn } from '@/lib/utils';
import type { SidebarProps } from '@/types';


interface ConversationItem {
  id: string;
  title: string;
  content?: string;
  created_at: Date;
  updated_at: Date;
}

interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ConversationsResponse {
  topics: ConversationItem[];
  pagination: PaginationResult;
}

export function AppSidebar({ openSidebar: _openSidebar, onOpenChangeSidebar }: SidebarProps) {
  const router = useRouter(); // 新增: 获取 router 实例
  const { user } = useUser();
  const storageKey = user ? `user_${user.id}_` : 'user_';
  const [mounted, setMounted] = useState(false);

  // Use useLayoutEffect to prevent hydration mismatch
  // Falls back to useEffect for SSR
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  const [conversationList, setConversationList] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<ConversationItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const { setMessages, setConversation } = useAppProvider();

  // Set mounted state to fix hydration issues
  useEffect(() => {
    // Load data from localStorage after component mounts
    if (user) {
      const savedList = localStorage.getItem(storageKey + 'conversationList');
      const savedPage = localStorage.getItem(storageKey + 'currentPage');
      const savedConversation = localStorage.getItem(storageKey + 'currentConversation');

      if (savedList) setConversationList(JSON.parse(savedList));
      if (savedPage) setCurrentPage(JSON.parse(savedPage));
      if (savedConversation) setCurrentConversation(JSON.parse(savedConversation));
    }
  }, [user, storageKey]);

  // Expose getConversationList to the global window object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 创建防抖版本的getConversationList函数
      const debouncedGetConversationList = debounce(() => getConversationList(1), 500);

      window._sidebarFunctions = {
        getConversationList: debouncedGetConversationList
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window._sidebarFunctions;
      }
    };
  }, [user]);

  // Add effect to save states
  useEffect(() => {
    if (mounted && user) {
      localStorage.setItem(storageKey + 'conversationList', JSON.stringify(conversationList));
      localStorage.setItem(storageKey + 'currentPage', JSON.stringify(currentPage));
      localStorage.setItem(storageKey + 'currentConversation', JSON.stringify(currentConversation));
    }
  }, [conversationList, currentPage, currentConversation, user, storageKey, mounted]);

  // Clear local storage when user changes
  useEffect(() => {
    if (!user) {
      const storageKey = 'user_';
      localStorage.removeItem(storageKey + 'conversationList');
      localStorage.removeItem(storageKey + 'currentPage');
      localStorage.removeItem(storageKey + 'currentConversation');
      setConversationList([]);
      setCurrentPage(1);
      setCurrentConversation(null);
    } else if (mounted) {
      // Initialize from storage when user logs in
      const storageKey = `user_${user.id}_`;
      const savedList = localStorage.getItem(storageKey + 'conversationList');
      const savedPage = localStorage.getItem(storageKey + 'currentPage');
      const savedConversation = localStorage.getItem(storageKey + 'currentConversation');

      if (savedList) setConversationList(JSON.parse(savedList));
      if (savedPage) setCurrentPage(JSON.parse(savedPage));
      if (savedConversation) setCurrentConversation(JSON.parse(savedConversation));
    }
  }, [user, mounted]);

  const getConversationList = async (page = 1) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/conversations?userId=${user.id}&page=${page}&pageSize=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const result: ConversationsResponse = await response.json();

      if (page === 1) {
        setConversationList(result.topics);
      } else {
        setConversationList(prev => [...prev, ...result.topics]);
      }
      setHasMore(result.pagination.page < result.pagination.totalPages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      getConversationList(currentPage + 1);
    }
  };

  const handleNewChat = async () => {
    setMessages([]);
    setConversation('');
  };

  const handleDeleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user || !confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const response = await fetch(`/api/conversations?topicId=${conversationId}&userId=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      // Update the list, remove the deleted conversation
      setConversationList(prev => prev.filter(c => c.id !== conversationId));

      // If currently viewing this conversation, clear it
      if (currentConversation?.id === conversationId) {
        setMessages([]);
        setConversation('');
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleEditConversation = (conversation: ConversationItem, event: React.MouseEvent) => {
    event.stopPropagation();
    setCurrentConversation(conversation);
    setEditTitle(conversation.title);
    setIsEditDialogOpen(true);
  };

  const handleSaveTitle = async () => {
    if (!currentConversation || !user || !editTitle.trim()) return;

    try {
      const response = await fetch('/api/conversations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicId: currentConversation.id,
          title: editTitle,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update conversation title');
      }

      // Update the title in the list
      setConversationList(prev =>
        prev.map(c => c.id === currentConversation.id ? { ...c, title: editTitle } : c)
      );

      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update conversation title:', error);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (!user) return;

    try {
      // 先获取话题信息
      const topicResponse = await fetch(`/api/conversations?userId=${user.id}&topicId=${conversationId}`);
      if (!topicResponse.ok) {
        const errorData = await topicResponse.json();
        throw new Error(errorData.error || 'Failed to fetch conversation');
      }

      const topicData = await topicResponse.json();
      if (!topicData.topic) {
        throw new Error('Topic not found');
      }

      // 设置当前会话
      setCurrentConversation(topicData.topic);

      // 获取该话题的所有消息
      try {
        const historyResponse = await fetch(`/api/chat-history?userId=${user.id}&topicId=${conversationId}`);
        if (!historyResponse.ok) {
          const errorData = await historyResponse.json();
          console.error('Chat history error:', errorData.error);
          // 即使消息获取失败，也保留话题显示
          setMessages([]);
          setConversation('');
          return;
        }

        const historyData = await historyResponse.json();
        const messages = historyData.messages || [];

        if (messages.length > 0) {
          // Format messages for UI
          const formattedMessages = messages.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            isUser: msg.role === 'user',
          }));

          setMessages(formattedMessages);

          // Also update traditional conversation string format (for backward compatibility)
          const conversationText = messages.map((msg: any) =>
            `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
          ).join('\n');

          setConversation(conversationText);
        } else {
          // No messages yet, just set the conversation
          setMessages([]);
          setConversation('');
        }
      } catch (historyError) {
        console.error('Failed to fetch conversation messages:', historyError);
        // 即使消息获取失败，也保留话题显示
        setMessages([]);
        setConversation('');
      }
      router.push(`/?convId=${conversationId}`);
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    }
  };

  useEffect(() => {
    if (user && mounted) {
      getConversationList();
    }
  }, [user, mounted]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <>
      {mounted ? (
        <Sidebar>
          <SidebarHeader className="p-3 border-b">
            <div className="flex justify-between items-center">
              <span className="font-semibold">AI-Chat</span>
              <Button variant="ghost" size="icon" onClick={() => onOpenChangeSidebar(false)} className="h-8 w-8 hover:bg-muted">
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <div className="flex justify-between p-2 gap-2">
                <Button className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border-0" variant="outline" size="sm" onClick={handleNewChat}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </SidebarGroup>
            <SidebarGroup className="overflow-y-auto">
              {conversationList && conversationList.map((item) => (
                <div
                  key={item.id}
                  className={cn("relative hover:bg-muted rounded-md mb-1 transition-colors", `group/items`)}
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start truncate p-2 text-sm h-auto"
                    onClick={() => handleSelectConversation(item.id)}
                  >
                    <div className="flex flex-col items-start gap-1 w-full">
                      <span className="truncate font-medium w-full text-left">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(item.updated_at)}</span>
                    </div>
                  </Button>
                  <div className={cn("absolute right-2 top-1/2 -translate-y-1/2 invisible", `group-hover/items:visible flex gap-1 transition-opacity`)}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-background"
                      onClick={(e) => handleEditConversation(item, e)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-background text-destructive hover:text-destructive"
                      onClick={(e) => handleDeleteConversation(item.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {hasMore && (
                <Button
                  variant="ghost"
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </Button>
              )}
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      ) : (
        <Sidebar>
          <SidebarHeader className="p-3 border-b">
            <div className="flex justify-between items-center">
              <span className="font-semibold">AI-Chat</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <div className="flex justify-between p-2 gap-2">
                <Button className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border-0" variant="outline" size="sm" disabled>
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </SidebarGroup>
            <SidebarGroup className="overflow-y-auto">
              <div className="p-4 text-center text-muted-foreground text-sm">
                Loading conversations...
              </div>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Conversation Title</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter conversation title"
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTitle}
              disabled={!editTitle.trim()}
              className="bg-primary/90 hover:bg-primary"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
