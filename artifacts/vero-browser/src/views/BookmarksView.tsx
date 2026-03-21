import React, { useState } from 'react';
import {
  BookOpen, Sparkles, Globe, Clock, Trash2, ExternalLink,
  RotateCcw, LockKeyhole, Download, ChevronDown, ChevronRight,
  Star, Check,
} from 'lucide-react';
import { useBrowserState, SageAnalysis, SavedItem, HistoryEntry } from '@/hooks/use-browser-state';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

// ── helpers ────────────────────────────────────────────────────────────────────

function dlTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function postureColor(p?: string) {
  const u = (p ?? '').toUpperCase();
  if (u === 'SAFE')    return '#22c55e';
  if (u === 'CAUTION') return '#f59e0b';
  if (u === 'DANGER')  return '#ef4444';
  return 'rgba(148,163,184,0.35)';
}

function SectionBadge({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="text-[8px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded"
      style={{ background: `${color}12`, border: `1px solid ${color}28`, color }}
    >
      {label}
    </span>
  );
}

// ── Analysis card ──────────────────────────────────────────────────────────────

function AnalysisCard({ a, onOpen, onDelete, onVault }: {
  a: SageAnalysis;
  onOpen: () => void;
  onDelete: () => void;
  onVault: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const exportTxt = () => {
    dlTxt(`sage-${a.id.slice(0, 8)}.txt`, [
      `SENTRIX — SAGE ANALYSIS`,
      `Query: ${a.query}`, `Date: ${format(a.savedAt, 'PPpp')}`, ``,
      `── WHAT MATTERS ──`, a.whatMatters || '—', ``,
      `── WHAT TO QUESTION ──`, a.whatToQuestion || '—', ``,
      `── FULL OUTPUT ──`, a.fullText,
    ].join('\n'));
  };

  return (
    <div
      className="rounded-xl overflow-hidden group"
      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)' }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgba(139,92,246,0.70)' }} />
        <div className="flex-1 min-w-0">
          <button className="text-left w-full" onClick={onOpen}>
            <p
              className="text-[12px] font-mono leading-snug hover:underline decoration-dotted"
              style={{ color: 'rgba(210,210,230,0.88)' }}
            >
              {a.query}
            </p>
          </button>
          <p className="text-[9.5px] font-mono mt-1" style={{ color: 'rgba(148,163,184,0.30)' }}>
            {format(a.savedAt, 'MMM d, yyyy · HH:mm')}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onOpen}
            title="Re-open"
            className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-mono uppercase tracking-[0.10em] transition-all"
            style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)', color: 'rgba(56,189,248,0.70)' }}
          >
            <RotateCcw className="w-2.5 h-2.5" /> Open
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-1.5 rounded"
            style={{ color: 'rgba(239,68,68,0.45)' }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded"
            style={{ color: 'rgba(148,163,184,0.30)' }}
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
        {/* Always-visible expand when not hovering */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1.5 rounded group-hover:hidden"
          style={{ color: 'rgba(148,163,184,0.20)' }}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div
          className="px-4 pb-4 flex flex-col gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {a.whatMatters && (
            <div className="pt-3">
              <p className="text-[8px] font-mono uppercase tracking-[0.18em] mb-1.5" style={{ color: 'rgba(56,189,248,0.50)' }}>What Matters</p>
              <p className="text-[11px] font-mono leading-relaxed" style={{ color: 'rgba(148,163,184,0.65)' }}>
                {a.whatMatters.slice(0, 500)}{a.whatMatters.length > 500 ? '…' : ''}
              </p>
            </div>
          )}
          {a.whatToQuestion && (
            <div>
              <p className="text-[8px] font-mono uppercase tracking-[0.18em] mb-1.5" style={{ color: 'rgba(245,158,11,0.50)' }}>What to Question</p>
              <p className="text-[11px] font-mono leading-relaxed" style={{ color: 'rgba(148,163,184,0.65)' }}>
                {a.whatToQuestion.slice(0, 500)}{a.whatToQuestion.length > 500 ? '…' : ''}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button
              onClick={onOpen}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-[0.12em]"
              style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.20)', color: 'rgba(56,189,248,0.75)' }}
            >
              <RotateCcw className="w-2.5 h-2.5" /> Re-open Analysis
            </button>
            <button
              onClick={exportTxt}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-[0.12em]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(148,163,184,0.55)' }}
            >
              <Download className="w-2.5 h-2.5" /> Export TXT
            </button>
            <button
              onClick={onVault}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-[0.12em]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.38)' }}
            >
              <LockKeyhole className="w-2.5 h-2.5" /> Move to Vault
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-[0.12em] ml-auto"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.16)', color: 'rgba(239,68,68,0.55)' }}
            >
              <Trash2 className="w-2.5 h-2.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Source card ────────────────────────────────────────────────────────────────

function SourceCard({ s, onOpen, onDelete, onVault }: {
  s: SavedItem;
  onOpen: () => void;
  onDelete: () => void;
  onVault: () => void;
}) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl group"
      style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)' }}
    >
      <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: postureColor(s.posture) }} />
      <div className="flex-1 min-w-0">
        <button className="text-left w-full" onClick={onOpen}>
          <p className="text-[12px] font-mono truncate hover:underline decoration-dotted" style={{ color: 'rgba(210,210,230,0.85)' }}>
            {s.title}
          </p>
        </button>
        <p className="text-[9.5px] font-mono mt-0.5" style={{ color: 'rgba(148,163,184,0.30)' }}>
          {s.domain} · {format(s.savedAt, 'MMM d · HH:mm')}
        </p>
        {s.reasoning && (
          <p className="text-[9.5px] font-mono mt-1 leading-relaxed" style={{ color: 'rgba(148,163,184,0.42)' }}>
            {s.reasoning.slice(0, 120)}{s.reasoning.length > 120 ? '…' : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onOpen}
          title="Open source"
          className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-mono uppercase tracking-[0.10em]"
          style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)', color: 'rgba(56,189,248,0.70)' }}
        >
          <ExternalLink className="w-2.5 h-2.5" /> Open
        </button>
        <button onClick={onVault} title="Move to Vault" className="p-1.5 rounded" style={{ color: 'rgba(148,163,184,0.40)' }}>
          <LockKeyhole className="w-3 h-3" />
        </button>
        <button onClick={onDelete} title="Delete" className="p-1.5 rounded" style={{ color: 'rgba(239,68,68,0.45)' }}>
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Session card ───────────────────────────────────────────────────────────────

function SessionCard({ entry, onOpen, onDelete }: {
  entry: HistoryEntry & { searchQuery: string };
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl group"
      style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.14)' }}
    >
      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(148,163,184,0.28)' }} />
      <button className="flex-1 min-w-0 text-left" onClick={onOpen}>
        <p className="text-[11.5px] font-mono truncate hover:underline decoration-dotted" style={{ color: 'rgba(148,163,184,0.65)' }}>
          {entry.searchQuery}
        </p>
        <p className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(148,163,184,0.25)' }}>
          {format(entry.visitedAt, 'MMM d, yyyy · HH:mm')}
        </p>
      </button>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onOpen}
          title="Re-run search"
          className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-mono uppercase tracking-[0.10em]"
          style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)', color: 'rgba(56,189,248,0.70)' }}
        >
          <RotateCcw className="w-2.5 h-2.5" /> Restore
        </button>
        <button onClick={onDelete} title="Remove" className="p-1.5 rounded" style={{ color: 'rgba(239,68,68,0.45)' }}>
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: 'analyses' | 'sources' | 'sessions' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {tab === 'analyses' ? <Sparkles className="w-5 h-5" style={{ color: 'rgba(139,92,246,0.25)' }} />
         : tab === 'sources' ? <Globe className="w-5 h-5 text-muted-foreground/20" />
         : <Clock className="w-5 h-5 text-muted-foreground/20" />}
      </div>
      <div>
        <p className="text-[13px] font-mono" style={{ color: 'rgba(148,163,184,0.40)' }}>
          {tab === 'analyses' ? 'No saved analyses' : tab === 'sources' ? 'No saved sources' : 'No recent sessions'}
        </p>
        <p className="text-[10.5px] font-mono mt-1.5 max-w-[260px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.24)' }}>
          {tab === 'analyses'
            ? 'Save SAGE analyses using "Save Analysis" after running a query.'
            : tab === 'sources'
            ? 'Save sources from search results using the bookmark icon on each result card.'
            : 'Recent search sessions will appear here automatically.'}
        </p>
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

export function BookmarksView() {
  const {
    sageAnalyses, savedItems, history,
    deleteSageAnalysis, unsaveItem, removeHistoryEntry,
    moveToVault, navigateToSage, navigate,
  } = useBrowserState();

  const [tab, setTab]   = useState<'analyses' | 'sources' | 'sessions'>('analyses');
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  const showToast = (msg: string, color = '#38BDF8') => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 1600);
  };

  const sessionEntries = history
    .filter(h => h.url.startsWith('sentrix://search?') || h.url.includes('?q='))
    .slice(0, 60)
    .map(h => ({
      ...h,
      searchQuery: h.title || decodeURIComponent(h.url.replace(/^.*\?q=/, '').replace(/\+/g, ' ')),
    }));

  const handleOpenAnalysis = (a: SageAnalysis) => {
    navigateToSage(a.query);
    showToast('Analysis restored');
    console.log('[Sentrix] Analysis opened from bookmarks:', a.id, a.query);
  };

  const handleDeleteAnalysis = (id: string) => {
    deleteSageAnalysis(id);
    showToast('Removed', '#ef4444');
    console.log('[Sentrix] Analysis deleted from bookmarks:', id);
  };

  const handleOpenSource = (s: SavedItem) => {
    navigate(s.url);
    console.log('[Sentrix] Source opened from bookmarks:', s.url);
  };

  const handleDeleteSource = (id: string) => {
    unsaveItem(id);
    showToast('Removed', '#ef4444');
    console.log('[Sentrix] Source deleted from bookmarks:', id);
  };

  const handleOpenSession = (sq: string) => {
    navigateToSage(sq);
    showToast('Session loaded');
    console.log('[Sentrix] Session restored from bookmarks:', sq);
  };

  const handleDeleteSession = (id: string) => {
    removeHistoryEntry(id);
    showToast('Removed', '#ef4444');
    console.log('[Sentrix] Session removed from bookmarks:', id);
  };

  const handleVault = (type: 'analysis' | 'source', originalId: string, title: string, summary: string) => {
    moveToVault(type, originalId, title, summary);
    showToast('Moved to Vault', '#22c55e');
    console.log('[Sentrix] Moved to vault from bookmarks:', type, originalId);
  };

  const counts = {
    analyses: sageAnalyses.length,
    sources:  savedItems.length,
    sessions: sessionEntries.length,
  };

  const totalCount = counts.analyses + counts.sources + counts.sessions;

  const TAB_LABELS = {
    analyses: 'Analyses',
    sources:  'Sources',
    sessions: 'Sessions',
  } as const;

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'rgba(5,5,9,0.98)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.25)' }}
      >
        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: 'rgba(148,163,184,0.35)' }}>
            sentrix://bookmarks
          </div>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'rgba(210,215,230,0.85)' }}>
            <BookOpen className="w-4 h-4" style={{ color: '#38BDF8' }} />
            Saved Intelligence
          </h2>
        </div>
        <div className="text-[9.5px] font-mono" style={{ color: 'rgba(148,163,184,0.28)' }}>
          {totalCount} item{totalCount !== 1 ? 's' : ''} saved
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex shrink-0 px-6 gap-1 pt-3 pb-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {(['analyses', 'sources', 'sessions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] transition-all rounded-t-lg"
            style={{
              color: tab === t ? 'rgba(56,189,248,0.85)' : 'rgba(148,163,184,0.38)',
              borderBottom: `2px solid ${tab === t ? '#38BDF8' : 'transparent'}`,
              background: tab === t ? 'rgba(56,189,248,0.04)' : 'transparent',
            }}
          >
            {tab === t && t === 'analyses' && <Sparkles className="w-2.5 h-2.5" />}
            {tab === t && t === 'sources'  && <Globe    className="w-2.5 h-2.5" />}
            {tab === t && t === 'sessions' && <Clock    className="w-2.5 h-2.5" />}
            {TAB_LABELS[t]}
            {counts[t] > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[7.5px]"
                style={{
                  background: tab === t ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.06)',
                  color: tab === t ? 'rgba(56,189,248,0.80)' : 'rgba(148,163,184,0.40)',
                }}
              >
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="bm-toast"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mx-6 mt-3 px-3 py-1.5 rounded-lg text-[9.5px] font-mono flex items-center gap-2"
            style={{ background: `${toast.color}0d`, border: `1px solid ${toast.color}30`, color: toast.color, maxWidth: '400px' }}
          >
            <Check className="w-3 h-3" />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="px-6 py-4 max-w-2xl flex flex-col gap-2.5">
        {tab === 'analyses' && (
          sageAnalyses.length === 0 ? <EmptyState tab="analyses" /> :
          sageAnalyses.map(a => (
            <AnalysisCard
              key={a.id}
              a={a}
              onOpen={() => handleOpenAnalysis(a)}
              onDelete={() => handleDeleteAnalysis(a.id)}
              onVault={() => handleVault('analysis', a.id, a.query, a.whatMatters?.slice(0, 80) ?? '')}
            />
          ))
        )}

        {tab === 'sources' && (
          savedItems.length === 0 ? <EmptyState tab="sources" /> :
          savedItems.map(s => (
            <SourceCard
              key={s.id}
              s={s}
              onOpen={() => handleOpenSource(s)}
              onDelete={() => handleDeleteSource(s.id)}
              onVault={() => handleVault('source', s.id, s.title, s.domain)}
            />
          ))
        )}

        {tab === 'sessions' && (
          sessionEntries.length === 0 ? <EmptyState tab="sessions" /> :
          sessionEntries.map(e => (
            <SessionCard
              key={e.id}
              entry={e}
              onOpen={() => handleOpenSession(e.searchQuery)}
              onDelete={() => handleDeleteSession(e.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
