import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Link as LinkIcon, BookOpen,
  Layers, Clock, ExternalLink, ArrowRight, Flame,
  ScanSearch,
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { format } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import { LinkCheckModal } from '@/components/LinkCheckModal';

const RISK_DOT: Record<string, string> = {
  safe:    '#38BDF8',
  caution: '#f59e0b',
  danger:  '#ef4444',
  unknown: 'rgba(148,163,184,0.25)',
};

const EXAMPLES = [
  'Analyze this claim',
  'Break this down for me',
  'What should I question here?',
];

export function HomeView() {
  const {
    navigate, navigateToSage,
    history, bookmarks, savedItems, collections,
    blackdogStatus, burnSession, settings,
  } = useBrowserState();

  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [linkCheckOpen, setLinkCheckOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) navigateToSage(input.trim());
  };

  const bdConnected = blackdogStatus === 'connected';
  const recentItems = history.filter(h => h.riskLevel !== undefined).slice(0, 4);
  const recentBookmarks = bookmarks.slice(0, 4);

  return (
    <div className="h-full overflow-y-auto bg-background flex flex-col">

      {/* ── Status strip ───────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-6 px-6 py-1.5 shrink-0 overflow-x-auto"
        style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <StatusPip active={bdConnected} label={bdConnected ? 'PROTECTION ACTIVE' : 'CONNECTING'} glow={bdConnected} />
        <div className="w-px h-3 bg-white/[0.08] shrink-0" />
        <StatusItem label="Saved" value={savedItems.length} />
        <StatusItem label="Collections" value={collections.length} />
        <StatusItem label="Bookmarks" value={bookmarks.length} />
        <StatusItem label="Analyses" value={history.length} />
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

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-10 max-w-2xl mx-auto w-full">

        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.18)',
                boxShadow: '0 0 20px rgba(56,189,248,0.06)',
              }}
            >
              <Shield className="w-5 h-5" style={{ color: 'rgba(56,189,248,0.70)' }} />
            </div>
            <span
              className="text-[28px] font-bold tracking-[0.2em] uppercase"
              style={{ color: '#38BDF8', fontFamily: "'JetBrains Mono', monospace" }}
            >
              SENTRIX
            </span>
          </div>

          <h1
            className="text-[22px] font-bold leading-tight mb-3"
            style={{ color: 'rgba(240,240,248,0.92)' }}
          >
            Analyze before you believe.
          </h1>
          <p
            className="text-[12px] font-mono leading-relaxed max-w-sm"
            style={{ color: 'rgba(148,163,184,0.45)' }}
          >
            Sentrix breaks down claims, headlines, and sources<br />into signal, risk, and truth.
          </p>
        </div>

        {/* ── ANALYSIS INPUT ─────────────────────────────────────────────────── */}
        <div className="w-full mb-6">
          {/* Label */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-px h-3 rounded-full" style={{ background: 'rgba(56,189,248,0.5)' }} />
            <span
              className="text-[8px] font-mono uppercase tracking-[0.28em]"
              style={{ color: 'rgba(56,189,248,0.55)' }}
            >
              Analyze Input
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: focused ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.42)',
                border: `1px solid ${focused ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: focused
                  ? '0 0 0 1px rgba(56,189,248,0.10), 0 0 40px rgba(56,189,248,0.07)'
                  : 'none',
                transition: 'border-color 180ms ease-out, box-shadow 180ms ease-out, background 180ms ease-out',
              }}
            >
              <div className="flex items-start">
                <div className="pl-4 pt-4 pr-2 shrink-0">
                  <ScanSearch
                    className="w-4 h-4 transition-colors duration-200"
                    style={{ color: focused ? 'rgba(56,189,248,0.65)' : 'rgba(148,163,184,0.25)' }}
                  />
                </div>
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (input.trim()) navigateToSage(input.trim()); }
                  }}
                  placeholder="Paste a claim, headline, URL, or question"
                  rows={3}
                  className="flex-1 bg-transparent border-none outline-none px-3 py-4 text-[13.5px] font-mono text-foreground/80 placeholder:text-muted-foreground/22 caret-primary resize-none leading-relaxed"
                  spellCheck={false}
                  autoComplete="off"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>

              {/* Action row */}
              <div
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="text-[9px] font-mono" style={{ color: 'rgba(148,163,184,0.22)' }}>
                  Enter to analyze · Shift+Enter for new line
                </span>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold tracking-[0.14em] uppercase transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: input.trim() ? 'rgba(56,189,248,0.14)' : 'transparent',
                    border: `1px solid ${input.trim() ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    color: input.trim() ? '#38BDF8' : 'rgba(148,163,184,0.3)',
                  }}
                >
                  Analyze
                </button>
              </div>
            </div>
          </form>

          {/* Example prompts */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-[8px] font-mono uppercase tracking-widest self-center" style={{ color: 'rgba(148,163,184,0.25)' }}>Examples:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => navigateToSage(ex)}
                className="px-2.5 py-1 rounded-md text-[10px] font-mono transition-all cursor-pointer"
                style={{
                  background: 'rgba(56,189,248,0.04)',
                  border: '1px solid rgba(56,189,248,0.10)',
                  color: 'rgba(56,189,248,0.45)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(56,189,248,0.09)';
                  e.currentTarget.style.borderColor = 'rgba(56,189,248,0.22)';
                  e.currentTarget.style.color = 'rgba(56,189,248,0.80)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(56,189,248,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(56,189,248,0.10)';
                  e.currentTarget.style.color = 'rgba(56,189,248,0.45)';
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* ── Quick Actions ───────────────────────────────────────────────────── */}
        <div className="w-full mb-8">
          <div className="section-label mb-3">Tools</div>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction icon={<LinkIcon className="w-4 h-4" />} label="Link Check" desc="Pre-flight URL analysis" onClick={() => setLinkCheckOpen(true)} />
            <QuickAction icon={<BookOpen className="w-4 h-4" />} label="Bookmarks" desc={`${bookmarks.length} saved sources`} onClick={() => navigate('sentrix://bookmarks')} />
            <QuickAction icon={<Layers className="w-4 h-4" />} label="Collections" desc={`${collections.length} collections · ${savedItems.length} saved`} onClick={() => navigate('sentrix://collections')} />
            <QuickAction icon={<Shield className="w-4 h-4" />} label="Privacy Report" desc="Session posture summary" onClick={() => navigate('sentrix://privacy')} />
          </div>
        </div>

        {/* ── Recent analyses ──────────────────────────────────────────────────── */}
        {recentItems.length > 0 && (
          <div className="w-full mb-6">
            <div className="section-label mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Recent
            </div>
            <div className="flex flex-col gap-px">
              {recentItems.map(entry => (
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

        {/* ── Saved sources ───────────────────────────────────────────────────── */}
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

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
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
          background: active ? '#38BDF8' : '#f59e0b',
          boxShadow: glow && active ? '0 0 5px rgba(56,189,248,0.75)' : 'none',
        }}
      />
      <span className="text-[9px] font-mono uppercase tracking-widest"
        style={{ color: active ? 'rgba(56,189,248,0.55)' : 'rgba(245,158,11,0.45)' }}>
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
