'use client';
import { useState } from 'react';

import { ChatLayout } from '@/components/ChatLayout';
import { Navber } from '@/components/Navber';
import { AppSidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppProvider } from '@/lib/AppProvider';
import { UserProvider } from '@/lib/UserContext';

export default function Home() {
  const [open, setOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarOpen');
      return savedState ? JSON.parse(savedState) : false;
    }
    return false;
  });

  const onOpenChange = (open: boolean) => {
    setOpen(open);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', JSON.stringify(open));
    }
  };
  return (
    <UserProvider>
      <AppProvider>
        <SidebarProvider open={open} onOpenChange={onOpenChange}>
          <div className="flex h-screen w-screen">
            <AppSidebar openSidebar={open} onOpenChangeSidebar={onOpenChange} />
            <main className="flex-1 flex flex-col overflow-hidden">
              <Navber openSidebar={open} onOpenChangeSidebar={onOpenChange} />
              <ChatLayout />
            </main>
          </div>
        </SidebarProvider>
      </AppProvider>
    </UserProvider>
  );
}
