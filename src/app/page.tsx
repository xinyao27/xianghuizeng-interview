'use client';
import { useState } from 'react';

import { ChatLayout } from '@/components/ChatLayout';
import { Navber } from '@/components/Navber';
import { AppSidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppProvider } from '@/lib/AppProvider';
export default function Home() {
  const [open, setOpen] = useState(false);
  const onOpenChange = (open: boolean) => {
    setOpen(open);
  };
  return (
    <AppProvider>
      <SidebarProvider open={open} onOpenChange={onOpenChange}>
        <div className="flex h-screen w-screen">
          <AppSidebar openSidebar={open} onOpenChangeSidebar={onOpenChange} />
          <main className="flex-1 p-3 flex flex-col">
            <Navber openSidebar={open} onOpenChangeSidebar={onOpenChange} />
            <ChatLayout />
          </main>
        </div>
      </SidebarProvider>
    </AppProvider>
  );
}
