'use client';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UsernameDialog } from '@/components/UsernameDialog';
import { useAppProvider } from '@/hooks/useAppProvider';
import { SidebarProps } from '@/types';

export function Navber({ openSidebar }: SidebarProps) {
  const { username, setUsername, setConversation } = useAppProvider()
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUsernameSubmit = (newUsername: string) => {
    setUsername(newUsername);
  };

  const handleAvatarClick = () => {
    setDialogOpen(true);
  };

  const handleNewChat = () => {
    setConversation('');
  };

  return (
    <div className="flex justify-between">
      <div className="flex items-center gap-2">
        {openSidebar ? <Button variant="ghost" size="icon" onClick={handleNewChat}>
          <Plus className="h-5 w-5" />
        </Button> : <SidebarTrigger />}
      </div>
      {username ? (
        <Avatar
          onClick={handleAvatarClick}
          className="cursor-pointer hover:opacity-80"
          title={username}
        >
          <AvatarFallback>{username.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      ) : (
        <Button
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          Login
        </Button>
      )}
      <UsernameDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleUsernameSubmit}
        defaultUsername={username}
        title={username ? 'Update Username' : 'Enter Your Username'}
        description={username ? 'Change your current username.' : 'Please enter a username to continue.'}
      />
    </div>
  );
}
