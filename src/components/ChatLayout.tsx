'use client';
import { ChatInput } from "@/components/ChatInput";
import { ChatWindow } from "@/components/ChatWindow";

export function ChatLayout() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <ChatWindow />
      <ChatInput />
    </div>
  );
}
