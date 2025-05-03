import React, { PropsWithChildren, useState } from 'react';

import { AppProviderContext } from './AppContext';
export const AppProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [username, setUsername] = useState<string>('')
  const contextValue: AppProviderContext = {
    username,
    setUsername,
  };

  return <AppProviderContext.Provider value={contextValue}>{children}</AppProviderContext.Provider>;
};
