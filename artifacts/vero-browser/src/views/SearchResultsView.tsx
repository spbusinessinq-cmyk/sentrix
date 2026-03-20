import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, Shield, AlertTriangle,
  Bookmark, BookmarkCheck, FolderPlus, Check,
  Loader2, AlertCircle, ArrowUpRight, Plus,
  ChevronDown, ChevronUp, ChevronRight, Zap, Sparkles,
  Send, X, RotateCcw, Lock, GitMerge,
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { searchWeb, SearchResultItem } from '@/lib/search';
import { enrichUrl, postureColor, sourceTypeIcon, Posture, SourceType } from '@/lib/enrichment';
import { InspectDrawer } from '@/components/InspectDrawer';
import { analyzeResults, IntelligenceReport, SignalTier } from '@/lib/intelligence';
import { streamSageQuery, SageMessage, SageResult } from '@/lib/sage-client';

// ── Color tokens — blue-cyan brand (primary), purple for Sage only ────────────
const CYAN         = '#38BDF8';
const CYAN_04      = 'rgba(56,189,248,0.04)';
const CYAN_06      = 'rgba(56,189,248,0.06)';
const CYAN_08      = 'rgba(56,189,248,0.08)';
const CYAN_18      = 'rgba(56,189,248,0.18)';
const CYAN_25      = 'rgba(56,189,248,0.22)';
// Sage/AI accent stays purple
const SAGE_COLOR   = 'rgba(139,92,246,0.85)';
const SAGE_BORDER  = 'rgba(139,92,246,0.25)';
const SAGE_BG      = 'rgba(139,92,246,0.08)';
const SIG_STRONG   = '#38BDF8';
const SIG_MED      = '#f59e0b';

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

// ── Sage response parsing ─────────────────────────────────────────────────────
interface ParsedSage {
  answer: string;
  verificationStatus: string;
  confirmingEvidence: string;
  contradictingEvidence: string;
  sourceWeight: string;
  signal: string;
  agreement: string;
  risk: string;
  whatMatters: string;
  whatToQuestion: string;
  whatToVerify: string;
  sources: string;
  // legacy fallback
  intelligence: string;
}

function parseSageResponse(text: string): ParsedSage {
  const sec = (header: string, next?: string[]) => {
    const nextPat = next?.length ? next.map(h => `##\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).join('|') : '$';
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(`##\\s*${escapedHeader}\\s*([\\s\\S]*?)(?=${nextPat}|$)`, 'i'));
    return m?.[1]?.trim() ?? '';
  };

  // All section names in output order — used as stop-markers for each section
  const ALL = [
    'VERIFICATION STATUS',
    'CONFIRMING EVIDENCE',
    'CONTRADICTING OR MISSING EVIDENCE',
    'SOURCE WEIGHT',
    'SIGNAL',
    'AGREEMENT',
    'RISK',
    'WHAT MATTERS',
    'WHAT TO QUESTION',
    'WHAT TO VERIFY NEXT',
    'SOURCES',
    'INTELLIGENCE',
    'ARTICLE', 'SUMMARY', 'CORE CLAIMS', 'VERDICT',
  ];

  const answer               = sec('ANSWER', ALL);
  const verificationStatus   = sec('VERIFICATION STATUS', ALL.slice(1));
  const confirmingEvidence   = sec('CONFIRMING EVIDENCE', ALL.slice(2));
  const contradictingEvidence = sec('CONTRADICTING OR MISSING EVIDENCE', ALL.slice(3));
  const sourceWeight         = sec('SOURCE WEIGHT', ALL.slice(4));
  const signal               = sec('SIGNAL', ALL.slice(5));
  const agreement            = sec('AGREEMENT', ALL.slice(6));
  const risk                 = sec('RISK', ALL.slice(7));
  const whatMatters          = sec('WHAT MATTERS', ALL.slice(8));
  const whatToQ              = sec('WHAT TO QUESTION', ALL.slice(9));
  const whatToVerify         = sec('WHAT TO VERIFY NEXT', ALL.slice(10));
  const sources              = sec('SOURCES', ['INTELLIGENCE', 'ARTICLE']);
  const intelligence         = sec('INTELLIGENCE');

  return {
    answer: answer || text,
    verificationStatus,
    confirmingEvidence,
    contradictingEvidence,
    sourceWeight,
    signal,
    agreement,
    risk,
    whatMatters,
    whatToQuestion: whatToQ,
    whatToVerify,
    sources,
    intelligence,
  };
}

// ── Signal badge helpers ──────────────────────────────────────────────────────
function extractRating(text: string): string {
  return text.split(/[\s—–]/)[0]?.toUpperCase() ?? '';
}

function extractDetail(text: string): string {
  return text.replace(/^[A-Z]+\s*[—–\-]\s*/i, '').trim();
}

const SIGNAL_STYLES: Record<string, { color: string; border: string; bg: string; dot: string }> = {
  HIGH:      { color: '#38BDF8',              border: 'rgba(56,189,248,0.30)',  bg: 'rgba(56,189,248,0.08)',  dot: '#38BDF8' },
  MEDIUM:    { color: 'rgba(245,158,11,0.80)', border: 'rgba(245,158,11,0.28)', bg: 'rgba(245,158,11,0.07)', dot: '#f59e0b' },
  LOW:       { color: 'rgba(148,163,184,0.55)', border: 'rgba(255,255,255,0.10)', bg: 'transparent',           dot: 'rgba(148,163,184,0.4)' },
  CONSENSUS: { color: '#38BDF8',              border: 'rgba(56,189,248,0.25)',  bg: 'rgba(56,189,248,0.06)',  dot: '#38BDF8' },
  MIXED:     { color: 'rgba(245,158,11,0.80)', border: 'rgba(245,158,11,0.22)', bg: 'rgba(245,158,11,0.05)', dot: '#f59e0b' },
  CONFLICT:  { color: 'rgba(239,68,68,0.80)',  border: 'rgba(239,68,68,0.25)',  bg: 'rgba(239,68,68,0.06)',  dot: '#ef4444' },
  SAFE:      { color: '#38BDF8',              border: 'rgba(56,189,248,0.25)',  bg: 'rgba(56,189,248,0.06)',  dot: '#38BDF8' },
  CAUTION:   { color: 'rgba(245,158,11,0.80)', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)', dot: '#f59e0b' },
  DANGER:    { color: 'rgba(239,68,68,0.85)',  border: 'rgba(239,68,68,0.30)',  bg: 'rgba(239,68,68,0.07)',  dot: '#ef4444' },
};

function RatingBadge({ label, rating }: { label: string; rating: string }) {
  const s = SIGNAL_STYLES[rating] ?? SIGNAL_STYLES['LOW'];
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(148,163,184,0.35)' }}>{label}</span>
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-[0.14em] uppercase border"
        style={{ color: s.color, borderColor: s.border, background: s.bg }}
      >
        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: s.dot }} />
        {rating}
      </span>
    </div>
  );
}

function SignalCell({ label, rating, styles }: {
  label: string; rating: string;
  styles: { color: string; border: string; bg: string; dot: string };
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 gap-1"
      style={{ background: styles.bg }}>
      <span className="text-[7.5px] font-mono uppercase tracking-[0.22em]" style={{ color: 'rgba(148,163,184,0.40)' }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: styles.dot, boxShadow: `0 0 4px ${styles.dot}` }} />
        <span className="text-[13px] font-bold tracking-[0.18em] uppercase" style={{ color: styles.color }}>
          {rating}
        </span>
      </div>
    </div>
  );
}

function CollapsibleSection({
  label, labelColor, children, defaultOpen = true,
}: { label: string; labelColor?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.055)' }}>
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 w-full text-left mb-2 cursor-pointer">
        <span className="text-[8px] font-mono uppercase tracking-[0.22em] transition-colors duration-150"
          style={{ color: open ? (labelColor ?? 'rgba(148,163,184,0.55)') : 'rgba(148,163,184,0.28)' }}>
          {label}
        </span>
        {open
          ? <ChevronUp className="w-2.5 h-2.5 ml-auto" style={{ color: 'rgba(148,163,184,0.28)' }} />
          : <ChevronDown className="w-2.5 h-2.5 ml-auto" style={{ color: 'rgba(148,163,184,0.28)' }} />}
      </button>
      {open && children}
    </div>
  );
}

function AlwaysVisibleSection({
  label, labelColor, accentColor, children,
}: { label: string; labelColor?: string; accentColor?: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.055)' }}>
      <div className="flex items-center gap-2 mb-2.5">
        {accentColor && <div className="w-0.5 h-3 rounded-full shrink-0" style={{ background: accentColor }} />}
        <span className="text-[8px] font-mono uppercase tracking-[0.28em] font-bold"
          style={{ color: labelColor ?? 'rgba(148,163,184,0.55)' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Markdown renderer (lightweight, no deps) ──────────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: 'rgba(230,230,240,0.95)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} style={{ color: 'rgba(200,205,215,0.80)' }}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="px-1 rounded text-[0.85em]"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(56,189,248,0.80)', fontFamily: 'JetBrains Mono, monospace' }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  const listBuf: { type: 'ol' | 'ul'; items: string[] } = { type: 'ul', items: [] };

  const flushList = () => {
    if (!listBuf.items.length) return;
    const Tag = listBuf.type;
    blocks.push(
      <Tag key={`list-${blocks.length}`}
        className={listBuf.type === 'ol' ? 'list-decimal pl-5 space-y-1' : 'list-disc pl-5 space-y-1'}
        style={{ color: 'rgba(210,210,225,0.82)', marginTop: '0.35rem', marginBottom: '0.35rem' }}>
        {listBuf.items.map((item, i) => (
          <li key={i} className="text-[14px] leading-relaxed">{renderInline(item)}</li>
        ))}
      </Tag>
    );
    listBuf.items = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ordered = line.match(/^\d+\.\s+(.*)/);
    const bullet  = line.match(/^[-•*]\s+(.*)/);

    if (ordered) {
      if (listBuf.type !== 'ol' && listBuf.items.length) flushList();
      listBuf.type = 'ol';
      listBuf.items.push(ordered[1]);
    } else if (bullet) {
      if (listBuf.type !== 'ul' && listBuf.items.length) flushList();
      listBuf.type = 'ul';
      listBuf.items.push(bullet[1]);
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${i}`} className="text-[14.5px] leading-relaxed"
          style={{ color: 'rgba(215,215,230,0.88)', lineHeight: '1.78', marginBottom: '0.4rem' }}>
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();
  return <>{blocks}</>;
}

// ── Sources renderer (structured bullet list) ─────────────────────────────────
function renderSources(text: string): React.ReactNode {
  const lines = text.split('\n').filter(l => l.trim());
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        // Match: • domain.com — description
        const m = line.match(/^[•\-*]\s*([\w.\-]+[\w])\s*[—–-]+\s*(.*)/);
        if (m) {
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-[3px] w-1 h-1 rounded-full shrink-0" style={{ background: 'rgba(56,189,248,0.45)' }} />
              <div className="text-[11px] font-mono leading-relaxed">
                <span style={{ color: 'rgba(148,163,184,0.80)', fontWeight: 600 }}>{m[1]}</span>
                <span style={{ color: 'rgba(148,163,184,0.42)' }}> — {m[2]}</span>
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="text-[11px] font-mono leading-relaxed" style={{ color: 'rgba(148,163,184,0.45)' }}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

interface RichSageMessage extends SageMessage {
  parsed?: ParsedSage;
}

// ── Badges ────────────────────────────────────────────────────────────────────
function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const styles = {
    high:   { color: 'rgba(56,189,248,0.80)',    border: 'rgba(56,189,248,0.25)',    bg: 'rgba(56,189,248,0.06)',    label: 'HIGH' },
    medium: { color: 'rgba(245,158,11,0.70)',   border: 'rgba(245,158,11,0.22)',   bg: 'rgba(245,158,11,0.05)',   label: 'MED'  },
    low:    { color: 'rgba(148,163,184,0.45)',  border: 'rgba(255,255,255,0.08)',  bg: 'transparent',             label: 'LOW'  },
  }[level];
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.15em] uppercase shrink-0 border"
      style={{ color: styles.color, borderColor: styles.border, background: styles.bg }}>
      {styles.label}
    </span>
  );
}

function PostureBadge({ posture }: { posture: Posture }) {
  const c = postureColor(posture);
  const Icon = posture === 'SAFE' ? ShieldCheck : posture === 'DANGER' ? ShieldAlert : posture === 'CAUTION' ? AlertTriangle : Shield;
  return (
    <span className={twMerge('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-[0.12em] uppercase shrink-0', c.text, c.border, c.bg)}>
      <Icon className="w-2.5 h-2.5" /> {posture}
    </span>
  );
}

function SourceTypePill({ type }: { type: SourceType }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/[0.07] bg-white/[0.03] text-[9px] font-mono text-muted-foreground/45 uppercase tracking-wider shrink-0">
      <span className="text-[8px]">{sourceTypeIcon(type)}</span>{type}
    </span>
  );
}

function SignalTierBadge({ tier }: { tier: SignalTier }) {
  if (tier === 'primary') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.15em] uppercase shrink-0 border"
      style={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,0.35)', background: 'rgba(56,189,248,0.10)' }}>
      <Zap className="w-2 h-2" /> Start here
    </span>
  );
  if (tier === 'high') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.15em] uppercase shrink-0 border"
      style={{ color: 'rgba(56,189,248,0.65)', borderColor: 'rgba(56,189,248,0.18)', background: 'transparent' }}>
      High signal
    </span>
  );
  if (tier === 'low') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.12em] uppercase shrink-0 border"
      style={{ color: 'rgba(148,163,184,0.38)', borderColor: 'rgba(255,255,255,0.06)', background: 'transparent' }}>
      Low signal
    </span>
  );
  if (tier === 'noise') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.12em] uppercase shrink-0 border"
      style={{ color: 'rgba(245,158,11,0.55)', borderColor: 'rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.04)' }}>
      Review carefully
    </span>
  );
  return null;
}

function CompareBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-[0.12em] uppercase shrink-0 border"
      style={{ color: 'rgba(139,92,246,0.65)', borderColor: 'rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.05)' }}>
      <GitMerge className="w-2 h-2" /> Compare
    </span>
  );
}

function useFlash(duration = 1200) {
  const [flashing, setFlashing] = useState(false);
  const trigger = () => { setFlashing(true); setTimeout(() => setFlashing(false), duration); };
  return { flashing, trigger };
}

// ── Collection picker ─────────────────────────────────────────────────────────
function CollectionPicker({ open, onClose, collections, onAdd, onCreateAndAdd }: {
  open: boolean; onClose: () => void;
  collections: Array<{ id: string; name: string; color: string; itemCount: number }>;
  onAdd: (colId: string) => void;
  onCreateAndAdd: (name: string) => void;
}) {
  const [newMode, setNewMode] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setNewMode(false); setNewName(''); return; }
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div ref={ref} className="absolute bottom-full mb-2 right-0 w-48 rounded-xl overflow-hidden shadow-2xl z-30"
      style={{ background: 'rgba(8,9,13,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}
      onClick={e => e.stopPropagation()}>
      <div className="px-3 pt-2.5 pb-1">
        <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/35 mb-1.5">Add to Collection</div>
      </div>
      {collections.map(col => (
        <button key={col.id} onClick={() => { onAdd(col.id); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] transition-colors text-left">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
          <span className="text-[11px] font-mono text-foreground/65 flex-1 truncate">{col.name}</span>
          <span className="text-[10px] font-mono text-muted-foreground/30">{col.itemCount}</span>
        </button>
      ))}
      <div className="border-t border-white/[0.06]">
        {newMode ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { onCreateAndAdd(newName.trim()); onClose(); } if (e.key === 'Escape') setNewMode(false); }}
              placeholder="Collection name…"
              className="flex-1 bg-transparent text-[11px] font-mono text-foreground/70 outline-none placeholder:text-muted-foreground/25" />
            <button onClick={() => { if (newName.trim()) { onCreateAndAdd(newName.trim()); onClose(); } }} className="text-primary/70 hover:text-primary transition-colors">
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button onClick={() => setNewMode(true)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors">
            <Plus className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-[11px] font-mono text-muted-foreground/40">New collection…</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Intelligence Brief ─────────────────────────────────────────────────────────
function IntelligenceBrief({ report, expanded, onToggle, sageOpen, onToggleSage }: {
  report: IntelligenceReport; expanded: boolean; onToggle: () => void;
  sageOpen: boolean; onToggleSage: () => void;
}) {
  // Intelligence signal tier badges
  const signalColor = report.signalLevel === 'strong' ? SIG_STRONG : report.signalLevel === 'moderate' ? SIG_MED : 'rgba(148,163,184,0.5)';
  const agreementLabel = report.agreement === 'divergent' ? 'Sources diverge' : report.agreement === 'mixed' ? 'Mixed sourcing' : 'Sources consistent';
  const agreementColor = report.agreement === 'divergent' ? 'rgba(245,158,11,0.65)' : report.agreement === 'mixed' ? 'rgba(245,158,11,0.45)' : SIG_STRONG;
  const recencyLabel   = report.recencyProfile === 'recent' ? 'Recent reporting' : report.recencyProfile === 'mixed' ? 'Some recency signals' : 'Reference material';

  return (
    <div className="shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(4,5,8,0.6)' }}>
      <div className="px-5 py-2 flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-mono capitalize" style={{ color: signalColor }}>{report.signalLevel} signal</span>
        <div className="w-px h-3 bg-white/[0.06]" />
        <span className="text-[10px] font-mono" style={{ color: agreementColor }}>{agreementLabel}</span>
        <div className="w-px h-3 bg-white/[0.06]" />
        <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.35)' }}>{recencyLabel}</span>
        {report.sourceMix && (<><div className="w-px h-3 bg-white/[0.06]" /><span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.25)' }}>{report.sourceMix}</span></>)}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={onToggleSage}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer"
            style={{
              background: sageOpen ? SAGE_BG : 'rgba(255,255,255,0.04)',
              border: `1px solid ${sageOpen ? SAGE_BORDER : 'rgba(255,255,255,0.08)'}`,
              color: sageOpen ? SAGE_COLOR : 'rgba(148,163,184,0.5)',
            }}>
            <Sparkles className="w-3 h-3" />
            <span className="text-[9px] font-mono uppercase tracking-[0.15em]">Analyze</span>
          </button>
          <button onClick={onToggle}
            className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer"
            style={{ color: 'rgba(148,163,184,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }} style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="px-5 py-3 flex flex-col gap-1.5">
              {report.topFindings.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full mt-[5px] shrink-0" style={{ background: 'rgba(56,189,248,0.50)' }} />
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
                    <span key={e} className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.45)' }}>
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

// ── Structured Sage message ───────────────────────────────────────────────────
function SageAnswerBlock({ msg }: { msg: RichSageMessage }) {
  const p = msg.parsed;

  if (!p || !p.answer) {
    return (
      <div className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(200,200,212,0.80)', lineHeight: '1.78' }}>
        {msg.content}
      </div>
    );
  }

  const signalRating    = extractRating(p.signal);
  const signalDetail    = extractDetail(p.signal);
  const agreementRating = extractRating(p.agreement);
  const agreementDetail = extractDetail(p.agreement);
  const riskRating      = extractRating(p.risk);
  const riskDetail      = extractDetail(p.risk);

  const hasSignalBar = signalRating || agreementRating || riskRating;

  return (
    <div className="flex flex-col gap-4">

      {/* ANSWER — dominant, full-width rendered markdown */}
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        {renderMarkdown(p.answer)}
      </div>

      {/* SIGNAL BAR — decisive, bold, unavoidable */}
      {hasSignalBar && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Rating row — large, bold, decisive */}
          <div className="flex divide-x" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {signalRating && (
              <SignalCell label="Signal" rating={signalRating} styles={SIGNAL_STYLES[signalRating] ?? SIGNAL_STYLES['LOW']} />
            )}
            {agreementRating && (
              <SignalCell label="Agreement" rating={agreementRating} styles={SIGNAL_STYLES[agreementRating] ?? SIGNAL_STYLES['LOW']} />
            )}
            {riskRating && (
              <SignalCell label="Risk" rating={riskRating} styles={SIGNAL_STYLES[riskRating] ?? SIGNAL_STYLES['LOW']} />
            )}
          </div>
          {/* Detail row */}
          {(signalDetail || agreementDetail || riskDetail) && (
            <div
              className="flex divide-x"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.04)' }}
            >
              {signalRating && (
                <div className="flex-1 px-3 py-2 text-[9.5px] font-mono leading-snug" style={{ color: 'rgba(148,163,184,0.38)' }}>
                  {signalDetail}
                </div>
              )}
              {agreementRating && (
                <div className="flex-1 px-3 py-2 text-[9.5px] font-mono leading-snug" style={{ color: 'rgba(148,163,184,0.38)' }}>
                  {agreementDetail}
                </div>
              )}
              {riskRating && (
                <div className="flex-1 px-3 py-2 text-[9.5px] font-mono leading-snug" style={{ color: 'rgba(148,163,184,0.38)' }}>
                  {riskDetail}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMING EVIDENCE — collapsible, cyan */}
      {p.confirmingEvidence && (
        <CollapsibleSection label="Confirming Evidence" labelColor="rgba(56,189,248,0.65)" defaultOpen>
          {renderMarkdown(p.confirmingEvidence)}
        </CollapsibleSection>
      )}

      {/* CONTRADICTING OR MISSING EVIDENCE — collapsible, amber */}
      {p.contradictingEvidence && (
        <CollapsibleSection label="Contradicting Evidence" labelColor="rgba(245,158,11,0.65)" defaultOpen>
          {renderMarkdown(p.contradictingEvidence)}
        </CollapsibleSection>
      )}

      {/* WHAT MATTERS — always visible, never hidden */}
      {p.whatMatters && (
        <AlwaysVisibleSection
          label="What Matters"
          labelColor="rgba(56,189,248,0.65)"
          accentColor="rgba(56,189,248,0.55)"
        >
          {renderMarkdown(p.whatMatters)}
        </AlwaysVisibleSection>
      )}

      {/* WHAT TO QUESTION — always visible, never hidden */}
      {p.whatToQuestion && (
        <AlwaysVisibleSection
          label="What to Question"
          labelColor="rgba(245,158,11,0.65)"
          accentColor="rgba(245,158,11,0.50)"
        >
          {renderMarkdown(p.whatToQuestion)}
        </AlwaysVisibleSection>
      )}

      {/* WHAT TO VERIFY NEXT — collapsible */}
      {p.whatToVerify && (
        <CollapsibleSection label="What to Verify Next" labelColor="rgba(148,163,184,0.50)" defaultOpen={false}>
          {renderMarkdown(p.whatToVerify)}
        </CollapsibleSection>
      )}

      {/* SOURCES — collapsible, closed by default (secondary) */}
      {(p.sources || p.sourceWeight) && (
        <CollapsibleSection label="Sources" defaultOpen={false}>
          {p.sources && renderSources(p.sources)}
          {p.sourceWeight && (
            <div className="mt-3 pt-3 text-[10.5px] font-mono leading-relaxed"
              style={{ color: 'rgba(148,163,184,0.45)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-[8.5px] uppercase tracking-[0.15em] font-bold block mb-1.5"
                style={{ color: 'rgba(148,163,184,0.30)' }}>Source Weight</span>
              {renderMarkdown(p.sourceWeight)}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* INTELLIGENCE — legacy fallback for old-format responses */}
      {!hasSignalBar && p.intelligence && (
        <CollapsibleSection label="Intelligence" labelColor="rgba(139,92,246,0.55)" defaultOpen>
          <div className="text-[11.5px] font-mono leading-relaxed"
            style={{ color: 'rgba(148,163,184,0.55)', lineHeight: '1.7', borderLeft: '2px solid rgba(139,92,246,0.20)', paddingLeft: '0.75rem' }}>
            {renderInline(p.intelligence)}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

// ── Scaffold detection ────────────────────────────────────────────────────────
// Starter chip display → scaffold insert text (with trailing colon-space)
const STARTER_CHIPS: Array<{ display: string; insert: string }> = [
  { display: 'Analyze this claim',        insert: 'Analyze this claim: ' },
  { display: 'Break this down for me',    insert: 'Break this down for me: ' },
  { display: 'What should I question here?', insert: 'What should I question here: ' },
];

// Scaffold-only prefixes (no real content after the colon)
const SCAFFOLD_PREFIXES = [
  'analyze this claim',
  'break this down for me',
  'what should i question here',
];

function isScaffoldOnly(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  if (!t) return true;
  for (const prefix of SCAFFOLD_PREFIXES) {
    // Matches "Analyze this claim", "Analyze this claim:", "Analyze this claim:  "
    // Does NOT match "Analyze this claim: The earth is flat"
    if (new RegExp(`^${prefix}:?\\s*$`).test(t)) return true;
  }
  return false;
}

// ── Ask Sage Chat Panel ────────────────────────────────────────────────────────
function SageChat({ open, query, results, context, onClose, initialMessage, onClearInitialMessage }: {
  open: boolean; query: string; results: SageResult[]; context: string; onClose: () => void;
  initialMessage?: string | null;
  onClearInitialMessage?: () => void;
}) {
  const [history, setHistory] = useState<RichSageMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | undefined>(undefined);
  const inputRef  = useRef<HTMLInputElement>(null);
  const didAutoSend = useRef(false);

  useEffect(() => {
    setHistory([]); setStreaming(''); setInput(''); setLoading(false);
    didAutoSend.current = false;
  }, [query]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, streaming]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Prefill input with scaffold text without triggering a send
  const insertScaffold = (text: string) => {
    setInput(text);
    setTimeout(() => {
      const inp = inputRef.current;
      if (inp) { inp.focus(); inp.setSelectionRange(text.length, text.length); }
    }, 0);
  };

  const send = useCallback(async (msg: string) => {
    if (!msg.trim() || loading) return;
    // Guard: scaffold-only input should prefill the input box, not trigger Sage
    if (isScaffoldOnly(msg)) {
      const chip = STARTER_CHIPS.find(c => c.display.toLowerCase() === msg.trim().toLowerCase() || c.insert.toLowerCase().startsWith(msg.trim().toLowerCase()));
      const scaffold = chip ? chip.insert : msg.trim().replace(/:?\s*$/, ': ');
      setInput(scaffold);
      setTimeout(() => {
        const inp = inputRef.current;
        if (inp) { inp.focus(); inp.setSelectionRange(scaffold.length, scaffold.length); }
      }, 0);
      return;
    }
    setInput('');
    const userMsg: RichSageMessage = { role: 'user', content: msg.trim() };
    setHistory(h => [...h, userMsg]);
    setLoading(true); setStreaming('');

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let full = '';
    await streamSageQuery({
      query, results, context,
      messages: history as SageMessage[],
      userMessage: msg.trim(),
      signal: abortRef.current.signal,
      onChunk: (text) => { full += text; setStreaming(full); },
      onDone: () => {
        const parsed = parseSageResponse(full);
        setHistory(h => [...h, { role: 'assistant', content: full, parsed }]);
        setStreaming(''); setLoading(false);
      },
      onError: (errMsg) => {
        setHistory(h => [...h, { role: 'assistant', content: `⚠ ${errMsg}` }]);
        setStreaming(''); setLoading(false);
      },
    });
  }, [query, results, context, history, loading]);

  // Auto-send initial message (from homepage Ask Sage navigation)
  useEffect(() => {
    if (initialMessage && open && !didAutoSend.current && !loading && history.length === 0) {
      didAutoSend.current = true;
      onClearInitialMessage?.();
      setTimeout(() => send(initialMessage), 200);
    }
  }, [initialMessage, open, history.length, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const clearSession = () => {
    abortRef.current?.abort();
    setHistory([]); setStreaming(''); setLoading(false); setInput('');
    didAutoSend.current = false;
  };

  if (!open) return null;

  const hasMessages = history.length > 0 || streaming || loading;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="flex-1 min-h-0 flex flex-col"
      style={{
        borderColor: 'rgba(139,92,246,0.12)',
        background: 'rgba(7,5,16,0.98)',
        borderTop: '1px solid rgba(139,92,246,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
        <Sparkles className="w-3.5 h-3.5" style={{ color: SAGE_COLOR }} />
        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: SAGE_COLOR }}>ANALYSIS OUTPUT</span>
        <span className="text-[8px] font-mono text-muted-foreground/20 ml-1">· signal analysis · gemini-2.5-flash</span>
        <div className="flex items-center gap-2 ml-auto">
          {hasMessages && (
            <button onClick={clearSession}
              className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono cursor-pointer transition-colors"
              style={{ color: 'rgba(148,163,184,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <RotateCcw className="w-2.5 h-2.5" /> Clear
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded cursor-pointer" style={{ color: 'rgba(148,163,184,0.35)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ minHeight: '120px' }}>
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-4">
            <Sparkles className="w-6 h-6 opacity-20" style={{ color: SAGE_COLOR }} />
            <p className="text-[11px] font-mono text-center leading-relaxed" style={{ color: 'rgba(148,163,184,0.35)' }}>
              Paste a claim, URL, or article to analyze.<br />Type below or use a starter to compose your query.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {STARTER_CHIPS.map(chip => (
                <button key={chip.display} onClick={() => insertScaffold(chip.insert)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer transition-all"
                  style={{ background: SAGE_BG, border: `1px solid ${SAGE_BORDER}`, color: SAGE_COLOR }}>
                  {chip.display}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={twMerge('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className="max-w-[90%] rounded-xl px-4 py-3"
              style={msg.role === 'user'
                ? { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', width: '100%' }}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sparkles className="w-2.5 h-2.5" style={{ color: SAGE_COLOR }} />
                  <span className="text-[8px] font-mono uppercase tracking-[0.15em] font-bold" style={{ color: SAGE_COLOR }}>SAGE</span>
                </div>
              )}
              {msg.role === 'assistant'
                ? <SageAnswerBlock msg={msg} />
                : <p className="text-[12px] font-mono leading-relaxed" style={{ color: 'rgba(139,92,246,0.9)' }}>{msg.content}</p>
              }
            </div>
          </div>
        ))}

        {/* Streaming (raw text during generation) */}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[90%] w-full rounded-xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-2.5 h-2.5 animate-pulse" style={{ color: SAGE_COLOR }} />
                <span className="text-[8px] font-mono uppercase tracking-[0.15em] font-bold" style={{ color: SAGE_COLOR }}>SAGE</span>
              </div>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap"
                style={{ color: 'rgba(200,200,212,0.80)', lineHeight: '1.72', fontFamily: "'Inter', sans-serif" }}>
                {streaming}<span className="animate-pulse text-sage opacity-70">▋</span>
              </p>
            </div>
          </div>
        )}

        {loading && !streaming && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3 flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: SAGE_COLOR }} />
              <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.4)' }}>Sage is thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-5 py-3 flex items-center gap-3"
        style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown} placeholder="Deepen analysis…" disabled={loading}
          className="flex-1 bg-transparent text-[12px] font-mono outline-none placeholder:text-muted-foreground/22"
          style={{ color: 'rgba(148,163,184,0.8)' }} />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all cursor-pointer"
          style={{
            background: input.trim() && !loading ? SAGE_BG : 'rgba(255,255,255,0.04)',
            border: `1px solid ${input.trim() && !loading ? SAGE_BORDER : 'rgba(255,255,255,0.06)'}`,
            color: input.trim() && !loading ? SAGE_COLOR : 'rgba(148,163,184,0.2)',
          }}>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ result, index, onInspect, tier, compare }: {
  result: EnrichedItem; index: number; onInspect: () => void;
  tier?: SignalTier; compare?: boolean;
}) {
  const { isSaved, savedItems, addBookmark, isBookmarked, bookmarks, removeBookmark, addToCollection, saveItemToCollection, createCollection, collections } = useBrowserState();
  const saved      = isSaved(result.url);
  const savedObj   = savedItems.find(s => s.url === result.url);
  const bookmarked = isBookmarked(result.url);
  const bookmarkObj = bookmarks.find(b => b.url === result.url);
  const isBlocked  = result.posture === 'DANGER';
  const c          = postureColor(result.posture);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const bookmarkFlash = useFlash();
  const collectFlash  = useFlash();

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookmarked && bookmarkObj) { removeBookmark(bookmarkObj.id); return; }
    addBookmark({ title: result.title, url: result.url, domain: result.domain });
    bookmarkFlash.trigger();
  };

  const itemPayload = { title: result.title, url: result.url, domain: result.domain, posture: result.posture, sourceType: result.sourceType, reasoning: result.reasoning };

  const handleAddToCollection = (colId: string) => {
    if (saved && savedObj) addToCollection(savedObj.id, colId);
    else saveItemToCollection(itemPayload, colId);
    collectFlash.trigger(); setColPickerOpen(false);
  };
  const handleCreateAndAdd = (name: string) => {
    const col = createCollection(name);
    if (saved && savedObj) addToCollection(savedObj.id, col.id);
    else saveItemToCollection(itemPayload, col.id);
    collectFlash.trigger(); setColPickerOpen(false);
  };

  const isPrimary = tier === 'primary';
  const isNoise   = tier === 'noise' || tier === 'low';
  const [cardHovered, setCardHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.16, ease: 'easeOut' }}
      className="group relative overflow-visible"
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      style={{
        borderRadius: '10px',
        border: isBlocked
          ? '1px solid rgba(239,68,68,0.12)'
          : isPrimary
          ? `1px solid ${cardHovered ? 'rgba(56,189,248,0.20)' : 'rgba(56,189,248,0.10)'}`
          : '1px solid rgba(255,255,255,0.055)',
        background: isBlocked
          ? 'rgba(0,0,0,0.28)'
          : isPrimary
          ? 'rgba(0,0,0,0.22)'
          : isNoise
          ? 'rgba(0,0,0,0.14)'
          : 'rgba(0,0,0,0.20)',
        boxShadow: isPrimary && cardHovered
          ? '0 0 24px rgba(56,189,248,0.05), 0 0 0 1px rgba(56,189,248,0.08)'
          : 'none',
        opacity: isNoise ? (cardHovered ? 1 : 0.78) : 1,
        transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out, opacity 150ms ease-out, background 150ms ease-out',
      }}
    >
      {/* Left accent bar — primary (cyan) and danger (red) only */}
      {isPrimary && (
        <div className="absolute left-0 top-[4px] bottom-[4px] w-[1.5px] rounded-full pointer-events-none"
          style={{ background: 'rgba(56,189,248,0.65)', boxShadow: '0 0 6px rgba(56,189,248,0.25)' }} />
      )}
      {isBlocked && (
        <div className="absolute left-0 top-[4px] bottom-[4px] w-[1.5px] rounded-full pointer-events-none"
          style={{ background: 'rgba(239,68,68,0.5)' }} />
      )}

      <div className="pl-4 pr-4 pt-4 pb-0">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className={twMerge('text-[10px] font-mono truncate', c.text)} style={{ opacity: 0.6 }}>{result.domain}</span>
          <PostureBadge posture={result.posture} />
          <SourceTypePill type={result.sourceType} />
          <ConfidenceBadge level={result.confidence} />
          {tier && tier !== 'normal' && <SignalTierBadge tier={tier} />}
          {result.provider === 'brave' && (
            <span className="text-[7.5px] font-mono uppercase tracking-[0.15em]" style={{ color: 'rgba(148,163,184,0.18)' }}>live</span>
          )}
        </div>

        {/* Title */}
        <button
          onClick={e => { e.stopPropagation(); if (!isBlocked) onInspect(); }}
          className={twMerge(
            'text-left w-full font-semibold leading-snug mb-2 block',
            isBlocked
              ? 'text-red-400/60 line-through decoration-red-500/25 cursor-not-allowed text-[13px]'
              : isPrimary
              ? 'text-[13.5px] cursor-pointer'
              : 'text-[13px] cursor-pointer'
          )}
          style={!isBlocked ? {
            color: isPrimary ? 'rgba(230,230,238,0.92)' : 'rgba(210,210,220,0.75)',
            transition: 'color 150ms ease-out',
          } : undefined}
          onMouseEnter={e => { if (!isBlocked) e.currentTarget.style.color = 'rgba(240,240,248,1)'; }}
          onMouseLeave={e => { if (!isBlocked) e.currentTarget.style.color = isPrimary ? 'rgba(230,230,238,0.92)' : 'rgba(210,210,220,0.75)'; }}
          disabled={isBlocked}>
          {result.title}
        </button>

        {/* Snippet */}
        <p className="text-[11.5px] leading-relaxed mb-0"
          style={{ color: isBlocked ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.38)', textDecoration: isBlocked ? 'line-through' : 'none' }}>
          {result.snippet}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between gap-3 py-2.5 mt-3 mx-0 border-t"
          style={{ borderColor: isBlocked ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)' }}>
          <span className="text-[10px] font-mono truncate flex-1 min-w-0"
            style={{ color: 'rgba(148,163,184,0.35)' }}>{result.whyReason}</span>

          {isBlocked ? (
            <span className="text-[8.5px] font-mono text-red-500/65 uppercase font-bold tracking-[0.15em] shrink-0">HIGH RISK</span>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <FooterAction
                label={bookmarkFlash.flashing ? 'Saved!' : bookmarked ? 'Saved' : 'Save'}
                active={bookmarked || bookmarkFlash.flashing}
                icon={bookmarked || bookmarkFlash.flashing ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                onClick={handleBookmark} />
              <div className="relative">
                <FooterAction
                  label={collectFlash.flashing ? 'Added!' : saved ? 'Collected' : 'Collect'}
                  active={saved || collectFlash.flashing}
                  icon={collectFlash.flashing ? <Check className="w-3 h-3" /> : <FolderPlus className="w-3 h-3" />}
                  onClick={e => { e.stopPropagation(); setColPickerOpen(v => !v); }} />
                <CollectionPicker open={colPickerOpen} onClose={() => setColPickerOpen(false)} collections={collections}
                  onAdd={handleAddToCollection} onCreateAndAdd={handleCreateAndAdd} />
              </div>
              <FooterAction label="Inspect" icon={<Shield className="w-3 h-3" />} onClick={e => { e.stopPropagation(); onInspect(); }} />
              <a href={result.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest cursor-pointer"
                style={{ color: 'rgba(200,205,210,0.42)', transition: 'color 150ms ease-out' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(200,205,210,0.82)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,205,210,0.42)')}>
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
    <button onClick={e => { e.stopPropagation(); onClick?.(e); }}
      className={twMerge('flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none',
        active ? 'text-primary/80' : 'text-muted-foreground/30 hover:text-muted-foreground/75')}>
      {icon}<span>{label}</span>
    </button>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

export function SearchResultsView() {
  const { searchQuery, investigationMode, investigations, activeInvestigationId, savedItems, navigate, sageMode, setSageMode } = useBrowserState();
  const [allResults, setAllResults]     = useState<EnrichedItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(false);
  const [provider, setProvider]         = useState<'brave' | 'duckduckgo' | 'mock'>('mock');
  const [filter, setFilter]             = useState<FilterKey>('all');
  const [inspectTarget, setInspectTarget] = useState<{ url: string; title: string; snippet: string } | null>(null);
  const [briefExpanded, setBriefExpanded] = useState(true);
  const [sageOpen, setSageOpen]           = useState(true);
  const [autoSendMsg, setAutoSendMsg]     = useState<string | null>(null);
  const [refsOpen, setRefsOpen]           = useState(false);

  const safeQuery = searchQuery ?? '';

  const doSearch = () => {
    if (!safeQuery) return;
    setLoading(true); setError(false); setFilter('all'); setVisibleCount(PAGE_SIZE);
    setBriefExpanded(true);
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
    setSageMode(false);
    setSageOpen(true);
    setAutoSendMsg(safeQuery);
    setRefsOpen(false);
    doSearch();
  }, [safeQuery]);

  const intelligence = useMemo(() => {
    if (allResults.length === 0) return null;
    return analyzeResults(
      allResults.map(r => ({ id: r.id, domain: r.domain, title: r.title, snippet: r.snippet, score: r.score, confidence: r.confidence, posture: r.posture, sourceType: r.sourceType, category: r.category })),
      safeQuery
    );
  }, [allResults, safeQuery]);

  const sageContext = useMemo(() => {
    if (!intelligence) return '';
    return [
      `Query type: ${intelligence.queryType}`,
      `Signal level: ${intelligence.signalLevel}`,
      `Agreement: ${intelligence.agreement}`,
      `Recency: ${intelligence.recencyProfile}`,
      `Source mix: ${intelligence.sourceMix}`,
      intelligence.topFindings.length ? `Findings: ${intelligence.topFindings.join('; ')}` : '',
      intelligence.disagreements.length ? `Disagreements: ${intelligence.disagreements.join('; ')}` : '',
      intelligence.keyEntities.length ? `Key entities: ${intelligence.keyEntities.join(', ')}` : '',
    ].filter(Boolean).join('\n');
  }, [intelligence]);

  const sageResults: SageResult[] = useMemo(() =>
    allResults.slice(0, 10).map(r => ({ title: r.title, domain: r.domain, snippet: r.snippet, score: r.score, confidence: r.confidence })),
    [allResults]);

  const filtered = allResults.filter(r => {
    if (filter === 'safe')   return r.posture === 'SAFE';
    if (filter === 'caution') return r.posture === 'CAUTION' || r.posture === 'UNKNOWN';
    if (filter === 'docs')   return r.sourceType === 'Documentation' || r.sourceType === 'Reference';
    if (filter === 'news')   return r.sourceType === 'News';
    if (filter === 'strict') return r.posture === 'SAFE' && r.confidence === 'high';
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
    { key: 'all', label: 'All' }, { key: 'safe', label: 'Safe' }, { key: 'caution', label: 'Review' },
    { key: 'docs', label: 'Docs' }, { key: 'news', label: 'News' },
    { key: 'strict', label: 'Strict', icon: <Lock className="w-2.5 h-2.5" /> },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">

      {/* Header — analysis-first: query + loading only */}
      <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/[0.05]"
        style={{ background: 'rgba(6,7,10,0.97)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.28)' }} />
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/35 flex-1 min-w-0">
            Signal Analysis
          </span>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: 'rgba(148,163,184,0.35)' }} />}
        </div>
        <h2 className="text-[15px] font-semibold text-foreground/85 leading-tight mt-1 pr-4" style={{ wordBreak: 'break-word' }}>
          "{safeQuery || '—'}"
        </h2>
      </div>

      {/* Analysis Output — Sage always-on, takes all remaining space */}
      <AnimatePresence>
        <SageChat
          open={sageOpen}
          query={safeQuery} results={sageResults} context={sageContext}
          onClose={() => setSageOpen(false)}
          initialMessage={autoSendMsg}
          onClearInitialMessage={() => setAutoSendMsg(null)}
        />
      </AnimatePresence>

      {/* Investigation Mode banner */}
      {investigationMode && (() => {
        const activeInv = investigations.find(i => i.id === activeInvestigationId);
        const invSourceCount = activeInv ? savedItems.filter(s => activeInv.savedItemIds.includes(s.id)).length : 0;
        return (
          <button onClick={() => navigate('sentrix://investigations')}
            className="shrink-0 flex items-center gap-2 px-5 py-2 text-left hover:opacity-90 transition-opacity"
            style={{ background: 'rgba(56,189,248,0.05)', borderTop: '1px solid rgba(56,189,248,0.12)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: '#38BDF8' }} />
            <span className="text-[10px] font-mono tracking-[0.1em]" style={{ color: 'rgba(56,189,248,0.80)' }}>INVESTIGATION MODE</span>
            {activeInv && <span className="text-[10px] font-mono text-muted-foreground/50">· {activeInv.name} ({invSourceCount} source{invSourceCount !== 1 ? 's' : ''})</span>}
            <span className="text-[9px] font-mono ml-auto" style={{ color: 'rgba(148,163,184,0.3)' }}>Items saved will attach →</span>
          </button>
        );
      })()}

      {/* Supporting References — collapsed by default, always secondary */}
      <div className="shrink-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.055)', background: 'rgba(4,5,8,0.85)' }}>
        <button
          onClick={() => setRefsOpen(v => !v)}
          className="w-full flex items-center gap-2 px-5 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        >
          {refsOpen
            ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.35)' }} />
            : <ChevronRight className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.35)' }} />}
          <span className="text-[9px] font-mono uppercase tracking-[0.22em]" style={{ color: 'rgba(148,163,184,0.40)' }}>
            Supporting References
          </span>
          {!loading && allResults.length > 0 && (
            <span className="text-[9px] font-mono ml-1" style={{ color: 'rgba(148,163,184,0.22)' }}>
              · {allResults.length}
            </span>
          )}
          {loading && <Loader2 className="w-2.5 h-2.5 animate-spin ml-1" style={{ color: 'rgba(148,163,184,0.25)' }} />}
          <div className="ml-auto flex items-center gap-3">
            {/* Filter tabs — inside the refs toggle row */}
            {refsOpen && filters.map(f => (
              <button key={f.key} onClick={e => { e.stopPropagation(); setFilter(f.key); }}
                className={twMerge('flex items-center gap-1 text-[9px] font-mono tracking-wide transition-all cursor-pointer px-1.5 py-0.5 rounded',
                  filter === f.key
                    ? 'text-foreground/70'
                    : 'text-muted-foreground/28 hover:text-muted-foreground/55')}>
                {f.icon}{f.label}
                <span className={twMerge('text-[8px] font-bold tabular-nums', filter === f.key ? 'text-primary/55' : 'text-muted-foreground/18')}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
        </button>
      </div>

      {/* References panel — visible only when refsOpen */}
      <AnimatePresence>
        {refsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="shrink-0 overflow-hidden"
            style={{ maxHeight: '340px' }}
          >
            <div className="overflow-y-auto px-5 py-3 flex flex-col gap-2" style={{ maxHeight: '340px' }}>
              {!loading && error && allResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500/50" />
                    <span className="text-[11px] font-mono text-muted-foreground/40">
                      Reference sources unavailable
                    </span>
                  </div>
                  <button onClick={() => doSearch()}
                    className="px-3 py-1.5 text-[11px] font-mono rounded border cursor-pointer transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(200,205,210,0.80)', background: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
                    Retry
                  </button>
                </div>
              )}
              {!loading && allResults.length > 0 && filtered.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground/28 font-mono text-[11px]">— no references match this filter —</p>
                </div>
              )}
              {!loading && allResults.length > 0 && visible.map((r, i) => (
                <ResultCard key={r.id} result={r} index={i}
                  onInspect={() => setInspectTarget({ url: r.url, title: r.title, snippet: r.snippet })}
                  tier={intelligence?.signalTiers.get(r.id)}
                  compare={intelligence?.compareTheseIds.includes(r.id) && intelligence?.signalTiers.get(r.id) !== 'primary'} />
              ))}
              {!loading && allResults.length > 0 && hasMore && (
                <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="w-full py-2 text-[11px] font-mono rounded border cursor-pointer transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(148,163,184,0.45)', background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(200,205,210,0.75)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(148,163,184,0.45)'; }}>
                  Load more — {filtered.length - visibleCount} remaining
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inspect drawer */}
      <AnimatePresence>
        {inspectTarget && (
          <InspectDrawer url={inspectTarget.url} title={inspectTarget.title} snippet={inspectTarget.snippet}
            onClose={() => setInspectTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
