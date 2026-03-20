import React from 'react';
import { Home, Search, Clock, Download, Shield, LockKeyhole, Settings, BookOpen } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { PageType } from '@/lib/blackdog';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  target: string; // vero:// url to navigate to
  matchPageType: PageType;
}

const MAIN_ITEMS: NavItem[] = [
  { id: 'home',      icon: Home,       label: 'Home',          target: 'vero://newtab',    matchPageType: 'newtab' },
  { id: 'search',    icon: Search,     label: 'Search',        target: 'vero://search',    matchPageType: 'search' },
  { id: 'history',   icon: Clock,      label: 'History',       target: 'vero://history',   matchPageType: 'history' },
  { id: 'downloads', icon: Download,   label: 'Downloads',     target: 'vero://downloads', matchPageType: 'downloads' },
  { id: 'bookmarks', icon: BookOpen,   label: 'Bookmarks',     target: 'vero://newtab',    matchPageType: 'newtab' },
];

const SECURITY_ITEMS: NavItem[] = [
  { id: 'privacy', icon: Shield,      label: 'Privacy Report', target: 'vero://privacy', matchPageType: 'privacy' },
  { id: 'vault',   icon: LockKeyhole, label: 'Secure Vault',   target: 'vero://vault',   matchPageType: 'vault' },
];

export function TacticalSidebar() {
  const { pageType, navigate } = useBrowserState();

  const renderItem = (item: NavItem) => {
    const isActive = pageType === item.matchPageType && item.id !== 'bookmarks';
    const Icon = item.icon;

    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>
          <button
            onClick={() => navigate(item.target)}
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
        <TooltipContent side="right" className="bg-[#111113] border-white/10 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('vero://settings')}
              className={twMerge(
                'relative flex items-center justify-center w-9 h-9 rounded transition-all duration-200',
                pageType === 'settings'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground/40 hover:bg-white/[0.05] hover:text-muted-foreground/80 border border-transparent'
              )}
            >
              {pageType === 'settings' && (
                <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
              )}
              <Settings className="w-4 h-4" strokeWidth={pageType === 'settings' ? 2 : 1.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[#111113] border-white/10 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            Settings
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
