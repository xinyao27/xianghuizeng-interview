'use client';

import { CircleStop, ImagePlus, Send, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/contexts/UserContext';
import { useAppProvider } from '@/hooks/useAppProvider';
import { Message } from '@/lib/AppContext';

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

  const { conversation, setConversation, messages, setMessages } = useAppProvider();
  const { user } = useUser();

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
    if (!input.trim() && !selectedImage) return;

    // Cleanup previous controller if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsGenerating(true);
    setIsWaitingForResponse(true);

    // Add user message to messages array with image if present
    const userMessage: Message = {
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

    // Add user ID if available
    if (user?.id) {
      formData.append('userId', user.id);
    }

    // Add conversation ID for thread tracking
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }

    // Add speed parameter
    formData.append('speed', typingSpeed);

    // Add image if selected
    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    try {
      // POST请求，使用FormData
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

      // 添加空的AI回复，准备接收流式内容
      const aiMessage: Message = {
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

        // 查找所有的SSE消息
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              // 提取JSON数据部分
              const jsonStr = line.substring(5).trim();
              const data = JSON.parse(jsonStr);
              if (data.text) {
                accumulatedResponse += data.text;

                // 更新消息数组中的AI回复
                setMessages((prevMessages: Message[]) => {
                  const updated = [...prevMessages];
                  if (updated.length > 0) {
                    updated[updated.length - 1].content = accumulatedResponse;
                  }
                  return updated;
                });

                // 同时更新旧的对话字符串
                setConversation(`${newConversation}\nAI: ${accumulatedResponse}`);
              }
            } catch (error) {
              console.error('Error parsing SSE message:', error);
            }
          } else if (line.startsWith('event: end')) {
            // 收到结束事件
            done = true;
            break;
          }
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
                    <CircleStop className="h-5 w-5" />
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
