'use client';
import { PanelLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAppProvider } from '@/hooks/useAppProvider';
import { SidebarProps } from '@/types';

export function AppSidebar({ openSidebar, onOpenChangeSidebar }: SidebarProps) {
  const [historyList, setHistoryList] = useState<string[]>([]);
  const { setConversation } = useAppProvider();

  const getHistoryList = () => {
    setHistoryList([]);
  };

  const handleNewChat = () => {
    setConversation('');
  };

  useEffect(() => {
    getHistoryList();
  }, []);

  return (
    <Sidebar>
      <SidebarHeader className='p-3'>
        <div className="flex justify-between items-center">
          <span>AI-Chat</span>
          {openSidebar ? (
            <Button variant="ghost" size="icon" onClick={() => onOpenChangeSidebar(!open)}>
              <PanelLeft />
            </Button>
          ) : null}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup >
          <div className='flex justify-center'>
            <Button className='w-full' variant="outline" size="sm" onClick={handleNewChat}>
              New Chat
            </Button>
          </div>
        </SidebarGroup>
        <SidebarGroup >
          {historyList.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
