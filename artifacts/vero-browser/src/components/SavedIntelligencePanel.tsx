import React, { useState } from 'react';
import {
  BookOpen, X, Sparkles, Globe, Clock, Download, ChevronDown, ChevronRight,
  Star, Trash2, LockKeyhole, ExternalLink, RotateCcw, Check,
} from 'lucide-react';
import { useBrowserState, SageAnalysis, SavedItem, HistoryEntry } from '@/hooks/use-browser-state';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

// ── helpers ───────────────────────────────────────────────────────────────────

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function postureColor(p?: string) {
  const u = (p ?? '').toUpperCase();
  if (u === 'SAFE')    return '#22c55e';
  if (u === 'CAUTION') return '#f59e0b';
  if (u === 'DANGER')  return '#ef4444';
  return 'rgba(148,163,184,0.4)';
}

function useFlash(dur = 1200) {
  const [on, setOn] = useState(false);
  const trigger = () => { setOn(true); setTimeout(() => setOn(false), dur); };
  return { on, trigger };
}

// ── Micro-toast ────────────────────────────────────────────────────────────────

function MicroToast({ msg, color }: { msg: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="mx-3 mt-2 px-3 py-1.5 rounded-lg text-[9.5px] font-mono flex items-center gap-2 shrink-0"
      style={{ background: `${color}0d`, border: `1px solid ${color}30`, color }}
    >
      <Check className="w-3 h-3" />
      {msg}
    </motion.div>
  );
}

// ── Analysis row ──────────────────────────────────────────────────────────────

function AnalysisRow({ a, onOpen, onDelete, onVault }: {
  a: SageAnalysis;
  onOpen: () => void;
  onDelete: () => void;
  onVault: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const SAGE_COLOR = 'rgba(139,92,246,0.75)';

  const downloadTxt = () => {
    const txt = [
      `SENTRIX — SAGE ANALYSIS`,
      `Query: ${a.query}`,
      `Date:  ${format(a.savedAt, 'PPpp')}`,
      ``,
      `── WHAT MATTERS ──`,  a.whatMatters || '—', ``,
      `── WHAT TO QUESTION ──`, a.whatToQuestion || '—', ``,
      `── SOURCES ──`, a.sources || '—', ``,
      `── FULL OUTPUT ──`, a.fullText,
    ].join('\n');
    downloadText(`sage-analysis-${a.id.slice(0, 8)}.txt`, txt, 'text/plain');
  };

  return (
    <div
      className="rounded-lg overflow-hidden group/row"
      style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.14)' }}
    >
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <Sparkles className="w-3 h-3 mt-0.5 shrink-0" style={{ color: SAGE_COLOR }} />
        <button
          className="flex-1 min-w-0 text-left"
          onClick={onOpen}
          title="Open analysis"
        >
          <p className="text-[11px] font-mono truncate hover:underline decoration-dotted" style={{ color: 'rgba(210,210,230,0.85)' }}>{a.query}</p>
          <p className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(148,163,184,0.32)' }}>
            {format(a.savedAt, 'MMM d · HH:mm')}
          </p>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpen}
            title="Re-open analysis"
            className="p-1 rounded opacity-0 group-hover/row:opacity-100 transition-opacity"
            style={{ color: 'rgba(56,189,248,0.50)' }}
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-1 rounded opacity-0 group-hover/row:opacity-100 transition-opacity"
            style={{ color: 'rgba(239,68,68,0.45)' }}
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 rounded"
            style={{ color: 'rgba(148,163,184,0.25)' }}
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {a.whatMatters && (
            <div className="pt-2">
              <p className="text-[8px] font-mono uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(56,189,248,0.45)' }}>What Matters</p>
              <p className="text-[10.5px] font-mono leading-relaxed" style={{ color: 'rgba(148,163,184,0.60)' }}>
                {a.whatMatters.slice(0, 350)}{a.whatMatters.length > 350 ? '…' : ''}
              </p>
            </div>
          )}
          {a.whatToQuestion && (
            <div>
              <p className="text-[8px] font-mono uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(245,158,11,0.45)' }}>What to Question</p>
              <p className="text-[10.5px] font-mono leading-relaxed" style={{ color: 'rgba(148,163,184,0.60)' }}>
                {a.whatToQuestion.slice(0, 350)}{a.whatToQuestion.length > 350 ? '…' : ''}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={onOpen}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-mono uppercase tracking-[0.12em]"
              style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.16)', color: 'rgba(56,189,248,0.65)' }}
            >
              <RotateCcw className="w-2.5 h-2.5" /> Open
            </button>
            <button
              onClick={downloadTxt}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-mono uppercase tracking-[0.12em]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.50)' }}
            >
              <Download className="w-2.5 h-2.5" /> Export TXT
            </button>
            <button
              onClick={onVault}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-mono uppercase tracking-[0.12em]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.35)' }}
            >
              <LockKeyhole className="w-2.5 h-2.5" /> Move to Vault
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-mono uppercase tracking-[0.12em] ml-auto"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)', color: 'rgba(239,68,68,0.50)' }}
            >
              <Trash2 className="w-2.5 h-2.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Source row ────────────────────────────────────────────────────────────────

function SourceRow({ s, onOpen, onDelete, onVault }: {
  s: SavedItem;
  onOpen: () => void;
  onDelete: () => void;
  onVault: () => void;
}) {
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg group/row"
      style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.14)' }}
    >
      <Globe className="w-3 h-3 mt-0.5 shrink-0" style={{ color: postureColor(s.posture) }} />
      <button className="flex-1 min-w-0 text-left" onClick={onOpen} title="Open source">
        <p className="text-[11px] font-mono truncate hover:underline decoration-dotted" style={{ color: 'rgba(210,210,230,0.80)' }}>{s.title}</p>
        <p className="text-[9px] font-mono truncate mt-0.5" style={{ color: 'rgba(148,163,184,0.32)' }}>{s.domain}</p>
      </button>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
        <button onClick={onOpen} title="Open URL" className="p-1 rounded" style={{ color: 'rgba(56,189,248,0.50)' }}>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
        <button onClick={onVault} title="Move to Vault" className="p-1 rounded" style={{ color: 'rgba(148,163,184,0.40)' }}>
          <LockKeyhole className="w-2.5 h-2.5" />
        </button>
        <button onClick={onDelete} title="Delete" className="p-1 rounded" style={{ color: 'rgba(239,68,68,0.45)' }}>
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ entry, onOpen, onDelete }: {
  entry: HistoryEntry & { searchQuery: string };
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg group/row"
      style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.12)' }}
    >
      <Clock className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.28)' }} />
      <button className="flex-1 min-w-0 text-left" onClick={onOpen} title="Re-run search">
        <p className="text-[10.5px] font-mono truncate hover:underline decoration-dotted" style={{ color: 'rgba(148,163,184,0.60)' }}>
          {entry.searchQuery}
        </p>
      </button>
      <p className="text-[8.5px] font-mono shrink-0" style={{ color: 'rgba(148,163,184,0.25)' }}>
        {format(entry.visitedAt, 'HH:mm')}
      </p>
      <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
        <button onClick={onOpen} title="Re-run" className="p-1 rounded" style={{ color: 'rgba(56,189,248,0.50)' }}>
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
        <button onClick={onDelete} title="Remove" className="p-1 rounded" style={{ color: 'rgba(239,68,68,0.45)' }}>
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function SavedIntelligencePanel() {
  const {
    savedIntelPanelOpen, setSavedIntelPanelOpen,
    sageAnalyses, savedItems, history,
    deleteSageAnalysis, unsaveItem, removeHistoryEntry,
    moveToVault, navigateToSage, navigate,
  } = useBrowserState();

  const [tab, setTab] = useState<'analyses' | 'sources' | 'sessions'>('analyses');
  const [toast, setToast]   = useState<{ msg: string; color: string } | null>(null);

  const showToast = (msg: string, color = '#38BDF8') => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 1600);
  };

  const sessionEntries = history
    .filter(h => h.url.startsWith('sentrix://search?') || h.url.includes('?q='))
    .slice(0, 40)
    .map(h => ({
      ...h,
      searchQuery: h.title || decodeURIComponent(h.url.replace(/^.*\?q=/, '').replace(/\+/g, ' ')),
    }));

  const isEmpty = tab === 'analyses' ? sageAnalyses.length === 0
    : tab === 'sources'   ? savedItems.length === 0
    : sessionEntries.length === 0;

  const handleOpenAnalysis = (a: SageAnalysis) => {
    navigateToSage(a.query);
    setSavedIntelPanelOpen(false);
    showToast('Restored');
    console.log('[Sentrix] Analysis opened:', a.id, a.query);
  };

  const handleDeleteAnalysis = (id: string) => {
    deleteSageAnalysis(id);
    showToast('Removed', '#ef4444');
    console.log('[Sentrix] Analysis deleted from panel:', id);
  };

  const handleOpenSource = (s: SavedItem) => {
    navigate(s.url);
    setSavedIntelPanelOpen(false);
    showToast('Opened');
    console.log('[Sentrix] Source opened:', s.url);
  };

  const handleDeleteSource = (id: string) => {
    unsaveItem(id);
    showToast('Removed', '#ef4444');
    console.log('[Sentrix] Source deleted:', id);
  };

  const handleOpenSession = (sq: string) => {
    navigateToSage(sq);
    setSavedIntelPanelOpen(false);
    showToast('Session loaded');
    console.log('[Sentrix] Session restored:', sq);
  };

  const handleDeleteSession = (id: string) => {
    removeHistoryEntry(id);
    showToast('Removed', '#ef4444');
    console.log('[Sentrix] Session removed:', id);
  };

  const handleVault = (type: 'analysis' | 'source', originalId: string, title: string, summary: string) => {
    moveToVault(type, originalId, title, summary);
    showToast('Moved to Vault', '#22c55e');
    console.log('[Sentrix] Moved to vault:', type, originalId);
  };

  return (
    <AnimatePresence>
      {savedIntelPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="saved-intel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40"
            onClick={() => setSavedIntelPanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            key="saved-intel-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
            style={{
              width: '340px',
              background: 'linear-gradient(180deg, rgba(8,8,14,0.98) 0%, rgba(5,5,10,0.99) 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.55)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" style={{ color: '#38BDF8' }} />
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] font-bold" style={{ color: 'rgba(56,189,248,0.85)' }}>
                  Saved Intelligence
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { navigate('sentrix://vault'); setSavedIntelPanelOpen(false); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[8.5px] font-mono uppercase tracking-[0.12em]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.45)' }}
                >
                  <LockKeyhole className="w-2.5 h-2.5" /> Vault
                </button>
                <button
                  onClick={() => setSavedIntelPanelOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded"
                  style={{ color: 'rgba(148,163,184,0.35)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {(['analyses', 'sources', 'sessions'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-2.5 text-[8.5px] font-mono uppercase tracking-[0.15em] transition-all"
                  style={{
                    color: tab === t ? 'rgba(56,189,248,0.80)' : 'rgba(148,163,184,0.35)',
                    borderBottom: `2px solid ${tab === t ? 'rgba(56,189,248,0.40)' : 'transparent'}`,
                    background: tab === t ? 'rgba(56,189,248,0.04)' : 'transparent',
                  }}
                >
                  {t === 'analyses' ? `Analyses${sageAnalyses.length ? ` (${sageAnalyses.length})` : ''}`
                   : t === 'sources' ? `Sources${savedItems.length ? ` (${savedItems.length})` : ''}`
                   : `Sessions${sessionEntries.length ? ` (${sessionEntries.length})` : ''}`}
                </button>
              ))}
            </div>

            {/* Toast */}
            <AnimatePresence>
              {toast && <MicroToast key="toast" msg={toast.msg} color={toast.color} />}
            </AnimatePresence>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-12">
                  <Star className="w-6 h-6" style={{ color: 'rgba(148,163,184,0.15)' }} />
                  <p className="text-[11px] font-mono" style={{ color: 'rgba(148,163,184,0.35)' }}>No saved items yet</p>
                  <p className="text-[9.5px] font-mono leading-relaxed max-w-[220px]" style={{ color: 'rgba(148,163,184,0.22)' }}>
                    {tab === 'analyses'
                      ? 'Save SAGE analyses to access them here.'
                      : tab === 'sources'
                      ? 'Save sources from search results to access them here.'
                      : 'Your recent search sessions will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tab === 'analyses' && sageAnalyses.map(a => (
                    <AnalysisRow
                      key={a.id}
                      a={a}
                      onOpen={() => handleOpenAnalysis(a)}
                      onDelete={() => handleDeleteAnalysis(a.id)}
                      onVault={() => handleVault('analysis', a.id, a.query, a.whatMatters?.slice(0, 80) ?? '')}
                    />
                  ))}
                  {tab === 'sources' && savedItems.map(s => (
                    <SourceRow
                      key={s.id}
                      s={s}
                      onOpen={() => handleOpenSource(s)}
                      onDelete={() => handleDeleteSource(s.id)}
                      onVault={() => handleVault('source', s.id, s.title, s.domain)}
                    />
                  ))}
                  {tab === 'sessions' && sessionEntries.map(e => (
                    <SessionRow
                      key={e.id}
                      entry={e}
                      onOpen={() => handleOpenSession(e.searchQuery)}
                      onDelete={() => handleDeleteSession(e.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
