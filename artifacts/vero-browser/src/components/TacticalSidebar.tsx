import React from 'react';
import { Home, Search, Clock, Download, Shield, LockKeyhole, Settings } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function TacticalSidebar() {
  const { activeSidebarItem, setActiveSidebarItem } = useBrowserState();

  const mainItems = [
    { id: 'home', icon: Home, label: 'Home Base' },
    { id: 'search', icon: Search, label: 'Deep Search' },
    { id: 'history', icon: Clock, label: 'Session Log' },
    { id: 'downloads', icon: Download, label: 'Intercepts' },
  ];

  const securityItems = [
    { id: 'privacy', icon: Shield, label: 'Privacy Center' },
    { id: 'vault', icon: LockKeyhole, label: 'Secure Vault' },
  ];

  const renderIcon = (item: any) => {
    const isActive = activeSidebarItem === item.id;
    const Icon = item.icon;
    
    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setActiveSidebarItem(item.id)}
            className={twMerge(
              "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 group",
              isActive 
                ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(22,163,74,0.15)] border border-primary/20" 
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent hover:border-white/5"
            )}
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_8px_rgba(22,163,74,0.6)]" />
            )}
            <Icon className={twMerge("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(22,163,74,0.8)]")} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-card border-border text-xs tracking-wider">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="w-[60px] hidden md:flex flex-col items-center py-4 bg-card/30 backdrop-blur-xl border-r border-border z-10 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      
      <div className="flex flex-col gap-3">
        {mainItems.map(renderIcon)}
      </div>

      <div className="w-8 h-[1px] bg-border my-6" />

      <div className="flex flex-col gap-3">
        {securityItems.map(renderIcon)}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {renderIcon({ id: 'settings', icon: Settings, label: 'System Configuration' })}
      </div>
    </div>
  );
}
