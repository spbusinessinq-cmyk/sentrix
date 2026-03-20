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
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3.5 border-r border-white/[0.05] shrink-0">
        <Shield className="w-3 h-3" style={{ color: 'rgba(56,189,248,0.65)', opacity: 0.9 }} />
        <span
          className="text-[10px] font-bold tracking-[0.22em] uppercase"
          style={{ color: '#38BDF8', opacity: 0.80, fontFamily: "'JetBrains Mono', monospace" }}
        >
          SENTRIX
        </span>
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
                'group relative flex items-center gap-2 h-full min-w-[130px] max-w-[200px] px-3.5 border-r border-white/[0.04] cursor-default transition-all duration-150 shrink-0',
                isActive ? 'text-foreground/90' : 'text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-white/[0.025]'
              )}
              style={isActive ? {
                background: 'linear-gradient(180deg, rgba(56,189,248,0.04) 0%, rgba(0,0,0,0.5) 40%)',
                boxShadow: 'inset 0 -1px 0 rgba(56,189,248,0.07)',
              } : {}}
            >
              {isActive && (
                <div
                  className="absolute top-0 left-0 right-0 h-[1.5px]"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.5) 20%, #38BDF8 50%, rgba(56,189,248,0.5) 80%, transparent 100%)',
                    boxShadow: '0 1px 5px rgba(56,189,248,0.25)',
                  }}
                />
              )}
              <span className="text-[11px] font-medium flex-1 truncate leading-none">{tab.title}</span>
              <button
                onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                className={twMerge(
                  'w-4 h-4 flex items-center justify-center rounded-sm transition-all shrink-0',
                  isActive ? 'opacity-20 hover:opacity-60 hover:bg-white/10' : 'opacity-0 group-hover:opacity-20 hover:opacity-50 hover:bg-white/10'
                )}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        <button
          onClick={addTab}
          title="New Tab"
          className="flex items-center justify-center w-8 h-full shrink-0 transition-colors duration-150"
          style={{ color: 'rgba(148,163,184,0.28)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.28)')}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* BLACKDOG status */}
      <div className="flex items-center px-3.5 border-l border-white/[0.05] shrink-0 gap-2">
        <div
          className="flex items-center gap-1.5 px-2.5 py-[5px] rounded-full transition-all duration-500"
          style={{
            background: isConnected ? 'rgba(56,189,248,0.07)' : 'rgba(245,158,11,0.07)',
            border: `1px solid ${isConnected ? 'rgba(56,189,248,0.18)' : 'rgba(245,158,11,0.2)'}`,
            boxShadow: isConnected ? '0 0 10px rgba(56,189,248,0.06)' : 'none',
          }}
        >
          {isConnected ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#38BDF8', boxShadow: '0 0 5px rgba(56,189,248,0.7)' }} />
              <Activity className="w-2.5 h-2.5" style={{ color: 'rgba(56,189,248,0.80)', opacity: 0.85 }} />
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase hidden sm:block" style={{ color: '#38BDF8', opacity: 0.80 }}>
                BLACKDOG ACTIVE
              </span>
            </>
          ) : (
            <>
              <Loader2 className="w-2.5 h-2.5 animate-spin" style={{ color: 'rgba(245,158,11,0.7)' }} />
              <span className="text-[9px] font-bold tracking-[0.18em] uppercase hidden sm:block" style={{ color: 'rgba(245,158,11,0.6)' }}>
                CONNECTING
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
