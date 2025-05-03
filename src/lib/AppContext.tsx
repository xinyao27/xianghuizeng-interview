import { createContext } from 'react';

export interface Message {
  content: string;
  isUser: boolean;
  imageUrl?: string;
}

export interface AppProviderContext {
  username: string;
  setUsername: (val: string) => void;
  conversation: string,
  setConversation: (val: string) => void;
  messages: Message[];
  setMessages: (val: Message[] | ((prev: Message[]) => Message[])) => void;
}

export const AppProviderContext = createContext<AppProviderContext>({
  username: '',
  setUsername: () => { },
  conversation: '',
  setConversation: () => { },
  messages: [],
  setMessages: () => { }
});
