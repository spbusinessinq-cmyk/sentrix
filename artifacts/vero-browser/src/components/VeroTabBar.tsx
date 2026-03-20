import React from 'react';
import { Shield, Plus, X, Activity } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';

const TABS = [
  { id: 'tab-1', title: 'New Tab', favicon: null },
  { id: 'tab-2', title: 'Secure Vault', favicon: null },
  { id: 'tab-3', title: 'Settings', favicon: null },
];

export function VeroTabBar() {
  const { activeTabId, setActiveTabId } = useBrowserState();

  return (
    <div className="flex items-stretch h-9 bg-black/60 border-b border-white/[0.05] select-none relative z-20 shrink-0">

      {/* Window controls + brand */}
      <div className="flex items-center gap-4 px-3 border-r border-white/[0.05] shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57] hover:brightness-110 transition-all cursor-default" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E] hover:brightness-110 transition-all cursor-default" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28C840] hover:brightness-110 transition-all cursor-default" />
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary opacity-80" />
          <span className="text-[11px] font-bold tracking-[0.15em] text-primary/90">VERO</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-stretch flex-1 overflow-hidden">
        {TABS.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={twMerge(
                'group relative flex items-center gap-2 h-full min-w-[130px] max-w-[200px] px-3 border-r border-white/[0.04] text-left transition-all duration-150',
                isActive
                  ? 'bg-[#0d0d0f] text-foreground/90'
                  : 'text-muted-foreground/50 hover:bg-white/[0.03] hover:text-muted-foreground/80'
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-primary/80" />
              )}
              <span className="text-[12px] flex-1 truncate text-left leading-none">{tab.title}</span>
              <X
                className={twMerge(
                  'w-3 h-3 shrink-0 transition-opacity',
                  isActive ? 'opacity-30 hover:opacity-70' : 'opacity-0 group-hover:opacity-30'
                )}
              />
            </button>
          );
        })}

        {/* New tab */}
        <button className="flex items-center justify-center w-8 h-full text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-white/[0.04] transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* BLACKDOG pill */}
      <div className="flex items-center px-3 border-l border-white/[0.05] shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-primary/20 bg-primary/[0.06]">
          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_4px_rgba(22,163,74,0.8)] animate-pulse" />
          <Activity className="w-2.5 h-2.5 text-primary/80" />
          <span className="text-[9px] font-bold tracking-[0.16em] text-primary/80 uppercase">BLACKDOG ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
