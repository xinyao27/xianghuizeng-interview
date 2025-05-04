'use client';


import { ImagePlus, Send, Square, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { useAppProvider } from '@/hooks/useAppProvider';
import { Message } from '@/lib/AppContext';
import { debounce } from '@/lib/debounce';
import { useUser } from '@/lib/UserContext';

type ChatInputProps = {
  setIsWaitingForResponse: (isWaitingForResponse: boolean) => void;
}

export function ChatInput({ setIsWaitingForResponse }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [typingSpeed] = useState<'normal' | 'fast' | 'slow'>('slow');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast()
  const { conversation, setConversation, messages, setMessages, currentConversation } = useAppProvider();
  const { user } = useUser();

  // Create a new conversation ID if one doesn't exist
  useEffect(() => {
    if (!conversationId) {
      setConversationId(uuidv4());
    }
  }, [conversationId]);

  // Load conversation history if current conversation exists
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (currentConversation?.id && user?.id && messages.length === 0) {
        try {
          const response = await fetch(
            `/api/chat-history?userId=${user.id}&topicId=${currentConversation.id}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
              // 转换消息格式以适应UI
              const formattedMessages = data.messages.map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                isUser: msg.role === 'user',
                // 如果消息包含图片元数据，解析并添加imageUrl
                imageUrl: (() => {
                  try {
                    const metadata = msg.metadata ? JSON.parse(msg.metadata) : null;
                    return metadata && metadata.hasImage && metadata.imagePreview
                      ? metadata.imagePreview.substring(0, 30) + '...'
                      : undefined;
                  } catch (e) {
                    return undefined;
                  }
                })()
              }));

              setMessages(formattedMessages);

              // 也更新传统的对话字符串格式（向后兼容）
              const conversationText = data.messages
                .map((msg: any) => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
                .join('\n');

              setConversation(conversationText);
            }
          } else {
            console.error('Failed to load conversation history');
          }
        } catch (error) {
          console.error('Error loading conversation history:', error);
        }
      }
    };

    loadConversationHistory();
  }, [currentConversation, user, messages.length, setMessages, setConversation]);

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
      toast({
        title: "Please enter a username",
        description: "Please enter a username to continue",
      })
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
      formData.append('conversationId', currentConversation.id);
    } else if (conversationId) {
      // 检查是否有历史消息
      const hasExistingMessages = messages.length > 0;

      // Create a new conversation in the database first if no currentConversation
      try {
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user?.id,
            title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          topicId = data.id;
          formData.append('conversationId', data.id);
          // Update local conversation ID
          setConversationId(data.id);

          // 只有在没有历史消息时才刷新侧边栏列表，避免重复刷新
          if (typeof window !== 'undefined' && window._sidebarFunctions?.getConversationList && !hasExistingMessages) {
            window._sidebarFunctions.getConversationList();
          }
        } else {
          console.error('Failed to create conversation');
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    }

    // 直接保存用户消息到数据库
    if (topicId && user?.id) {
      try {
        // 如果有图片，创建包含图片信息的元数据
        let messageMetadata = undefined;
        if (imagePreview) {
          messageMetadata = JSON.stringify({
            hasImage: true,
            imageType: selectedImage?.type || 'image/jpeg',
            imagePreview: imagePreview.substring(0, 100) + '...' // 存储图片预览的截断版本
          });
        }

        const messageResponse = await fetch('/api/chat-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topicId,
            content: input,
            role: 'user',
            userId: user.id,
            metadata: messageMetadata,
            created_at: new Date().toISOString()
          }),
        });

        if (messageResponse.ok) {
          const savedMessage = await messageResponse.json();
          // 更新消息ID为数据库中的ID
          userMessage.id = savedMessage.id;
          // 更新formData中的messageId
          formData.set('messageId', savedMessage.id);
        } else {
          console.error('Failed to save user message to database');
        }
      } catch (error) {
        console.error('Error saving user message:', error);
        // 即使保存失败，也继续执行
      }
    }

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
        const lines = chunk.split('\n\n');
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
              }
            } catch (error) {
              console.error('Error parsing SSE message:', error);
            }
          } else if (line.startsWith('event: end')) {
            // End event received
            done = true;

            // 当AI响应完成后，将完整响应保存到数据库
            if (topicId && user?.id && userMessage.id) {
              try {
                // 使用延迟保存AI消息，确保响应已完整接收
                setTimeout(async () => {
                  try {
                    console.log('[saveAIMessage] Saving AI response:', {
                      topicId,
                      contentLength: accumulatedResponse.length
                    });

                    const aiMessageResponse = await fetch('/api/chat-message', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        topicId,
                        content: accumulatedResponse,
                        role: 'assistant',
                        userId: user.id,
                        created_at: new Date().toISOString()
                      }),
                    });

                    if (!aiMessageResponse.ok) {
                      const errorData = await aiMessageResponse.json().catch(() => ({}));
                      console.error('[saveAIMessage] Failed to save AI message:', {
                        status: aiMessageResponse.status,
                        statusText: aiMessageResponse.statusText,
                        error: errorData.error || 'Unknown error'
                      });
                      throw new Error(`Failed to save AI message: ${aiMessageResponse.statusText}`);
                    }

                    const savedAiMessage = await aiMessageResponse.json();
                    console.log('[saveAIMessage] AI message saved successfully:', {
                      messageId: savedAiMessage.id,
                      topicId: savedAiMessage.topic_id
                    });

                    // 更新UI中AI消息的ID
                    setMessages((prevMessages: Message[]) => {
                      return prevMessages.map(msg => {
                        if (msg.isUser === false && msg.content === accumulatedResponse) {
                          return { ...msg, id: savedAiMessage.id };
                        }
                        return msg;
                      });
                    });
                  } catch (error) {
                    console.error('[saveAIMessage] Error in save operation:', error);
                    // 可以在这里添加用户提示或重试逻辑
                  }
                }, 100);
              } catch (error) {
                console.error('[saveAIMessage] Outer error:', error);
              }
            } else {
              console.error('[saveAIMessage] Missing required data:', {
                hasTopicId: !!topicId,
                hasUserId: !!user?.id,
                hasUserMessageId: !!userMessage.id
              });
            }

            break;
          }
        }
      }

      // After the conversation is completed, update the conversation title if it's new
      if (topicId && !currentConversation?.id) {
        try {
          // 使用防抖更新会话标题
          const updateConversationTitle = debounce(async () => {
            // Generate a better title from the first message
            const titleResponse = await fetch('/api/conversations', {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                topicId: topicId,
                title: input.length > 30 ? input.slice(0, 27) + '...' : input,
                userId: user?.id,
              }),
            });

            if (!titleResponse.ok) {
              console.error('Failed to update conversation title');
            }

            // 刷新会话列表（带防抖），并且只在没有历史消息时刷新
            if (typeof window !== 'undefined' && window._sidebarFunctions?.getConversationList && messages.length <= 2) {
              window._sidebarFunctions.getConversationList();
            }
          }, 300);

          updateConversationTitle();
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
    </div>
  );
}
