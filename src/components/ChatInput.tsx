'use client';


import { ImagePlus, Send, Square, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UsernameDialog } from '@/components/UsernameDialog';
import { useAppProvider } from '@/hooks/useAppProvider';
import { Message } from '@/lib/AppContext';
import { debounce } from '@/lib/debounce';
import { useUser } from '@/lib/UserContext';

type ChatInputProps = {
  setIsWaitingForResponse: (isWaitingForResponse: boolean) => void;
}

export function ChatInput({ setIsWaitingForResponse }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [typingSpeed] = useState<'normal' | 'fast' | 'slow'>('slow');
  const [hasCreatedTopic, setHasCreatedTopic] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { conversation, setConversation, messages, setMessages, currentConversation } = useAppProvider();
  const { user } = useUser();
  // 使用useRef存储防抖函数，确保它在组件生命周期内保持不变
  const updateTitleRef = useRef<(args: { topicId: string, title: string, userId?: string }) => void>();

  // 初始化防抖函数
  useEffect(() => {
    // 创建更新标题的防抖函数
    updateTitleRef.current = debounce(async (args: { topicId: string, title: string, userId?: string }) => {
      try {
        const { topicId, title, userId } = args;

        const titleResponse = await fetch('/api/conversations', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topicId,
            title,
            userId,
          }),
        });

        if (!titleResponse.ok) {
          console.error('Failed to update conversation title');
        }

        // 在AI回复完成后统一刷新侧边栏
        if (typeof window !== 'undefined' && window._sidebarFunctions?.getConversationList) {
          window._sidebarFunctions.getConversationList();
        }
      } catch (error) {
        console.error('Error updating conversation title:', error);
      }
    }, 500);
  }, []);

  // Create a new conversation ID if one doesn't exist
  useEffect(() => {
    if (!conversationId) {
      setConversationId(uuidv4());
    }
  }, [conversationId]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Function to adjust textarea height
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 336)}px`;
    }
  };

  // Adjust height on mount and when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Initialize height when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, []);

  const handleSubmit = async () => {
    if (!user?.username) {
      setDialogOpen(true);
      return;
    }
    if (!input.trim() && !selectedImage) return;

    // Cleanup previous controller if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsGenerating(true);
    setIsWaitingForResponse(true);

    // Create a new unique message ID
    const messageId = uuidv4();

    // Add user message to messages array with image if present
    const userMessage: Message = {
      id: messageId,
      content: input,
      isUser: true,
      imageUrl: imagePreview || undefined
    };
    setMessages([...messages, userMessage]);

    // For backwards compatibility, also update the conversation string
    const userMessageText = `User: ${input}`;
    const newConversation = conversation ? `${conversation}\n${userMessageText}` : userMessageText;
    setConversation(newConversation);

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    // Create FormData for sending both text and image
    const formData = new FormData();
    formData.append('message', input);
    formData.append('messageId', messageId);

    // Add user ID if available
    if (user?.id) {
      formData.append('userId', user.id);
    }

    // If currentConversation exists, use its ID, otherwise create a new conversation
    let topicId = '';
    if (currentConversation?.id) {
      topicId = currentConversation.id;
      formData.append('topicId', currentConversation.id);
    } else if (conversationId && !hasCreatedTopic) {
      try {
        // 只在没有currentConversation且未创建过话题时创建新对话
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user?.id,
            title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
            description: 'Created from chat'
          }),
        });

        if (response.ok) {
          const data = await response.json();
          topicId = data.id;
          formData.append('topicId', data.id);
          // Update local conversation ID
          setConversationId(data.id);
          // 标记已创建话题，避免重复创建
          setHasCreatedTopic(true);
        } else {
          console.error('Failed to create conversation');
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    } else if (conversationId) {
      // 已经创建过话题，直接使用现有ID
      topicId = conversationId;
      formData.append('topicId', conversationId);
    }

    // 如果有topicId，直接将其传递给agent接口，不需要在这里保存用户消息
    // 因为agent接口会处理消息的保存

    // Add speed parameter
    formData.append('speed', typingSpeed);

    // Add image if selected
    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    try {
      // Send request to agent API
      const response = await fetch('/api/agent', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) {
        throw new Error('Response body is null');
      }
      setInput('');
      setIsGenerating(false);
      setSelectedImage(null);
      setImagePreview(null);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      // Wait a brief moment before showing AI response to ensure the animation
      // appears correctly for the AI message
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsWaitingForResponse(false);

      // Create empty AI reply, ready to receive streaming content
      const aiMessageId = uuidv4();
      const aiMessage: Message = {
        id: aiMessageId,
        content: '',
        isUser: false
      };
      setMessages([...messages, userMessage, aiMessage]);

      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (done) break;

        const chunk = decoder.decode(result.value, { stream: true });

        // Find all SSE messages
        const lines = chunk.split('\\n\\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              // Extract JSON data part
              const jsonStr = line.substring(5).trim();
              const data = JSON.parse(jsonStr);
              if (data.text) {
                accumulatedResponse += data.text;

                // Update AI reply in message array
                setMessages((prevMessages: Message[]) => {
                  const updated = [...prevMessages];
                  if (updated.length > 0) {
                    updated[updated.length - 1].content = accumulatedResponse;
                    if (data.messageId) {
                      updated[updated.length - 1].id = data.messageId;
                    }
                  }
                  return updated;
                });

                // Also update old conversation string
                setConversation(`${newConversation}\nAI: ${accumulatedResponse}`);
              } else if (data.messageId) {
                // 接收到消息ID的情况，更新UI中的消息ID
                setMessages((prevMessages: Message[]) => {
                  return prevMessages.map(msg => {
                    if (msg.isUser === false && msg.content === accumulatedResponse) {
                      return { ...msg, id: data.messageId };
                    }
                    return msg;
                  });
                });
              }
            } catch (error) {
              console.error('Error parsing SSE message:', error);
            }
          } else if (line.startsWith('event: end')) {
            // End event received
            done = true;
            break;
          }
        }
      }

      // After the conversation is completed, update the conversation title if needed
      if (topicId && !currentConversation?.id && accumulatedResponse) {
        try {
          // 使用防抖更新会话标题，只在AI回复后更新一次
          if (updateTitleRef.current) {
            updateTitleRef.current({
              topicId,
              title: input.length > 30 ? input.slice(0, 27) + '...' : input,
              userId: user?.id,
            });
          }
        } catch (error) {
          console.error('Error updating conversation title:', error);
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error:', error);
      }
      setIsWaitingForResponse(false);
    } finally {
      setIsGenerating(false);
      setSelectedImage(null);
      setImagePreview(null);
      // Reset textarea height after clearing input
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Clear the abort controller reference
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    } catch (error) {
      console.log('Error during abort:', error);
    } finally {
      setIsGenerating(false);
      setIsWaitingForResponse(false);
    }
  };

  const handleImageSelect = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setImagePreview(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // 当创建新对话或切换对话时重置状态
  const resetTopicState = () => {
    if (!currentConversation) {
      setHasCreatedTopic(false);
    }
  };

  // 当currentConversation变化时，重置hasCreatedTopic状态
  useEffect(() => {
    resetTopicState();
  }, [currentConversation]);

  return (
    <div className="p-6 pb-6">
      <div className="max-w-[800px] mx-auto">
        <div className="relative bg-background rounded-xl border border-input shadow-sm">
          {imagePreview && (
            <div className="p-3 border-b">
              <div className="relative w-48 h-48 overflow-hidden rounded-lg">
                <Image
                  src={imagePreview}
                  alt="Uploaded preview"
                  className="object-cover w-full h-full"
                  fill
                  sizes="(max-width: 768px) 100vw, 192px"
                  priority
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Type a message..."
              className="min-h-[80px] max-h-[336px] resize-none border-0 focus-visible:ring-0 rounded-xl py-4 px-4 pb-14 w-[800px]"
              disabled={isGenerating}
            />

            <div className="absolute bottom-0 left-0 right-0 h-14 bg-background rounded-b-xl flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />

                <Button
                  type="button"
                  size="icon"
                  onClick={handleImageSelect}
                  disabled={isGenerating}
                  variant="ghost"
                  className="h-9 w-9 rounded-full border"
                >
                  <ImagePlus className="h-5 w-5" />
                </Button>
              </div>
              <div>
                {isGenerating ? (
                  <Button
                    type="button"
                    onClick={stopGeneration}
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!input.trim() && !selectedImage}
                    className="h-9 w-9 rounded-full"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <UsernameDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
