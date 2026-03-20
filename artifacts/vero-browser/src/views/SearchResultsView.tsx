import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, Shield, AlertTriangle,
  ExternalLink, Bookmark, BookmarkCheck, FolderPlus, Check,
  Loader2, AlertCircle, ArrowUpRight, Plus,
  ChevronDown, ChevronUp, Zap, GitMerge, Sparkles, TrendingUp,
  Send, X, RotateCcw, Lock,
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { searchWeb, SearchResultItem } from '@/lib/search';
import { enrichUrl, postureColor, sourceTypeIcon, Posture, SourceType } from '@/lib/enrichment';
import { InspectDrawer } from '@/components/InspectDrawer';
import { analyzeResults, IntelligenceReport, SignalTier } from '@/lib/intelligence';
import { streamSageQuery, SageMessage, SageResult } from '@/lib/sage-client';
import { apiUrl } from '@/lib/api-client';

type FilterKey = 'all' | 'safe' | 'caution' | 'docs' | 'news' | 'strict';

interface EnrichedItem extends SearchResultItem {
  posture: Posture;
  sourceType: SourceType;
  reasoning: string;
}

function enrichResult(r: SearchResultItem): EnrichedItem {
  const e = enrichUrl(r.url, r.title, r.snippet);
  return { ...r, posture: e.posture, sourceType: e.sourceType, reasoning: e.reasoning };
}

// ── Posture badges ─────────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const styles = {
    high:   { color: 'rgba(22,163,74,0.75)',  border: 'rgba(22,163,74,0.25)',  bg: 'rgba(22,163,74,0.06)',  label: 'HIGH' },
    medium: { color: 'rgba(245,158,11,0.70)', border: 'rgba(245,158,11,0.22)', bg: 'rgba(245,158,11,0.05)', label: 'MED'  },
    low:    { color: 'rgba(148,163,184,0.45)', border: 'rgba(255,255,255,0.08)', bg: 'transparent',          label: 'LOW'  },
  }[level];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.15em] uppercase shrink-0 border"
      style={{ color: styles.color, borderColor: styles.border, background: styles.bg }}
    >
      {styles.label}
    </span>
  );
}

function PostureBadge({ posture }: { posture: Posture }) {
  const c = postureColor(posture);
  const Icon =
    posture === 'SAFE'    ? ShieldCheck :
    posture === 'DANGER'  ? ShieldAlert :
    posture === 'CAUTION' ? AlertTriangle : Shield;
  return (
    <span className={twMerge('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-[0.12em] uppercase shrink-0', c.text, c.border, c.bg)}>
      <Icon className="w-2.5 h-2.5" />
      {posture}
    </span>
  );
}

function SourceTypePill({ type }: { type: SourceType }) {
  const icon = sourceTypeIcon(type);
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/[0.07] bg-white/[0.03] text-[9px] font-mono text-muted-foreground/45 uppercase tracking-wider shrink-0">
      <span className="text-[8px]">{icon}</span>
      {type}
    </span>
  );
}

// ── Signal tier badge ─────────────────────────────────────────────────────────

function SignalTierBadge({ tier }: { tier: SignalTier }) {
  if (tier === 'primary') return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.15em] uppercase shrink-0 border"
      style={{ color: 'hsl(142 72% 50%)', borderColor: 'rgba(22,163,74,0.35)', background: 'rgba(22,163,74,0.1)' }}
    >
      <Zap className="w-2 h-2" />
      Start here
    </span>
  );
  if (tier === 'high') return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.15em] uppercase shrink-0 border"
      style={{ color: 'rgba(22,163,74,0.6)', borderColor: 'rgba(22,163,74,0.18)', background: 'transparent' }}
    >
      High signal
    </span>
  );
  if (tier === 'low') return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.12em] uppercase shrink-0 border"
      style={{ color: 'rgba(148,163,184,0.38)', borderColor: 'rgba(255,255,255,0.06)', background: 'transparent' }}
    >
      Low signal
    </span>
  );
  if (tier === 'noise') return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.12em] uppercase shrink-0 border"
      style={{ color: 'rgba(245,158,11,0.55)', borderColor: 'rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.04)' }}
    >
      Review carefully
    </span>
  );
  return null;
}

function CompareBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.12em] uppercase shrink-0 border"
      style={{ color: 'rgba(139,92,246,0.65)', borderColor: 'rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.05)' }}
    >
      <GitMerge className="w-2 h-2" />
      Compare
    </span>
  );
}

// ── Flash feedback hook ────────────────────────────────────────────────────────
function useFlash(duration = 1200) {
  const [flashing, setFlashing] = useState(false);
  const trigger = () => { setFlashing(true); setTimeout(() => setFlashing(false), duration); };
  return { flashing, trigger };
}

// ── Per-card collection picker ─────────────────────────────────────────────────
function CollectionPicker({
  onAdd, onCreateAndAdd, collections, open, onClose,
}: {
  open: boolean;
  onClose: () => void;
  collections: Array<{ id: string; name: string; color: string; itemCount: number }>;
  onAdd: (colId: string) => void;
  onCreateAndAdd: (name: string) => void;
}) {
  const [newMode, setNewMode] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setNewMode(false); setNewName(''); return; }
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 right-0 w-48 rounded-xl overflow-hidden shadow-2xl z-30"
      style={{ background: 'rgba(8,9,13,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 pt-2.5 pb-1">
        <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/35 mb-1.5">Add to Collection</div>
      </div>
      {collections.map(col => (
        <button
          key={col.id}
          onClick={() => { onAdd(col.id); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] transition-colors text-left"
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
          <span className="text-[11px] font-mono text-foreground/65 flex-1 truncate">{col.name}</span>
          <span className="text-[10px] font-mono text-muted-foreground/30">{col.itemCount}</span>
        </button>
      ))}
      <div className="border-t border-white/[0.06]">
        {newMode ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newName.trim()) { onCreateAndAdd(newName.trim()); onClose(); }
                if (e.key === 'Escape') setNewMode(false);
              }}
              placeholder="Collection name…"
              className="flex-1 bg-transparent text-[11px] font-mono text-foreground/70 outline-none placeholder:text-muted-foreground/25"
            />
            <button
              onClick={() => { if (newName.trim()) { onCreateAndAdd(newName.trim()); onClose(); } }}
              className="text-primary/70 hover:text-primary transition-colors"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNewMode(true)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors"
          >
            <Plus className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-[11px] font-mono text-muted-foreground/40">New collection…</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Intelligence Brief (collapsible) ──────────────────────────────────────────

function IntelligenceBrief({
  report, expanded, onToggle, sageOpen, onToggleSage,
}: {
  report: IntelligenceReport;
  expanded: boolean;
  onToggle: () => void;
  sageOpen: boolean;
  onToggleSage: () => void;
}) {
  const signalColor =
    report.signalLevel === 'strong'   ? 'hsl(142 72% 42%)'  :
    report.signalLevel === 'moderate' ? '#f59e0b'           : 'rgba(148,163,184,0.5)';

  const agreementLabel =
    report.agreement === 'divergent' ? 'Sources diverge' :
    report.agreement === 'mixed'     ? 'Mixed sourcing'   :
    'Sources consistent';

  const agreementColor =
    report.agreement === 'divergent' ? 'rgba(245,158,11,0.65)' :
    report.agreement === 'mixed'     ? 'rgba(245,158,11,0.45)' :
    'hsl(142 72% 40%)';

  const recencyLabel =
    report.recencyProfile === 'recent' ? 'Recent reporting' :
    report.recencyProfile === 'mixed'  ? 'Some recency signals' :
    'Reference material';

  return (
    <div className="shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(4,5,8,0.6)' }}>
      {/* Always-visible strip */}
      <div className="px-5 py-2.5 flex items-center gap-3 flex-wrap">
        <TrendingUp className="w-3 h-3 shrink-0" style={{ color: signalColor }} />
        <span className="text-[10px] font-mono capitalize" style={{ color: signalColor }}>
          {report.signalLevel} signal
        </span>
        <div className="w-px h-3 bg-white/[0.08]" />
        <span className="text-[10px] font-mono" style={{ color: agreementColor }}>{agreementLabel}</span>
        <div className="w-px h-3 bg-white/[0.08]" />
        <span className="text-[10px] font-mono text-muted-foreground/40">{recencyLabel}</span>
        {report.sourceMix && (
          <>
            <div className="w-px h-3 bg-white/[0.08]" />
            <span className="text-[10px] font-mono text-muted-foreground/30">{report.sourceMix}</span>
          </>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Ask Sage toggle */}
          <button
            onClick={onToggleSage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer"
            style={{
              background: sageOpen ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${sageOpen ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
              color: sageOpen ? 'rgba(139,92,246,0.85)' : 'rgba(148,163,184,0.5)',
            }}
          >
            <Sparkles className="w-3 h-3" />
            <span className="text-[9px] font-mono uppercase tracking-[0.15em]">Ask Sage</span>
          </button>

          {/* Expand toggle */}
          <button
            onClick={onToggle}
            className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer"
            style={{ color: 'rgba(148,163,184,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {expanded
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expandable: findings + disagreements */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="px-5 py-3 flex flex-col gap-1.5">
              {report.topFindings.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary/35 mt-[5px] shrink-0" />
                  <span className="text-[10px] font-mono text-muted-foreground/45 leading-relaxed">{f}</span>
                </div>
              ))}
              {report.disagreements.map((d, i) => (
                <div key={`d-${i}`} className="flex items-start gap-2">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-500/40 mt-[2px] shrink-0" />
                  <span className="text-[10px] font-mono leading-relaxed" style={{ color: 'rgba(245,158,11,0.5)' }}>{d}</span>
                </div>
              ))}
              {report.keyEntities.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/25">Recurring:</span>
                  {report.keyEntities.map(e => (
                    <span
                      key={e}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.45)' }}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Ask Sage Chat Panel ────────────────────────────────────────────────────────

function SageChat({
  open, query, results, context, onClose,
}: {
  open: boolean;
  query: string;
  results: SageResult[];
  context: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<SageMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset conversation when query changes
  useEffect(() => {
    setHistory([]);
    setStreaming('');
    setInput('');
    setLoading(false);
  }, [query]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, streaming]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = useCallback(async (msg: string) => {
    if (!msg.trim() || loading) return;
    setInput('');
    const userMsg: SageMessage = { role: 'user', content: msg.trim() };
    setHistory(h => [...h, userMsg]);
    setLoading(true);
    setStreaming('');

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let full = '';
    await streamSageQuery({
      query,
      results,
      context,
      messages: history,
      userMessage: msg.trim(),
      signal: abortRef.current.signal,
      onChunk: (text) => {
        full += text;
        setStreaming(full);
      },
      onDone: () => {
        setHistory(h => [...h, { role: 'assistant', content: full }]);
        setStreaming('');
        setLoading(false);
      },
      onError: (errMsg) => {
        setHistory(h => [...h, { role: 'assistant', content: `⚠ ${errMsg}` }]);
        setStreaming('');
        setLoading(false);
      },
    });
  }, [query, results, context, history, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const clearSession = () => {
    abortRef.current?.abort();
    setHistory([]);
    setStreaming('');
    setLoading(false);
    setInput('');
  };

  if (!open) return null;

  const hasMessages = history.length > 0 || streaming || loading;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="shrink-0 flex flex-col border-b"
      style={{
        maxHeight: '420px',
        borderColor: 'rgba(139,92,246,0.15)',
        background: 'linear-gradient(180deg, rgba(139,92,246,0.04) 0%, rgba(4,5,8,0.8) 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
      >
        <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgba(139,92,246,0.7)' }} />
        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(139,92,246,0.65)' }}>
          SAGE · AI Intelligence Analyst
        </span>
        <span className="text-[8px] font-mono text-muted-foreground/20 ml-1">
          · grounded in search results · gemini-2.5-flash
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {hasMessages && (
            <button
              onClick={clearSession}
              className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono cursor-pointer transition-colors"
              style={{ color: 'rgba(148,163,184,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
              title="Clear conversation"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded cursor-pointer transition-colors"
            style={{ color: 'rgba(148,163,184,0.35)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3" style={{ minHeight: '120px' }}>
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-4">
            <Sparkles className="w-6 h-6 opacity-20" style={{ color: 'rgba(139,92,246,0.6)' }} />
            <p className="text-[11px] font-mono text-center leading-relaxed" style={{ color: 'rgba(148,163,184,0.35)' }}>
              Ask Sage anything about these results.<br />
              Analysis is grounded in the actual results — no invented facts.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {[
                'What are the key signals here?',
                'Which source should I start with?',
                'Are there conflicting claims?',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer transition-all"
                  style={{
                    background: 'rgba(139,92,246,0.06)',
                    border: '1px solid rgba(139,92,246,0.18)',
                    color: 'rgba(139,92,246,0.65)',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div
            key={i}
            className={twMerge('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className="max-w-[85%] rounded-xl px-3 py-2"
              style={msg.role === 'user'
                ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-2.5 h-2.5" style={{ color: 'rgba(139,92,246,0.6)' }} />
                  <span className="text-[8px] font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(139,92,246,0.5)' }}>SAGE</span>
                </div>
              )}
              <p
                className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap"
                style={{ color: msg.role === 'user' ? 'rgba(139,92,246,0.85)' : 'rgba(148,163,184,0.75)' }}
              >
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {streaming && (
          <div className="flex justify-start">
            <div
              className="max-w-[85%] rounded-xl px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-2.5 h-2.5 animate-pulse" style={{ color: 'rgba(139,92,246,0.6)' }} />
                <span className="text-[8px] font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(139,92,246,0.5)' }}>SAGE</span>
              </div>
              <p className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(148,163,184,0.75)' }}>
                {streaming}
                <span className="animate-pulse">▋</span>
              </p>
            </div>
          </div>
        )}

        {loading && !streaming && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'rgba(139,92,246,0.5)' }} />
              <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.4)' }}>Sage is analyzing…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0 px-5 py-3 flex items-center gap-3"
        style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Sage about these results…"
          disabled={loading}
          className="flex-1 bg-transparent text-[11px] font-mono outline-none placeholder:text-muted-foreground/25"
          style={{ color: 'rgba(148,163,184,0.8)' }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all cursor-pointer"
          style={{
            background: input.trim() && !loading ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${input.trim() && !loading ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.06)'}`,
            color: input.trim() && !loading ? 'rgba(139,92,246,0.8)' : 'rgba(148,163,184,0.2)',
          }}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({
  result, index, onInspect, tier, compare,
}: {
  result: EnrichedItem;
  index: number;
  onInspect: () => void;
  tier?: SignalTier;
  compare?: boolean;
}) {
  const {
    isSaved, savedItems,
    addBookmark, isBookmarked, bookmarks, removeBookmark,
    addToCollection, saveItemToCollection, createCollection, collections,
  } = useBrowserState();

  const saved = isSaved(result.url);
  const savedObj = savedItems.find(s => s.url === result.url);
  const bookmarked = isBookmarked(result.url);
  const bookmarkObj = bookmarks.find(b => b.url === result.url);
  const isBlocked = result.posture === 'DANGER';
  const c = postureColor(result.posture);

  const [colPickerOpen, setColPickerOpen] = useState(false);
  const bookmarkFlash = useFlash();
  const collectFlash = useFlash();

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookmarked && bookmarkObj) { removeBookmark(bookmarkObj.id); return; }
    addBookmark({ title: result.title, url: result.url, domain: result.domain });
    bookmarkFlash.trigger();
  };

  const itemPayload = { title: result.title, url: result.url, domain: result.domain, posture: result.posture, sourceType: result.sourceType, reasoning: result.reasoning };

  const handleAddToCollection = (colId: string) => {
    if (saved && savedObj) { addToCollection(savedObj.id, colId); }
    else { saveItemToCollection(itemPayload, colId); }
    collectFlash.trigger(); setColPickerOpen(false);
  };

  const handleCreateAndAddToCollection = (name: string) => {
    const col = createCollection(name);
    if (saved && savedObj) { addToCollection(savedObj.id, col.id); }
    else { saveItemToCollection(itemPayload, col.id); }
    collectFlash.trigger(); setColPickerOpen(false);
  };

  const isPrimary = tier === 'primary';
  const isNoise   = tier === 'noise' || tier === 'low';

  const accentColor =
    isPrimary ? 'hsl(142 72% 44%)' :
    result.posture === 'SAFE'    ? 'hsl(142 72% 40%)' :
    result.posture === 'CAUTION' ? '#f59e0b' :
    result.posture === 'DANGER'  ? '#ef4444' :
    'rgba(148,163,184,0.3)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.18 }}
      className={twMerge(
        'group relative border rounded-xl overflow-visible transition-all duration-150',
        isBlocked ? 'border-red-500/15 bg-black/30' :
        isPrimary  ? 'border-primary/20 bg-black/20 hover:bg-black/28 hover:border-primary/30' :
        isNoise    ? 'border-white/[0.04] bg-black/15 hover:bg-black/22 opacity-80 hover:opacity-100' :
                     'border-white/[0.05] bg-black/20 hover:bg-black/28 hover:border-white/[0.09]'
      )}
      style={isPrimary ? { boxShadow: '0 0 0 1px rgba(22,163,74,0.08), 0 2px 12px rgba(22,163,74,0.04)' } : undefined}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-xl transition-opacity pointer-events-none"
        style={{ background: accentColor, opacity: isPrimary ? 0.6 : 0.35 }} />

      <div className="pl-4 pr-4 pt-4 pb-0 overflow-hidden rounded-xl">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={twMerge('text-[10px] font-mono truncate', c.text)} style={{ opacity: 0.75 }}>
            {result.domain}
          </span>
          <PostureBadge posture={result.posture} />
          <SourceTypePill type={result.sourceType} />
          <ConfidenceBadge level={result.confidence} />
          {tier && tier !== 'normal' && <SignalTierBadge tier={tier} />}
          {compare && !isPrimary && <CompareBadge />}
          {result.provider === 'brave' && (
            <span className="text-[8px] font-mono text-muted-foreground/20 uppercase tracking-widest">live</span>
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); if (!isBlocked) onInspect(); }}
          className={twMerge(
            'text-left w-full text-[13px] font-semibold leading-snug mb-2 block transition-colors',
            isBlocked ? 'text-red-400/70 line-through decoration-red-500/30 cursor-not-allowed' :
            isPrimary  ? 'text-foreground/90 hover:text-foreground cursor-pointer' :
                         'text-foreground/82 hover:text-foreground/100 cursor-pointer'
          )}
          disabled={isBlocked}
          title={isBlocked ? undefined : 'Click to inspect'}
        >
          {result.title}
        </button>

        <p className={twMerge('text-[12px] leading-relaxed mb-0',
          isBlocked ? 'text-muted-foreground/25 line-through' : 'text-foreground/42'
        )}>
          {result.snippet}
        </p>

        <div className={twMerge(
          'flex items-center justify-between gap-2 py-2.5 px-3 mt-3 mx-[-1rem] border-t',
          isBlocked ? 'border-red-500/10 bg-red-500/[0.04]' : 'border-white/[0.04] bg-black/20'
        )}>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <ShieldCheck className={twMerge('w-2.5 h-2.5 shrink-0 opacity-50', c.text)} />
            <span className="text-[10px] font-mono text-muted-foreground/45 truncate">{result.whyReason}</span>
          </div>

          {isBlocked ? (
            <span className="text-[9px] font-mono text-red-500/70 uppercase font-bold tracking-widest shrink-0">HIGH RISK</span>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <FooterAction
                label={bookmarkFlash.flashing ? 'Saved!' : bookmarked ? 'Saved' : 'Save'}
                active={bookmarked || bookmarkFlash.flashing}
                icon={bookmarked || bookmarkFlash.flashing ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                onClick={handleBookmark}
              />
              <div className="relative">
                <FooterAction
                  label={collectFlash.flashing ? 'Added!' : saved ? 'Collected' : 'Collect'}
                  active={saved || collectFlash.flashing}
                  icon={collectFlash.flashing ? <Check className="w-3 h-3" /> : <FolderPlus className="w-3 h-3" />}
                  onClick={e => { e.stopPropagation(); setColPickerOpen(v => !v); }}
                />
                <CollectionPicker
                  open={colPickerOpen} onClose={() => setColPickerOpen(false)}
                  collections={collections} onAdd={handleAddToCollection}
                  onCreateAndAdd={handleCreateAndAddToCollection}
                />
              </div>
              <FooterAction label="Inspect" icon={<Shield className="w-3 h-3" />} onClick={e => { e.stopPropagation(); onInspect(); }} />
              <a
                href={result.url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[9px] font-mono text-primary/50 hover:text-primary uppercase tracking-widest transition-colors cursor-pointer"
              >
                Open <ArrowUpRight className="w-2.5 h-2.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function FooterAction({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick?.(e); }}
      className={twMerge(
        'flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none',
        active ? 'text-primary/80' : 'text-muted-foreground/30 hover:text-muted-foreground/75'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function SearchResultsView() {
  const { searchQuery, investigationMode, investigations, activeInvestigationId, savedItems, navigate, sageMode, setSageMode } = useBrowserState();
  const [allResults, setAllResults] = useState<EnrichedItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [provider, setProvider] = useState<'brave' | 'duckduckgo' | 'mock'>('mock');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [inspectTarget, setInspectTarget] = useState<{ url: string; title: string; snippet: string } | null>(null);

  // Intelligence + Sage panel state
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [sageOpen, setSageOpen] = useState(false);

  const safeQuery = searchQuery ?? '';

  const doSearch = () => {
    if (!safeQuery) return;
    setLoading(true); setError(false); setFilter('all'); setVisibleCount(PAGE_SIZE);
    setBriefExpanded(false);
    searchWeb(safeQuery)
      .then(resp => {
        setAllResults(resp.results.map(enrichResult));
        setProvider(resp.provider);
        setError(!!resp.error && resp.results.length === 0);
      })
      .catch(() => { setError(true); setAllResults([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // If navigated from Ask Sage homepage action, auto-open Sage
    if (sageMode) {
      setSageOpen(true);
      setSageMode(false);
    } else {
      setSageOpen(false);
    }
    doSearch();
  }, [safeQuery]);

  // Intelligence analysis
  const intelligence = useMemo(() => {
    if (allResults.length === 0) return null;
    return analyzeResults(
      allResults.map(r => ({
        id: r.id, domain: r.domain, title: r.title, snippet: r.snippet,
        score: r.score, confidence: r.confidence, posture: r.posture,
        sourceType: r.sourceType, category: r.category,
      })),
      safeQuery
    );
  }, [allResults, safeQuery]);

  // Sage context string derived from intelligence
  const sageContext = useMemo(() => {
    if (!intelligence) return '';
    const parts = [
      `Query type: ${intelligence.queryType}`,
      `Signal level: ${intelligence.signalLevel}`,
      `Agreement: ${intelligence.agreement}`,
      `Recency: ${intelligence.recencyProfile}`,
      `Source mix: ${intelligence.sourceMix}`,
    ];
    if (intelligence.topFindings.length) parts.push(`Findings: ${intelligence.topFindings.join('; ')}`);
    if (intelligence.disagreements.length) parts.push(`Disagreements: ${intelligence.disagreements.join('; ')}`);
    if (intelligence.keyEntities.length) parts.push(`Key entities: ${intelligence.keyEntities.join(', ')}`);
    return parts.join('\n');
  }, [intelligence]);

  // Sage results payload (top 10 enriched)
  const sageResults: SageResult[] = useMemo(() =>
    allResults.slice(0, 10).map(r => ({
      title: r.title, domain: r.domain, snippet: r.snippet,
      score: r.score, confidence: r.confidence,
    })),
    [allResults]
  );

  const filtered = allResults.filter(r => {
    if (filter === 'safe')    return r.posture === 'SAFE';
    if (filter === 'caution') return r.posture === 'CAUTION' || r.posture === 'UNKNOWN';
    if (filter === 'docs')    return r.sourceType === 'Documentation' || r.sourceType === 'Reference';
    if (filter === 'news')    return r.sourceType === 'News';
    if (filter === 'strict')  return r.posture === 'SAFE' && r.confidence === 'high';
    return true;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const counts = {
    all:     allResults.length,
    safe:    allResults.filter(r => r.posture === 'SAFE').length,
    caution: allResults.filter(r => r.posture === 'CAUTION' || r.posture === 'UNKNOWN').length,
    docs:    allResults.filter(r => r.sourceType === 'Documentation' || r.sourceType === 'Reference').length,
    news:    allResults.filter(r => r.sourceType === 'News').length,
    strict:  allResults.filter(r => r.posture === 'SAFE' && r.confidence === 'high').length,
  };

  const filters: { key: FilterKey; label: string; icon?: React.ReactNode }[] = [
    { key: 'all',     label: 'All' },
    { key: 'safe',    label: 'Safe' },
    { key: 'caution', label: 'Review' },
    { key: 'docs',    label: 'Docs' },
    { key: 'news',    label: 'News' },
    { key: 'strict',  label: 'Strict', icon: <Lock className="w-2.5 h-2.5" /> },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-5 pt-4 pb-0 border-b border-white/[0.05]"
        style={{ background: 'rgba(6,7,10,0.97)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-3 h-3 text-primary/40 shrink-0" />
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/35">
                Intelligence Search
                {provider === 'brave' && <span className="text-primary/30 ml-2">· Brave Search</span>}
                {provider === 'duckduckgo' && <span className="text-primary/30 ml-2">· DuckDuckGo</span>}
                {provider === 'mock' && <span className="text-muted-foreground/22 ml-2">· Heuristic</span>}
              </span>
            </div>
            <h2 className="text-[15px] font-semibold text-foreground/85 leading-tight truncate">
              "{safeQuery || '—'}"
            </h2>
          </div>
          {loading ? (
            <Loader2 className="w-4 h-4 text-primary/50 animate-spin mt-1 shrink-0 ml-4" />
          ) : (
            <div className="text-right shrink-0 ml-4">
              <div className="text-[10px] font-mono text-muted-foreground/28">{allResults.length} results</div>
              <div className="text-[10px] font-mono text-primary/45 mt-0.5">{counts.safe} safe</div>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-0 -mx-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={twMerge(
                'relative px-3 py-2.5 text-[11px] font-mono tracking-wide transition-all flex items-center gap-1.5 cursor-pointer',
                filter === f.key ? 'text-foreground/85' : 'text-muted-foreground/32 hover:text-muted-foreground/62'
              )}
            >
              {f.icon}
              {f.label}
              <span className={twMerge('text-[9px] font-bold tabular-nums', filter === f.key ? 'text-primary/60' : 'text-muted-foreground/22')}>
                {counts[f.key]}
              </span>
              {filter === f.key && (
                <motion.div layoutId="search-filter-tab" className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-primary/60 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Intelligence Brief ──────────────────────────────────────────── */}
      {!loading && !error && intelligence && (
        <IntelligenceBrief
          report={intelligence}
          expanded={briefExpanded}
          onToggle={() => setBriefExpanded(v => !v)}
          sageOpen={sageOpen}
          onToggleSage={() => setSageOpen(v => !v)}
        />
      )}

      {/* ── Ask Sage Chat Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {!loading && !error && sageOpen && (
          <SageChat
            open={sageOpen}
            query={safeQuery}
            results={sageResults}
            context={sageContext}
            onClose={() => setSageOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Investigation Mode banner */}
      {investigationMode && (() => {
        const activeInv = investigations.find(i => i.id === activeInvestigationId);
        const invSourceCount = activeInv ? savedItems.filter(s => activeInv.savedItemIds.includes(s.id)).length : 0;
        return (
          <button
            onClick={() => navigate('sentrix://investigations')}
            className="shrink-0 flex items-center gap-2 px-5 py-2 text-left hover:opacity-90 transition-opacity"
            style={{ background: 'rgba(22,163,74,0.06)', borderBottom: '1px solid rgba(22,163,74,0.15)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-[10px] font-mono tracking-[0.1em]" style={{ color: 'hsl(142 72% 44%)' }}>
              INVESTIGATION MODE
            </span>
            {activeInv && (
              <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>
                · {activeInv.name} ({invSourceCount} source{invSourceCount !== 1 ? 's' : ''})
              </span>
            )}
            <span className="text-[9px] font-mono ml-auto" style={{ color: 'rgba(148,163,184,0.3)' }}>
              Items saved will attach →
            </span>
          </button>
        );
      })()}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2.5">
            <Loader2 className="w-4 h-4 text-primary/50 animate-spin" />
            <span className="text-[12px] font-mono text-muted-foreground/35">Analyzing results…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500/50" />
              <span className="text-[12px] font-mono text-muted-foreground/40">Unable to fetch live results</span>
            </div>
            <button
              onClick={() => doSearch()}
              className="px-3 py-1.5 text-[11px] font-mono rounded border cursor-pointer transition-colors"
              style={{ borderColor: 'rgba(22,163,74,0.3)', color: 'rgba(22,163,74,0.7)', background: 'rgba(22,163,74,0.06)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.06)'; }}
            >
              Retry search
            </button>
          </div>
        )}

        {!loading && !error && visible.map((r, i) => (
          <ResultCard
            key={r.id}
            result={r}
            index={i}
            onInspect={() => setInspectTarget({ url: r.url, title: r.title, snippet: r.snippet })}
            tier={intelligence?.signalTiers.get(r.id)}
            compare={intelligence?.compareTheseIds.includes(r.id) && intelligence?.signalTiers.get(r.id) !== 'primary'}
          />
        ))}

        {!loading && !error && filtered.length === 0 && allResults.length > 0 && (
          <div className="text-center py-14">
            <p className="text-muted-foreground/28 font-mono text-[12px] mb-2">— no results match this filter —</p>
            {filter === 'strict' && (
              <p className="text-muted-foreground/22 font-mono text-[10px]">
                Strict mode shows only high-confidence, SAFE-rated results
              </p>
            )}
          </div>
        )}

        {!loading && !error && hasMore && (
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="w-full py-2.5 text-[11px] font-mono rounded border cursor-pointer transition-colors mt-1"
            style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.45)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(22,163,74,0.25)'; e.currentTarget.style.color = 'rgba(22,163,74,0.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(148,163,184,0.45)'; }}
          >
            Load more — {filtered.length - visibleCount} remaining
          </button>
        )}

        {!loading && !error && allResults.length > 0 && !hasMore && (
          <div className="flex items-center gap-2 py-3 border-t border-white/[0.04] mt-2">
            <ShieldCheck className="w-3 h-3 text-primary/25" />
            <span className="text-[10px] font-mono text-muted-foreground/22">
              {provider === 'duckduckgo' ? 'DuckDuckGo' : provider === 'brave' ? 'Brave Search' : 'Heuristic'} · click title to inspect · Open visits externally
            </span>
          </div>
        )}
      </div>

      {/* ── Inspect drawer ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {inspectTarget && (
          <InspectDrawer
            url={inspectTarget.url}
            title={inspectTarget.title}
            snippet={inspectTarget.snippet}
            onClose={() => setInspectTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
