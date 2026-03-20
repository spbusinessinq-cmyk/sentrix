import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Shield, Link as LinkIcon, BookOpen,
  Layers, Clock, ExternalLink, ArrowRight, Flame,
  Sparkles,
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { LinkCheckModal } from '@/components/LinkCheckModal';

const RISK_DOT: Record<string, string> = {
  safe:    'hsl(142 72% 38%)',  // green — real safety indicator
  caution: '#f59e0b',
  danger:  '#ef4444',
  unknown: 'rgba(148,163,184,0.25)',
};

const SAGE_STARTERS = [
  'Summarize this topic for me',
  'What should I verify first?',
  'Turn this into an investigation angle',
];

export function HomeView() {
  const {
    navigate, navigateOrOpen, navigateToSage,
    history, bookmarks, savedItems, collections,
    blackdogStatus, burnSession, settings,
  } = useBrowserState();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [linkCheckOpen, setLinkCheckOpen] = useState(false);
  const [sageInput, setSageInput] = useState('');
  const [sageFocused, setSageFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigateOrOpen(query.trim());
  };

  const handleAskSageFromSearch = () => {
    if (query.trim()) navigateToSage(query.trim());
  };

  const handleSageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sageInput.trim()) navigateToSage(sageInput.trim());
  };

  const bdConnected = blackdogStatus === 'connected';
  const recentSearches = history.filter(h => h.riskLevel !== undefined).slice(0, 4);
  const recentBookmarks = bookmarks.slice(0, 4);

  return (
    <div className="h-full overflow-y-auto bg-background flex flex-col">

      {/* ── Intelligence status strip ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-6 px-6 py-1.5 shrink-0 overflow-x-auto"
        style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* BLACKDOG status stays green — security indicator */}
        <StatusPip active={bdConnected} label={bdConnected ? 'BLACKDOG ACTIVE' : 'BLACKDOG CONNECTING'} glow={bdConnected} />
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
      <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">

        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
            >
              <Shield className="w-5 h-5" style={{ color: 'rgba(200,205,210,0.55)' }} />
            </div>
            <span
              className="text-[28px] font-bold tracking-[0.2em] uppercase"
              style={{
                color: '#E6E8EB',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              SENTRIX
            </span>
          </div>
          <h1 className="text-[20px] font-semibold text-foreground/80 leading-tight mb-2">
            Search clearly. Decide before you click.
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground/35 tracking-wide">
            Intelligence-powered search with BLACKDOG analysis.
          </p>
        </div>

        {/* ── Search bar (dual-action) ─────────────────────────────────────── */}
        <form onSubmit={handleSearchSubmit} className="w-full mb-3">
          <div
            className="relative flex items-center rounded-xl overflow-hidden"
            style={{
              background: focused ? 'rgba(0,0,0,0.58)' : 'rgba(0,0,0,0.38)',
              border: `1px solid ${focused ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.065)'}`,
              boxShadow: focused
                ? '0 0 0 1px rgba(255,255,255,0.04), 0 0 28px rgba(255,255,255,0.02)'
                : 'none',
              transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out, background 150ms ease-out',
            }}
          >
            <div className="pl-5 pr-3.5 shrink-0">
              <Search
                className="w-4 h-4 transition-colors duration-200"
                style={{ color: focused ? 'rgba(200,205,210,0.65)' : 'rgba(148,163,184,0.3)' }}
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
            <AnimatePresence>
              {query.trim() && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.12 }}
                  className="flex items-center gap-1.5 mr-2 shrink-0"
                >
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-[0.12em] uppercase transition-all cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: 'rgba(200,205,210,0.85)',
                    }}
                  >
                    Search <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleAskSageFromSearch}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-[0.12em] uppercase transition-all cursor-pointer"
                    style={{
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.28)',
                      color: 'rgba(139,92,246,0.9)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}
                  >
                    <Sparkles className="w-3 h-3" /> Ask Sage
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>

        {/* ── Ask Sage module (upgraded — answer engine) ────────────────────── */}
        <div
          className="w-full mb-7 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(139,92,246,0.03) 100%)',
            border: '1px solid rgba(139,92,246,0.18)',
            boxShadow: sageFocused ? '0 0 0 1px rgba(139,92,246,0.25), 0 0 30px rgba(139,92,246,0.08)' : 'none',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: 'rgba(139,92,246,0.9)' }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'rgba(139,92,246,0.9)' }}>
                Ask Sage
              </div>
              <div className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.45)' }}>
                Ask anything — get a direct answer
              </div>
            </div>
            <div className="ml-auto text-[8px] font-mono uppercase tracking-widest px-2 py-1 rounded"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(139,92,246,0.65)' }}>
              AI · Gemini
            </div>
          </div>

          {/* Primary Sage input — big and clear */}
          <form onSubmit={handleSageSubmit} className="px-4 pt-3 pb-3">
            <div
              className="flex items-center rounded-xl overflow-hidden"
              style={{
                background: sageFocused ? 'rgba(0,0,0,0.48)' : 'rgba(0,0,0,0.32)',
                border: `1px solid ${sageFocused ? 'rgba(139,92,246,0.28)' : 'rgba(139,92,246,0.12)'}`,
                boxShadow: sageFocused ? '0 0 0 1px rgba(139,92,246,0.06), 0 0 20px rgba(139,92,246,0.04)' : 'none',
                transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out, background 150ms ease-out',
              }}
            >
              <input
                ref={sageInputRef}
                type="text"
                value={sageInput}
                onChange={e => setSageInput(e.target.value)}
                onFocus={() => setSageFocused(true)}
                onBlur={() => setSageFocused(false)}
                placeholder="How do I make sourdough bread? What is quantum computing?"
                className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-[13px] font-mono text-foreground/75 placeholder:text-muted-foreground/22 caret-primary"
                spellCheck={false}
                autoComplete="off"
              />
              {sageInput.trim() && (
                <button
                  type="submit"
                  className="flex items-center gap-1.5 mx-2 px-3 py-2 rounded-lg text-[10px] font-bold tracking-[0.1em] uppercase cursor-pointer transition-all"
                  style={{
                    background: 'rgba(139,92,246,0.2)',
                    border: '1px solid rgba(139,92,246,0.35)',
                    color: 'rgba(139,92,246,0.95)',
                  }}
                >
                  <Sparkles className="w-3 h-3" /> Answer
                </button>
              )}
            </div>
          </form>

          {/* Starter prompts */}
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            <span className="text-[8px] font-mono uppercase tracking-widest self-center mr-1" style={{ color: 'rgba(148,163,184,0.3)' }}>Try:</span>
            {SAGE_STARTERS.map(starter => (
              <button
                key={starter}
                onClick={() => navigateToSage(starter)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer"
                style={{
                  background: 'rgba(139,92,246,0.06)',
                  border: '1px solid rgba(139,92,246,0.14)',
                  color: 'rgba(139,92,246,0.6)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.14)';
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.28)';
                  e.currentTarget.style.color = 'rgba(139,92,246,0.9)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.14)';
                  e.currentTarget.style.color = 'rgba(139,92,246,0.6)';
                }}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="w-full mb-8">
          <div className="section-label mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction icon={<LinkIcon className="w-4 h-4" />} label="Link Check" desc="Pre-flight URL analysis" onClick={() => setLinkCheckOpen(true)} />
            <QuickAction icon={<BookOpen className="w-4 h-4" />} label="Bookmarks" desc={`${bookmarks.length} saved sources`} onClick={() => navigate('sentrix://bookmarks')} />
            <QuickAction icon={<Layers className="w-4 h-4" />} label="Collections" desc={`${collections.length} collections · ${savedItems.length} saved`} onClick={() => navigate('sentrix://collections')} />
            <QuickAction icon={<Shield className="w-4 h-4" />} label="Privacy Report" desc="Session posture summary" onClick={() => navigate('sentrix://privacy')} />
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
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: RISK_DOT[entry.riskLevel] ?? RISK_DOT.unknown }} />
                  <span className="flex-1 truncate text-[12px] font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>{entry.title}</span>
                  <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(148,163,184,0.22)' }}>{format(entry.visitedAt, 'HH:mm')}</span>
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

        {/* Saved sources */}
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
                  <span className="flex-1 text-[12px] font-mono truncate" style={{ color: 'rgba(148,163,184,0.5)' }}>{bm.title}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="w-full mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.open('https://www.rsrintel.com', '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-2 text-[10px] font-mono transition-colors cursor-pointer"
              style={{ color: 'rgba(148,163,184,0.28)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(200,205,210,0.65)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.28)')}
            >
              <Shield className="w-3 h-3 shrink-0" />
              rsrintel.com — Intelligence Network
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
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
          background: active ? 'hsl(142 72% 38%)' : '#f59e0b', // green stays for BLACKDOG — security indicator
          boxShadow: glow && active ? '0 0 5px rgba(22,163,74,0.8)' : 'none',
        }}
      />
      <span className="text-[9px] font-mono uppercase tracking-widest"
        style={{ color: active ? 'rgba(22,163,74,0.5)' : 'rgba(245,158,11,0.45)' }}>
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
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(0,0,0,0.28)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.055)';
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.45)' }}>
        {icon}
      </div>
      <div>
        <div className="text-[12px] font-medium text-foreground/70">{label}</div>
        <div className="text-[10px] font-mono text-muted-foreground/35 mt-0.5">{desc}</div>
      </div>
    </button>
  );
}
