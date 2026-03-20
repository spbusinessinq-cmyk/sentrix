import React from 'react';
import { Shield, Plus, X, Activity, Loader2 } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';

export function VeroTabBar() {
  const { tabs, activeTabId, setActiveTabId, closeTab, addTab, blackdogStatus } = useBrowserState();
  const isConnected = blackdogStatus === 'connected';

  return (
    <div
      className="flex items-stretch h-9 select-none relative z-20 shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.55) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      {/* Window controls + SENTRIX brand */}
      <div className="flex items-center gap-4 px-3.5 border-r border-white/[0.05] shrink-0">
        <div className="flex items-center gap-[5px]">
          <div className="w-[11px] h-[11px] rounded-full bg-[#FF5F57] hover:brightness-110 transition-[filter] cursor-default" />
          <div className="w-[11px] h-[11px] rounded-full bg-[#FEBC2E] hover:brightness-110 transition-[filter] cursor-default" />
          <div className="w-[11px] h-[11px] rounded-full bg-[#28C840] hover:brightness-110 transition-[filter] cursor-default" />
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" style={{ color: 'hsl(142 72% 38%)', opacity: 0.85 }} />
          <span
            className="text-[10.5px] font-bold tracking-[0.2em] uppercase"
            style={{ color: 'hsl(142 72% 42%)', opacity: 0.9 }}
          >
            SENTRIX
          </span>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex items-stretch flex-1 overflow-x-auto overflow-y-hidden">
        {tabs.map(tab => {
          const isActive = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={twMerge(
                'group relative flex items-center gap-2 h-full min-w-[140px] max-w-[210px] px-3.5 border-r border-white/[0.04] cursor-default transition-all duration-150 shrink-0',
                isActive ? 'text-foreground/92' : 'text-muted-foreground/45 hover:text-muted-foreground/75 hover:bg-white/[0.025]'
              )}
              style={isActive ? {
                background: 'linear-gradient(180deg, rgba(22,163,74,0.04) 0%, rgba(0,0,0,0.55) 40%)',
                boxShadow: 'inset 0 -1px 0 rgba(22,163,74,0.08)',
              } : {}}
            >
              {isActive && (
                <div
                  className="absolute top-0 left-0 right-0 h-[1.5px] rounded-b-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, hsl(142 72% 38%) 20%, hsl(142 72% 42%) 50%, hsl(142 72% 38%) 80%, transparent 100%)',
                    boxShadow: '0 1px 6px rgba(22,163,74,0.35)',
                  }}
                />
              )}

              <span className="text-[12px] font-medium flex-1 truncate leading-none">{tab.title}</span>

              <button
                onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                className={twMerge(
                  'w-4 h-4 flex items-center justify-center rounded-sm transition-all shrink-0',
                  isActive
                    ? 'opacity-25 hover:opacity-60 hover:bg-white/10'
                    : 'opacity-0 group-hover:opacity-25 hover:opacity-50 hover:bg-white/10'
                )}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        <button
          onClick={addTab}
          title="New Tab (Ctrl+T)"
          className="flex items-center justify-center w-8 h-full shrink-0 transition-colors duration-150"
          style={{ color: 'rgba(148,163,184,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.65)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.3)')}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* BLACKDOG status pill */}
      <div className="flex items-center px-3.5 border-l border-white/[0.05] shrink-0">
        <div
          className="flex items-center gap-1.5 px-2.5 py-[5px] rounded-full"
          style={{
            background: isConnected ? 'rgba(22,163,74,0.07)' : 'rgba(245,158,11,0.07)',
            border: `1px solid ${isConnected ? 'rgba(22,163,74,0.18)' : 'rgba(245,158,11,0.2)'}`,
            boxShadow: isConnected ? '0 0 10px rgba(22,163,74,0.08)' : 'none',
            transition: 'all 0.4s ease',
          }}
        >
          {isConnected ? (
            <>
              <div
                className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                style={{ boxShadow: '0 0 5px rgba(22,163,74,0.8), 0 0 10px rgba(22,163,74,0.3)' }}
              />
              <Activity className="w-2.5 h-2.5" style={{ color: 'hsl(142 72% 40%)', opacity: 0.85 }} />
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: 'hsl(142 72% 42%)', opacity: 0.85 }}>
                BLACKDOG ACTIVE
              </span>
            </>
          ) : (
            <>
              <Loader2 className="w-2.5 h-2.5 animate-spin" style={{ color: 'rgba(245,158,11,0.7)' }} />
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: 'rgba(245,158,11,0.65)' }}>
                CONNECTING
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
