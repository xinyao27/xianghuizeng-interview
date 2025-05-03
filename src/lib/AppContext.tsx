import { createContext } from 'react';
export interface AppProviderContext {
  username: string;
  setUsername: (val: string) => void;
}

export const AppProviderContext = createContext<AppProviderContext>({
  username: '',
  setUsername: () => { },
});
