import { createContext } from 'react';

export interface Message {
  content: string;
  isUser: boolean;
  imageUrl?: string;
  id?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface AppProviderContext {
  username: string;
  setUsername: (val: string) => void;
  conversation: string,
  setConversation: (val: string) => void;
  messages: Message[];
  setMessages: (val: Message[] | ((prev: Message[]) => Message[])) => void;
  currentConversation: Conversation | null;
  setCurrentConversation: (val: Conversation | null) => void;
}

export const AppProviderContext = createContext<AppProviderContext>({
  username: '',
  setUsername: () => { },
  conversation: '',
  setConversation: () => { },
  messages: [],
  setMessages: () => { },
  currentConversation: null,
  setCurrentConversation: () => { }
});
