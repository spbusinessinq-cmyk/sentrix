import React, { useState } from 'react';
import {
  Search, Clock, BookOpen, Layers, Download,
  Shield, Settings, Home
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { PageType } from '@/lib/blackdog';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  target: string;
  matchPageType: PageType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',        icon: Home,     label: 'Search',       target: 'sentrix://newtab',    matchPageType: 'newtab' },
  { id: 'search',      icon: Search,   label: 'Results',      target: 'sentrix://search',    matchPageType: 'search' },
  { id: 'recent',      icon: Clock,    label: 'Recent',       target: 'sentrix://history',   matchPageType: 'history' },
  { id: 'bookmarks',   icon: BookOpen, label: 'Bookmarks',    target: 'sentrix://bookmarks', matchPageType: 'bookmarks' },
  { id: 'collections', icon: Layers,   label: 'Collections',  target: 'sentrix://collections', matchPageType: 'collections' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { id: 'downloads',   icon: Download, label: 'Downloads',    target: 'sentrix://downloads', matchPageType: 'downloads' },
  { id: 'privacy',     icon: Shield,   label: 'Privacy',      target: 'sentrix://privacy',   matchPageType: 'privacy' },
];

function SidebarBtn({ item, isActive, onNavigate }: {
  item: NavItem; isActive: boolean; onNavigate: (target: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onNavigate(item.target)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
          style={{
            background: isActive ? 'rgba(22,163,74,0.1)' : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
            border: isActive ? '1px solid rgba(22,163,74,0.18)' : '1px solid transparent',
            color: isActive ? 'hsl(142 72% 42%)' : hovered ? 'rgba(148,163,184,0.82)' : 'rgba(148,163,184,0.34)',
            boxShadow: isActive ? '0 0 10px rgba(22,163,74,0.1)' : 'none',
          }}
        >
          {isActive && (
            <div
              className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
              style={{ background: 'hsl(142 72% 38%)', boxShadow: '0 0 6px rgba(22,163,74,0.5)' }}
            />
          )}
          <Icon className="w-[15px] h-[15px]" strokeWidth={isActive ? 2 : 1.5} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="text-[9px] font-mono tracking-[0.15em] uppercase"
        style={{
          background: 'rgba(8,8,11,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(148,163,184,0.7)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function TacticalSidebar() {
  const { pageType, navigate } = useBrowserState();
  const [settingsHovered, setSettingsHovered] = useState(false);
  const isSettingsActive = pageType === 'settings';

  return (
    <div
      className="w-[52px] hidden md:flex flex-col items-center py-3 gap-1 shrink-0 z-10"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.3) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {NAV_ITEMS.map(item => (
        <SidebarBtn
          key={item.id}
          item={item}
          isActive={pageType === item.matchPageType}
          onNavigate={navigate}
        />
      ))}

      <div className="w-5 h-px my-2" style={{ background: 'rgba(255,255,255,0.07)' }} />

      {BOTTOM_ITEMS.map(item => (
        <SidebarBtn
          key={item.id}
          item={item}
          isActive={pageType === item.matchPageType}
          onNavigate={navigate}
        />
      ))}

      <div className="mt-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('sentrix://settings')}
              onMouseEnter={() => setSettingsHovered(true)}
              onMouseLeave={() => setSettingsHovered(false)}
              className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
              style={{
                background: isSettingsActive ? 'rgba(22,163,74,0.1)' : settingsHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: isSettingsActive ? '1px solid rgba(22,163,74,0.18)' : '1px solid transparent',
                color: isSettingsActive ? 'hsl(142 72% 42%)' : settingsHovered ? 'rgba(148,163,184,0.82)' : 'rgba(148,163,184,0.34)',
                boxShadow: isSettingsActive ? '0 0 10px rgba(22,163,74,0.1)' : 'none',
              }}
            >
              {isSettingsActive && (
                <div
                  className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
                  style={{ background: 'hsl(142 72% 38%)', boxShadow: '0 0 6px rgba(22,163,74,0.5)' }}
                />
              )}
              <Settings className="w-[15px] h-[15px]" strokeWidth={isSettingsActive ? 2 : 1.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="text-[9px] font-mono tracking-[0.15em] uppercase"
            style={{
              background: 'rgba(8,8,11,0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(148,163,184,0.7)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            Settings
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
