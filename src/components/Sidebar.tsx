'use client';
import { PanelLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { SidebarProps } from '@/types';

export function AppSidebar({ openSidebar, onOpenChangeSidebar }: SidebarProps) {
  const [historyList, setHistoryList] = useState<string[]>([]);
  const getHistoryList = () => {
    setHistoryList([]);
  };
  useEffect(() => {
    getHistoryList();
  }, []);
  return (
    <Sidebar>
      <SidebarHeader>
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
        <SidebarGroup />
        {historyList.map((item, index) => (
          <div key={index}>{item}</div>
        ))}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
