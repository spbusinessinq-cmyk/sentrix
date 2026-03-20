import React, { useState } from 'react';
import { Shield, Flame, Link as LinkIcon, FileText, LockKeyhole, RotateCcw, Plus, Clock, Search } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { useToast } from '@/hooks/use-toast';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

const SESSION_START = format(new Date(Date.now() - 1000 * 60 * 14), 'HH:mm:ss');
const LAST_SCAN = format(new Date(Date.now() - 1000 * 47), 'HH:mm:ss');

const RISK_DOT: Record<string, string> = {
  safe:    'hsl(142 72% 38%)',
  caution: '#f59e0b',
  danger:  '#ef4444',
  unknown: 'rgba(148,163,184,0.3)',
};

export function HomeView() {
  const { navigate, history, burnSession, addTab } = useBrowserState();
  const [localSearch, setLocalSearch] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) navigate(localSearch.trim());
  };

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col items-center bg-background">

      {/* Status strip */}
      <div
        className="w-full px-6 py-1.5 flex items-center gap-5 text-[9px] font-mono tracking-[0.13em] overflow-x-auto shrink-0"
        style={{
          background: 'rgba(0,0,0,0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          color: 'rgba(148,163,184,0.45)',
        }}
      >
        <span className="flex items-center gap-1.5 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: 'hsl(142 72% 38%)', boxShadow: '0 0 4px rgba(22,163,74,0.7)' }}
          />
          SESSION ACTIVE — {SESSION_START}
        </span>
        <Divider />
        <span className="shrink-0">LAST SCAN {LAST_SCAN}</span>
        <Divider />
        <span className="shrink-0">VAULT LOCKED</span>
        <Divider />
        <span className="shrink-0" style={{ color: 'hsl(142 72% 42%)', opacity: 0.7 }}>
          LOCAL PROTECTIONS ENABLED
        </span>
        <span className="ml-auto shrink-0">CERT: TLS 1.3 / VALID</span>
      </div>

      {/* Content column */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-10 pb-10 w-full max-w-xl mx-auto">

        {/* Brand lockup */}
        <div className="flex flex-col items-center mb-9 text-center">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(22,163,74,0.1)',
                border: '1px solid rgba(22,163,74,0.2)',
                boxShadow: '0 0 16px rgba(22,163,74,0.12)',
              }}
            >
              <Shield className="w-4.5 h-4.5" style={{ color: 'hsl(142 72% 42%)' }} />
            </div>
            <div className="text-left">
              <h1 className="text-[18px] font-semibold text-foreground/88 tracking-tight leading-none">
                Browse clearly.{' '}
                <span style={{ color: 'hsl(142 72% 44%)' }}>Stay protected.</span>
              </h1>
              <p className="text-[9px] font-mono uppercase tracking-[0.18em] mt-1 flex items-center gap-1.5" style={{ color: 'rgba(148,163,184,0.4)' }}>
                <span className="w-1 h-1 rounded-full inline-block" style={{ background: 'hsl(142 72% 38%)', boxShadow: '0 0 4px rgba(22,163,74,0.7)' }} />
                Protected by BLACKDOG Engine v4.1.2
              </p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="w-full mb-7">
          <div
            className="flex items-center h-11 rounded-xl overflow-hidden transition-all duration-200"
            style={{
              background: inputFocused ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)',
              border: `1px solid ${inputFocused ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.07)'}`,
              boxShadow: inputFocused
                ? '0 0 0 1px rgba(22,163,74,0.12), 0 0 24px rgba(22,163,74,0.07), inset 0 1px 0 rgba(255,255,255,0.04)'
                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            }}
          >
            <div className="pl-4 pr-3 shrink-0">
              <Search className="w-3.5 h-3.5" style={{ color: inputFocused ? 'hsl(142 72% 42%)' : 'rgba(148,163,184,0.35)' }} />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Search securely or enter a URL"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground/80 placeholder:text-muted-foreground/28 font-mono caret-primary"
              spellCheck={false}
            />
            {localSearch && (
              <button
                type="submit"
                className="mr-2 px-3 py-1 rounded-lg text-[10px] font-bold tracking-[0.14em] uppercase transition-all duration-150"
                style={{
                  background: 'rgba(22,163,74,0.12)',
                  border: '1px solid rgba(22,163,74,0.25)',
                  color: 'hsl(142 72% 44%)',
                }}
              >
                Go
              </button>
            )}
          </div>
        </form>

        {/* Quick tools */}
        <div className="w-full mb-7">
          <div className="section-label mb-2.5">Quick Tools</div>
          <div className="grid grid-cols-3 gap-1.5">
            <UtilBlock icon={<Plus className="w-3.5 h-3.5" />} label="New Secure Tab" sub="Isolated session" onClick={addTab} />
            <UtilBlock
              icon={<Flame className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />}
              label="Burn Session" sub="Sanitize all data"
              onClick={() => { burnSession(); toast({ title: 'Session Burned', description: 'All data sanitized.' }); }}
              danger
            />
            <UtilBlock icon={<LinkIcon className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />} label="Link Check" sub="Pre-flight analysis" onClick={() => toast({ title: 'Link Check', description: 'Enter a URL in the address bar to analyze.' })} />
            <UtilBlock icon={<FileText className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />} label="Privacy Report" sub="Tracker summary" onClick={() => navigate('vero://privacy')} />
            <UtilBlock icon={<LockKeyhole className="w-3.5 h-3.5" style={{ color: 'hsl(142 72% 42%)' }} />} label="Vault Access" sub="Credentials locked" onClick={() => navigate('vero://vault')} />
            <UtilBlock icon={<RotateCcw className="w-3.5 h-3.5" />} label="Session Controls" sub="Manage isolation" onClick={() => navigate('vero://settings')} />
          </div>
        </div>

        {/* Page inspection */}
        <div
          className="w-full rounded-xl overflow-hidden mb-5"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.055)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <span className="section-label">Page Inspection — vero://newtab</span>
            <span className="text-[9px] font-mono font-bold tracking-widest" style={{ color: 'hsl(142 72% 42%)', opacity: 0.7 }}>CLEAN</span>
          </div>
          <div className="grid grid-cols-4 divide-x" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {[['TRACKERS', '0', true], ['SCRIPTS', '0', false], ['REDIRECTS', '0', false], ['RISK', 'LOW', true]].map(([label, value, green]) => (
              <div key={label as string} className="px-4 py-3 flex flex-col gap-[5px]">
                <span className="section-label">{label}</span>
                <span
                  className="text-[13px] font-bold font-mono"
                  style={{ color: green ? 'hsl(142 72% 42%)' : 'rgba(148,163,184,0.6)' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent history */}
        {history.length > 0 && (
          <div className="w-full">
            <div className="section-label mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Recent
            </div>
            <div className="flex flex-col gap-px">
              {history.slice(0, 5).map(entry => (
                <button
                  key={entry.id}
                  onClick={() => navigate(entry.url)}
                  className="group flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: RISK_DOT[entry.riskLevel] }}
                  />
                  <span className="text-[12px] font-mono flex-1 truncate" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    {entry.title}
                  </span>
                  <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(148,163,184,0.25)' }}>
                    {format(entry.visitedAt, 'HH:mm')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <span className="shrink-0 text-[rgba(255,255,255,0.12)]">|</span>;
}

function UtilBlock({ icon, label, sub, onClick, danger = false }: {
  icon: React.ReactNode; label: string; sub: string; onClick: () => void; danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
      style={{
        background: hovered
          ? danger ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.04)'
          : 'rgba(0,0,0,0.28)',
        border: hovered
          ? danger ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(255,255,255,0.09)'
          : '1px solid rgba(255,255,255,0.055)',
        boxShadow: hovered ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
      }}
    >
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
        style={{
          background: 'rgba(0,0,0,0.35)',
          border: `1px solid ${hovered ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.06)'}`,
          color: hovered ? 'rgba(148,163,184,0.85)' : 'rgba(148,163,184,0.5)',
        }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[12px] font-medium leading-tight" style={{ color: 'rgba(148,163,184,0.82)' }}>
          {label}
        </div>
        <div className="text-[10px] font-mono leading-tight mt-0.5" style={{ color: 'rgba(148,163,184,0.35)' }}>
          {sub}
        </div>
      </div>
    </button>
  );
}
