'use client';

import { Bot, Copy, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

type MessageProps = {
  content: string;
  isUser: boolean;
  imageUrl?: string;
};

export function ChatMessage({ content, isUser, imageUrl }: MessageProps) {
  // Track if this is a new message to apply animation
  const [isNew, setIsNew] = useState(true);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Remove the "new" status after animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNew(false);
    }, 1500); // Match with animation duration

    return () => clearTimeout(timer);
  }, []);

  // Copy message content to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (isUser) {
    // User message - right aligned with background color
    return (
      <div className="flex justify-end p-4 w-full w-[800px] mx-auto">
        <div className="bg-primary/10 rounded-lg rounded-tr-none p-3 max-w-[80%] relative group">
          {imageUrl && (
            <div className="mb-2">
              <div
                className="relative w-48 h-48 overflow-hidden rounded-lg cursor-pointer group"
                onClick={() => setIsImageZoomed(true)}
              >
                <Image
                  src={imageUrl}
                  alt="Uploaded image"
                  className="object-cover transition-transform group-hover:scale-105"
                  fill
                  sizes="(max-width: 768px) 100vw, 192px"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="text-white" size={24} />
                </div>
              </div>
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap">{content}</div>

          {/* Copy button at the bottom */}
          {!isUser ? <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Copy message"
            >
              <Copy size={12} className={cn(isCopied ? "text-green-500" : "")} />
              <span>{isCopied ? "已复制" : "复制"}</span>
            </button>
          </div> : null}
        </div>
      </div>
    );
  }
  const processMarkdown = (text: string) => {
    return text.replace(/\\n/g, `  \n  `).replace(/\\/g, `  `);
  };
  // AI message - left aligned with Bot icon, no background
  return (
    <div className="flex gap-3 p-4 w-full w-[760px] mx-auto">
      <div className="h-8 w-8 shrink-0 mt-1 rounded-full bg-blue-500 text-white flex items-center justify-center">
        <Bot size={16} />
      </div>

      <div className="max-w-[80%] overflow-hidden relative group">
        <div className="prose prose-sm dark:prose-invert overflow-visible">
          <div className={cn(
            isNew && "animate-typewriter origin-left",
            "inline-block"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                pre: ({ ...props }) => (
                  <div className="overflow-auto rounded-lg bg-black/10 dark:bg-white/10 p-4 my-2">
                    <pre {...props} />
                  </div>
                ),
                code: ({ ...props }) => (
                  <code className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5" {...props} />
                ),
                p: ({ ...props }) => (
                  <p className="mb-2 last:mb-0 whitespace-pre-line" {...props} />
                ),
                ul: ({ ...props }) => (
                  <ul className="list-disc pl-6 mb-2" {...props} />
                ),
                ol: ({ ...props }) => (
                  <ol className="list-decimal pl-6 mb-2" {...props} />
                ),
                li: ({ ...props }) => (
                  <li className="mb-1" {...props} />
                ),
                br: () => <br />,
                img: ({ src, alt }) => (
                  <div
                    className="relative w-64 h-48 overflow-hidden rounded-lg my-2 cursor-pointer group"
                    onClick={() => src && setIsImageZoomed(true)}
                  >
                    {src && (
                      <>
                        <Image
                          src={src}
                          alt={alt || "Image"}
                          className="object-cover transition-transform group-hover:scale-105"
                          fill
                          sizes="(max-width: 768px) 100vw, 256px"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="text-white" size={24} />
                        </div>
                      </>
                    )}
                  </div>
                ),
              }}
            >
              {processMarkdown(content)}
            </ReactMarkdown>
          </div>
        </div>

        {/* Copy button for AI messages at the bottom */}
        <div className="flex mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Copy message"
          >
            <Copy size={12} className={cn(isCopied ? "text-green-500" : "")} />
            <span>{isCopied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Image Modal for zoomed view */}
      {isImageZoomed && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[80vh] h-auto w-auto rounded-lg overflow-hidden">
            <Image
              src={imageUrl || ''}
              alt="Zoomed image"
              className="object-contain"
              width={1000}
              height={800}
            />
          </div>
        </div>
      )}
    </div>
  );
} 