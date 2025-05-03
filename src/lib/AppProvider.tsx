import React, { PropsWithChildren, useEffect, useState } from 'react';

import { AppProviderContext } from './AppContext';
import { getCookie, setCookie } from './utils';

const USERNAME_COOKIE_KEY = 'chat_username';

export const AppProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [username, setUsername] = useState<string>('');
  const [conversation, setConversation] = useState<string>('')
  useEffect(() => {
    // Load username from cookie on mount
    const savedUsername = getCookie(USERNAME_COOKIE_KEY);
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleSetUsername = (newUsername: string) => {
    setUsername(newUsername);
    setCookie(USERNAME_COOKIE_KEY, newUsername);
  };

  const contextValue: AppProviderContext = {
    username,
    setUsername: handleSetUsername,
    conversation,
    setConversation
  };

  return <AppProviderContext.Provider value={contextValue}>{children}</AppProviderContext.Provider>;
};
