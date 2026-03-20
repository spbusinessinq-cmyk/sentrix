import React from 'react';
import { Shield, Plus, X, Activity } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function VeroTabBar() {
  const { activeTabId, setActiveTabId } = useBrowserState();

  const tabs = [
    { id: 'tab-1', title: 'New Tab', active: true },
    { id: 'tab-2', title: 'Secure Vault', active: false },
    { id: 'tab-3', title: 'Settings', active: false },
  ];

  return (
    <div className="flex items-center h-10 bg-background border-b border-white/5 px-2 select-none relative z-20">
      {/* Window Controls (Mac Style) */}
      <div className="flex items-center gap-2 px-3 pr-6">
        <button className="w-3 h-3 rounded-full bg-red/80 hover:bg-red transition-colors"></button>
        <button className="w-3 h-3 rounded-full bg-amber/80 hover:bg-amber transition-colors"></button>
        <button className="w-3 h-3 rounded-full bg-green/80 hover:bg-green transition-colors"></button>
      </div>

      {/* Vero Brand */}
      <div className="flex items-center gap-2 px-4 mr-2 border-r border-white/5 h-full">
        <Shield className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold tracking-widest text-primary">VERO</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-1 items-end h-full overflow-hidden">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={twMerge(
                "group relative flex items-center h-full min-w-[160px] max-w-[220px] px-3 cursor-default transition-all duration-200 border-r border-white/5",
                isActive ? "bg-card/80 text-foreground" : "text-muted-foreground hover:bg-white/5"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-0 w-full h-[2px] bg-primary shadow-[0_0_8px_rgba(22,163,74,0.6)]" />
              )}
              <span className="text-[12px] truncate flex-1">{tab.title}</span>
              <button className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-sm p-0.5 transition-all">
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        
        {/* New Tab Button */}
        <button className="ml-2 p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* BLACKDOG Status Pill */}
      <div className="ml-auto flex items-center pr-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 shadow-[0_0_15px_rgba(22,163,74,0.1)]">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow" />
          <span className="text-[10px] font-bold tracking-widest text-primary uppercase flex items-center gap-1">
            <Activity className="w-3 h-3" />
            BLACKDOG Active
          </span>
        </div>
      </div>
    </div>
  );
}
