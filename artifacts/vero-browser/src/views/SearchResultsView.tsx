import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, ShieldAlert, Shield, AlertTriangle,
  ExternalLink, Bookmark, BookmarkCheck, FolderPlus, Check,
  Loader2, AlertCircle, ArrowUpRight, ChevronDown, Plus
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { searchWeb, SearchResultItem } from '@/lib/search';
import { enrichUrl, postureColor, sourceTypeIcon, Posture, SourceType } from '@/lib/enrichment';
import { InspectDrawer } from '@/components/InspectDrawer';

type FilterKey = 'all' | 'safe' | 'caution' | 'docs' | 'news';

interface EnrichedItem extends SearchResultItem {
  posture: Posture;
  sourceType: SourceType;
  reasoning: string;
}

function enrichResult(r: SearchResultItem): EnrichedItem {
  const e = enrichUrl(r.url, r.title, r.snippet);
  return { ...r, posture: e.posture, sourceType: e.sourceType, reasoning: e.reasoning };
}

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

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({
  result, index, onInspect,
}: {
  result: EnrichedItem;
  index: number;
  onInspect: () => void;
}) {
  const {
    saveItem, isSaved, unsaveItem, savedItems,
    addBookmark, isBookmarked, bookmarks, removeBookmark,
    addToCollection, createCollection, collections,
  } = useBrowserState();

  const saved = isSaved(result.url);
  const savedObj = savedItems.find(s => s.url === result.url);
  const bookmarked = isBookmarked(result.url);
  const bookmarkObj = bookmarks.find(b => b.url === result.url);
  const isBlocked = result.posture === 'DANGER';
  const c = postureColor(result.posture);

  const [colPickerOpen, setColPickerOpen] = useState(false);
  const saveFlash = useFlash();
  const bookmarkFlash = useFlash();
  const collectFlash = useFlash();

  const handleSaveItem = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saved && savedObj) { unsaveItem(savedObj.id); return; }
    saveItem({ title: result.title, url: result.url, domain: result.domain, posture: result.posture, sourceType: result.sourceType, reasoning: result.reasoning });
    saveFlash.trigger();
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookmarked && bookmarkObj) { removeBookmark(bookmarkObj.id); return; }
    addBookmark({ title: result.title, url: result.url, domain: result.domain });
    bookmarkFlash.trigger();
  };

  const handleAddToCollection = (colId: string) => {
    if (!saved) {
      saveItem({ title: result.title, url: result.url, domain: result.domain, posture: result.posture, sourceType: result.sourceType, reasoning: result.reasoning });
    }
    setTimeout(() => {
      const si = savedItems.find(s => s.url === result.url);
      if (si) addToCollection(si.id, colId);
    }, 30);
    collectFlash.trigger();
  };

  const handleCreateAndAddToCollection = (name: string) => {
    const col = createCollection(name);
    handleAddToCollection(col.id);
  };

  const accentColor =
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
        isBlocked
          ? 'border-red-500/15 bg-black/30'
          : 'border-white/[0.05] bg-black/20 hover:bg-black/28 hover:border-white/[0.09]'
      )}
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-xl opacity-35 group-hover:opacity-65 transition-opacity pointer-events-none"
        style={{ background: accentColor }}
      />

      <div className="pl-4 pr-4 pt-4 pb-0 overflow-hidden rounded-xl">
        {/* Domain + tags */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={twMerge('text-[10px] font-mono truncate', c.text)} style={{ opacity: 0.75 }}>
            {result.domain}
          </span>
          <PostureBadge posture={result.posture} />
          <SourceTypePill type={result.sourceType} />
          <ConfidenceBadge level={result.confidence} />
          {result.provider === 'brave' && (
            <span className="text-[8px] font-mono text-muted-foreground/20 uppercase tracking-widest">live</span>
          )}
        </div>

        {/* Title — click opens Inspect */}
        <button
          onClick={e => { e.stopPropagation(); if (!isBlocked) onInspect(); }}
          className={twMerge(
            'text-left w-full text-[13px] font-semibold leading-snug mb-2 block transition-colors',
            isBlocked
              ? 'text-red-400/70 line-through decoration-red-500/30 cursor-not-allowed'
              : 'text-foreground/82 hover:text-foreground/100 cursor-pointer'
          )}
          disabled={isBlocked}
          title={isBlocked ? undefined : 'Click to inspect'}
        >
          {result.title}
        </button>

        {/* Snippet */}
        <p className={twMerge(
          'text-[12px] leading-relaxed mb-0',
          isBlocked ? 'text-muted-foreground/25 line-through' : 'text-foreground/42'
        )}>
          {result.snippet}
        </p>

        {/* Footer action bar */}
        <div className={twMerge(
          'flex items-center justify-between gap-2 py-2.5 px-3 mt-3 mx-[-1rem] border-t',
          isBlocked ? 'border-red-500/10 bg-red-500/[0.04]' : 'border-white/[0.04] bg-black/20'
        )}>
          {/* Why this result */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <ShieldCheck className={twMerge('w-2.5 h-2.5 shrink-0 opacity-50', c.text)} />
            <span className="text-[10px] font-mono text-muted-foreground/45 truncate">{result.whyReason}</span>
          </div>

          {/* Action buttons */}
          {isBlocked ? (
            <span className="text-[9px] font-mono text-red-500/70 uppercase font-bold tracking-widest shrink-0">
              HIGH RISK
            </span>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              {/* Bookmark */}
              <FooterAction
                label={bookmarkFlash.flashing ? 'Saved!' : bookmarked ? 'Saved' : 'Save'}
                active={bookmarked || bookmarkFlash.flashing}
                icon={bookmarked || bookmarkFlash.flashing
                  ? <BookmarkCheck className="w-3 h-3" />
                  : <Bookmark className="w-3 h-3" />}
                onClick={handleBookmark}
              />

              {/* Collect — with per-card dropdown */}
              <div className="relative">
                <FooterAction
                  label={collectFlash.flashing ? 'Added!' : saved ? 'Collected' : 'Collect'}
                  active={saved || collectFlash.flashing}
                  icon={collectFlash.flashing
                    ? <Check className="w-3 h-3" />
                    : <FolderPlus className="w-3 h-3" />}
                  onClick={e => { e.stopPropagation(); setColPickerOpen(v => !v); }}
                />
                <CollectionPicker
                  open={colPickerOpen}
                  onClose={() => setColPickerOpen(false)}
                  collections={collections}
                  onAdd={handleAddToCollection}
                  onCreateAndAdd={handleCreateAndAddToCollection}
                />
              </div>

              {/* Inspect */}
              <FooterAction
                label="Inspect"
                icon={<Shield className="w-3 h-3" />}
                onClick={e => { e.stopPropagation(); onInspect(); }}
              />

              {/* Open externally */}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
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

function FooterAction({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick?.(e); }}
      className={twMerge(
        'flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest transition-all duration-200 cursor-pointer select-none',
        active
          ? 'text-primary/80'
          : 'text-muted-foreground/30 hover:text-muted-foreground/75'
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
  const { searchQuery } = useBrowserState();
  const [allResults, setAllResults] = useState<EnrichedItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [provider, setProvider] = useState<'brave' | 'duckduckgo' | 'mock'>('mock');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [inspectTarget, setInspectTarget] = useState<{ url: string; title: string; snippet: string } | null>(null);

  const safeQuery = searchQuery ?? '';

  const doSearch = () => {
    if (!safeQuery) return;
    setLoading(true); setError(false); setFilter('all'); setVisibleCount(PAGE_SIZE);
    searchWeb(safeQuery)
      .then(resp => {
        setAllResults(resp.results.map(enrichResult));
        setProvider(resp.provider);
        setError(!!resp.error && resp.results.length === 0);
      })
      .catch(() => { setError(true); setAllResults([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { doSearch(); }, [safeQuery]);

  const filtered = allResults.filter(r => {
    if (filter === 'safe')    return r.posture === 'SAFE';
    if (filter === 'caution') return r.posture === 'CAUTION' || r.posture === 'UNKNOWN';
    if (filter === 'docs')    return r.sourceType === 'Documentation' || r.sourceType === 'Reference';
    if (filter === 'news')    return r.sourceType === 'News';
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
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'safe',    label: 'Safe' },
    { key: 'caution', label: 'Review' },
    { key: 'docs',    label: 'Docs' },
    { key: 'news',    label: 'News' },
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
          />
        ))}

        {!loading && !error && filtered.length === 0 && allResults.length > 0 && (
          <div className="text-center py-14 text-muted-foreground/28 font-mono text-[12px]">
            — no results match this filter —
          </div>
        )}

        {/* Load more */}
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
              {provider === 'duckduckgo' ? 'DuckDuckGo Instant Answers' : provider === 'brave' ? 'Brave Search' : 'Heuristic classification'} · click title to inspect · Open visits externally
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
