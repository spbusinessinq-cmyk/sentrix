import React from 'react';
import { Home, Search, Clock, Download, Shield, LockKeyhole, Settings, BookOpen } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const MAIN_ITEMS = [
  { id: 'home',      icon: Home,       label: 'Home' },
  { id: 'search',    icon: Search,     label: 'Search' },
  { id: 'history',   icon: Clock,      label: 'History' },
  { id: 'downloads', icon: Download,   label: 'Downloads' },
  { id: 'bookmarks', icon: BookOpen,   label: 'Bookmarks' },
];

const SECURITY_ITEMS = [
  { id: 'privacy', icon: Shield,      label: 'Privacy Center' },
  { id: 'vault',   icon: LockKeyhole, label: 'Secure Vault' },
];

export function TacticalSidebar() {
  const { activeSidebarItem, setActiveSidebarItem } = useBrowserState();

  const renderItem = (item: { id: string; icon: React.ElementType; label: string }) => {
    const isActive = activeSidebarItem === item.id;
    const Icon = item.icon;

    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setActiveSidebarItem(item.id)}
            className={twMerge(
              'relative flex items-center justify-center w-9 h-9 rounded transition-all duration-200',
              isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground/40 hover:bg-white/[0.05] hover:text-muted-foreground/80 border border-transparent'
            )}
          >
            {isActive && (
              <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
            )}
            <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-[#111113] border-white/10 text-[10px] font-mono tracking-widest text-muted-foreground uppercase"
        >
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="w-[52px] hidden md:flex flex-col items-center py-3 gap-1 bg-black/40 backdrop-blur-md border-r border-white/[0.05] z-10 shrink-0">

      {MAIN_ITEMS.map(renderItem)}

      <div className="w-6 h-px bg-white/[0.07] my-2" />

      {SECURITY_ITEMS.map(renderItem)}

      <div className="mt-auto">
        {renderItem({ id: 'settings', icon: Settings, label: 'Settings' })}
      </div>
    </div>
  );
}
