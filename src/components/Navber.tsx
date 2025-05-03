'use client';

import { Login } from '@/components/Login';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarProps } from '@/types';

export function Navber({ openSidebar }: SidebarProps) {
  return (
    <div className='flex justify-between'>
      <div>
        {!openSidebar ? <SidebarTrigger /> : null}
      </div>
      <div>
        <Button size='sm'>Login</Button>
        <Login />
      </div>
    </div>
  );
}
