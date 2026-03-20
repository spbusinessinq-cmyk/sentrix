import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Shield, Link as LinkIcon, BookOpen,
  Layers, Activity, Clock, ExternalLink, ArrowRight, Flame
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { format } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import { LinkCheckModal } from '@/components/LinkCheckModal';

const RISK_DOT: Record<string, string> = {
  safe:    'hsl(142 72% 38%)',
  caution: '#f59e0b',
  danger:  '#ef4444',
  unknown: 'rgba(148,163,184,0.25)',
};

export function HomeView() {
  const {
    navigate, navigateOrOpen, history, bookmarks, savedItems, collections,
    blackdogStatus, burnSession, settings,
  } = useBrowserState();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [linkCheckOpen, setLinkCheckOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search bar on load
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigateOrOpen(query.trim());
  };

  const bdConnected = blackdogStatus === 'connected';
  const recentSearches = history.filter(h => h.riskLevel !== undefined).slice(0, 4);
  const recentBookmarks = bookmarks.slice(0, 4);

  return (
    <div className="h-full overflow-y-auto bg-background flex flex-col">

      {/* ── Intelligence status strip ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-6 px-6 py-1.5 shrink-0 overflow-x-auto"
        style={{
          background: 'rgba(0,0,0,0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <StatusPip
          active={bdConnected}
          label={bdConnected ? 'BLACKDOG ACTIVE' : 'BLACKDOG CONNECTING'}
          glow={bdConnected}
        />
        <div className="w-px h-3 bg-white/[0.08] shrink-0" />
        <StatusItem label="Saved" value={savedItems.length} />
        <StatusItem label="Collections" value={collections.length} />
        <StatusItem label="Bookmarks" value={bookmarks.length} />
        <StatusItem label="Searches" value={history.length} />
        {settings.developerMode && (
          <>
            <div className="w-px h-3 bg-white/[0.08] shrink-0" />
            <span className="text-[9px] font-mono text-amber-500/40 uppercase tracking-widest shrink-0">DEV</span>
          </>
        )}
        <div className="ml-auto text-[9px] font-mono text-muted-foreground/25 shrink-0 uppercase tracking-widest">
          SESSION ACTIVE
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center px-6 pt-12 pb-10 max-w-2xl mx-auto w-full">

        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(22,163,74,0.08)',
                border: '1px solid rgba(22,163,74,0.15)',
                boxShadow: '0 0 20px rgba(22,163,74,0.08)',
              }}
            >
              <Shield className="w-5 h-5" style={{ color: 'hsl(142 72% 40%)' }} />
            </div>
            <span
              className="text-[28px] font-bold tracking-[0.2em] uppercase"
              style={{
                color: 'hsl(142 72% 44%)',
                textShadow: '0 0 40px rgba(22,163,74,0.2)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              SENTRIX
            </span>
          </div>

          <h1 className="text-[20px] font-semibold text-foreground/80 leading-tight mb-2">
            Search clearly.{' '}
            <span style={{ color: 'hsl(142 72% 44%)' }}>Decide before you click.</span>
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground/35 tracking-wide">
            Intelligence-powered search with BLACKDOG analysis.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="w-full mb-8">
          <div
            className="relative flex items-center rounded-2xl overflow-hidden transition-all duration-200"
            style={{
              background: focused ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.42)',
              border: `1px solid ${focused ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.07)'}`,
              boxShadow: focused
                ? '0 0 0 1px rgba(22,163,74,0.1), 0 0 40px rgba(22,163,74,0.07), inset 0 1px 0 rgba(255,255,255,0.04)'
                : 'inset 0 1px 0 rgba(255,255,255,0.025)',
              transition: 'box-shadow 0.2s, border-color 0.2s',
            }}
          >
            <div className="pl-5 pr-3.5 shrink-0">
              <Search
                className="w-4 h-4 transition-colors duration-200"
                style={{ color: focused ? 'hsl(142 72% 42%)' : 'rgba(148,163,184,0.3)' }}
              />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search or enter a URL to inspect…"
              className="flex-1 bg-transparent border-none outline-none py-3.5 text-[14px] text-foreground/80 placeholder:text-muted-foreground/25 font-mono caret-primary"
              spellCheck={false}
              autoComplete="off"
            />
            {query && (
              <button
                type="submit"
                className="flex items-center gap-1.5 mr-2 px-3.5 py-1.5 rounded-xl text-[10px] font-bold tracking-[0.12em] uppercase transition-all"
                style={{
                  background: 'rgba(22,163,74,0.1)',
                  border: '1px solid rgba(22,163,74,0.22)',
                  color: 'hsl(142 72% 44%)',
                }}
              >
                Go <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </form>

        {/* Quick Actions */}
        <div className="w-full mb-8">
          <div className="section-label mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction
              icon={<LinkIcon className="w-4 h-4" />}
              label="Link Check"
              desc="Pre-flight URL analysis"
              onClick={() => setLinkCheckOpen(true)}
            />
            <QuickAction
              icon={<BookOpen className="w-4 h-4" />}
              label="Bookmarks"
              desc={`${bookmarks.length} saved sources`}
              onClick={() => navigate('sentrix://bookmarks')}
            />
            <QuickAction
              icon={<Layers className="w-4 h-4" />}
              label="Collections"
              desc={`${collections.length} collections · ${savedItems.length} saved`}
              onClick={() => navigate('sentrix://collections')}
            />
            <QuickAction
              icon={<Shield className="w-4 h-4" />}
              label="Privacy Report"
              desc="Session posture summary"
              onClick={() => navigate('sentrix://privacy')}
            />
          </div>
        </div>

        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <div className="w-full mb-6">
            <div className="section-label mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Recent
            </div>
            <div className="flex flex-col gap-px">
              {recentSearches.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => navigate(entry.url)}
                  className="group flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: RISK_DOT[entry.riskLevel] ?? RISK_DOT.unknown }}
                  />
                  <span className="flex-1 truncate text-[12px] font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    {entry.title}
                  </span>
                  <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(148,163,184,0.22)' }}>
                    {format(entry.visitedAt, 'HH:mm')}
                  </span>
                </button>
              ))}
              {history.length > 4 && (
                <button
                  onClick={() => navigate('sentrix://history')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono text-muted-foreground/30 hover:text-muted-foreground/55 transition-colors"
                >
                  View all ({history.length}) <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Saved items */}
        {recentBookmarks.length > 0 && (
          <div className="w-full mb-6">
            <div className="section-label mb-2.5">Saved Sources</div>
            <div className="flex flex-col gap-px">
              {recentBookmarks.map(bm => (
                <button
                  key={bm.id}
                  onClick={() => navigate(bm.url)}
                  className="group flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: RISK_DOT[bm.riskLevel] ?? RISK_DOT.unknown }} />
                  <span className="flex-1 text-[12px] font-mono truncate" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    {bm.title}
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Intelligence Network footer */}
        <div className="w-full mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-between">
            <a
              href="https://rsrintel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-mono transition-colors"
              style={{ color: 'rgba(148,163,184,0.28)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(22,163,74,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.28)')}
            >
              <Shield className="w-3 h-3 shrink-0" />
              rsrintel.com — Intelligence Network
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <button
              onClick={burnSession}
              className="flex items-center gap-1.5 text-[10px] font-mono transition-colors"
              style={{ color: 'rgba(239,68,68,0.3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.3)')}
            >
              <Flame className="w-3 h-3" /> Burn session
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {linkCheckOpen && (
          <LinkCheckModal onClose={() => setLinkCheckOpen(false)} onNavigate={navigate} />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusPip({ active, label, glow }: { active: boolean; label: string; glow: boolean }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: active ? 'hsl(142 72% 38%)' : '#f59e0b',
          boxShadow: glow && active ? '0 0 5px rgba(22,163,74,0.8)' : 'none',
        }}
      />
      <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: active ? 'rgba(22,163,74,0.5)' : 'rgba(245,158,11,0.45)' }}>
        {label}
      </span>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/25">{label}</span>
      <span className="text-[9px] font-mono font-bold text-muted-foreground/45">{value}</span>
    </div>
  );
}

function QuickAction({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
      style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.055)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
        e.currentTarget.style.borderColor = 'rgba(22,163,74,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.28)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.055)';
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.45)' }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[12px] font-medium text-foreground/70">{label}</div>
        <div className="text-[10px] font-mono text-muted-foreground/35 mt-0.5">{desc}</div>
      </div>
    </button>
  );
}
