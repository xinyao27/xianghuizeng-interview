'use client';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UsernameDialog } from '@/components/UsernameDialog';
import { useAppProvider } from '@/hooks/useAppProvider';
import { useUser } from '@/lib/UserContext';
import { SidebarProps } from '@/types';

export function Navber({ openSidebar }: SidebarProps) {
  const router = useRouter();
  const { user } = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setMessages, setConversation, setCurrentConversation } = useAppProvider();
  const handleAvatarClick = () => {
    setDialogOpen(true);
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversation('');
    setCurrentConversation(null)
    router.push('/');
  };

  return (
    <div className="flex justify-between p-3 border-b">
      <div className="flex items-center gap-2">
        {!openSidebar && (
          <>
            <SidebarTrigger />
            <Button variant="ghost" size="icon" onClick={handleNewChat}>
              <Plus className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      <div>
        {user ? (
          <Avatar
            onClick={handleAvatarClick}
            className="cursor-pointer hover:opacity-80 w-[32px] h-[32px]"
            title={user.username}
          >
            <AvatarFallback>{user.username.slice(0, 1).toUpperCase()}</AvatarFallback>
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
      </div>

      <UsernameDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
