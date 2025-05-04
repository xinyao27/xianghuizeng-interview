export interface SidebarProps {
  openSidebar?: boolean;
  onOpenChangeSidebar: (open: boolean) => void;
}

declare global {
  interface Window {
    _sidebarFunctions?: {
      getConversationList?: () => void;
    };
  }
}
