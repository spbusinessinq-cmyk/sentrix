import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, ShieldAlert, Shield, AlertTriangle,
  ExternalLink, Bookmark, BookmarkCheck, FolderPlus,
  Loader2, AlertCircle, ArrowUpRight
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
  return {
    ...r,
    posture: e.posture,
    sourceType: e.sourceType,
    reasoning: e.reasoning,
  };
}

function PostureBadge({ posture }: { posture: Posture }) {
  const c = postureColor(posture);
  const Icon = posture === 'SAFE' ? ShieldCheck : posture === 'DANGER' ? ShieldAlert : posture === 'CAUTION' ? AlertTriangle : Shield;
  return (
    <div className={twMerge('flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-[0.12em] uppercase shrink-0', c.text, c.border, c.bg)}>
      <Icon className="w-2.5 h-2.5" />
      {posture}
    </div>
  );
}

function SourceTypePill({ type }: { type: SourceType }) {
  const icon = sourceTypeIcon(type);
  return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/[0.07] bg-white/[0.03] text-[9px] font-mono text-muted-foreground/45 uppercase tracking-wider shrink-0">
      <span className="text-[8px]">{icon}</span>
      {type}
    </span>
  );
}

function ResultCard({ result, index, onInspect }: {
  result: EnrichedItem; index: number; onInspect: () => void;
}) {
  const { navigate, saveItem, isSaved, unsaveItem, savedItems, addBookmark, isBookmarked, bookmarks, removeBookmark } = useBrowserState();
  const saved = isSaved(result.url);
  const savedObj = savedItems.find(s => s.url === result.url);
  const bookmarked = isBookmarked(result.url);
  const bookmarkObj = bookmarks.find(b => b.url === result.url);
  const isBlocked = result.posture === 'DANGER';
  const c = postureColor(result.posture);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saved && savedObj) { unsaveItem(savedObj.id); return; }
    saveItem({ title: result.title, url: result.url, domain: result.domain, posture: result.posture, sourceType: result.sourceType, reasoning: result.reasoning });
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookmarked && bookmarkObj) { removeBookmark(bookmarkObj.id); return; }
    addBookmark({ title: result.title, url: result.url, domain: result.domain });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.18 }}
      className={twMerge(
        'group relative border rounded-xl overflow-hidden transition-all duration-150',
        isBlocked
          ? 'border-red-500/15 bg-black/30'
          : 'border-white/[0.05] bg-black/20 hover:bg-black/28 hover:border-white/[0.09]'
      )}
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] opacity-40 group-hover:opacity-70 transition-opacity"
        style={{ background: result.posture === 'SAFE' ? 'hsl(142 72% 40%)' : result.posture === 'CAUTION' ? '#f59e0b' : result.posture === 'DANGER' ? '#ef4444' : 'rgba(148,163,184,0.3)' }}
      />

      <div className="pl-4 pr-4 pt-4 pb-0 ml-0.5">
        {/* Domain + tags */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={twMerge('text-[10px] font-mono', c.text, 'opacity-80 truncate')}>{result.domain}</span>
          <PostureBadge posture={result.posture} />
          <SourceTypePill type={result.sourceType} />
          {result.provider === 'brave' && (
            <span className="text-[8px] font-mono text-muted-foreground/20 uppercase tracking-widest">live</span>
          )}
        </div>

        {/* Title */}
        <div
          className={twMerge(
            'text-[13px] font-semibold leading-snug mb-2',
            isBlocked ? 'text-red-400/70 line-through decoration-red-500/30' : 'text-foreground/82'
          )}
        >
          {result.title}
        </div>

        {/* Snippet */}
        <p className={twMerge('text-[12px] leading-relaxed mb-3', isBlocked ? 'text-muted-foreground/25 line-through' : 'text-foreground/45')}>
          {result.snippet}
        </p>

        {/* Footer bar */}
        <div className={twMerge(
          'flex items-center justify-between gap-3 py-2.5 px-3 mx-[-1rem] border-t',
          isBlocked ? 'border-red-500/10 bg-red-500/[0.04]' : 'border-white/[0.04] bg-black/20'
        )}>
          {/* Reasoning */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <ShieldCheck className={twMerge('w-2.5 h-2.5 shrink-0', c.text, 'opacity-60')} />
            <span className="text-[10px] font-mono text-muted-foreground/40 truncate">{result.reasoning}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!isBlocked && (
              <>
                <ResultAction
                  icon={bookmarked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                  label="Save"
                  active={bookmarked}
                  onClick={handleBookmark}
                />
                <ResultAction
                  icon={<FolderPlus className="w-3 h-3" />}
                  label="Collect"
                  active={saved}
                  onClick={handleSave}
                />
                <ResultAction
                  icon={<Shield className="w-3 h-3" />}
                  label="Inspect"
                  onClick={onInspect}
                />
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-[9px] font-mono text-primary/50 hover:text-primary uppercase tracking-widest transition-colors"
                >
                  Open <ArrowUpRight className="w-2.5 h-2.5" />
                </a>
              </>
            )}
            {isBlocked && <span className="text-[9px] font-mono text-red-500/70 uppercase font-bold tracking-widest">BLOCKED</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ResultAction({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick?.(e); }}
      className={twMerge(
        'flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest transition-colors',
        active ? 'text-primary/70' : 'text-muted-foreground/30 hover:text-muted-foreground/70'
      )}
    >
      {icon}{label}
    </button>
  );
}

export function SearchResultsView() {
  const { searchQuery, navigate } = useBrowserState();
  const [results, setResults] = useState<EnrichedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [provider, setProvider] = useState<'brave' | 'mock'>('mock');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [inspectUrl, setInspectUrl] = useState<{ url: string; title: string; snippet: string } | null>(null);

  const safeQuery = searchQuery ?? '';

  useEffect(() => {
    if (!safeQuery) return;
    setLoading(true); setError(false); setFilter('all');
    searchWeb(safeQuery).then(resp => {
      setResults(resp.results.map(enrichResult));
      setProvider(resp.provider);
      setError(!!resp.error && resp.results.length === 0);
    }).catch(() => { setError(true); setResults([]); })
     .finally(() => setLoading(false));
  }, [safeQuery]);

  const filtered = results.filter(r => {
    if (filter === 'safe')    return r.posture === 'SAFE';
    if (filter === 'caution') return r.posture === 'CAUTION' || r.posture === 'UNKNOWN';
    if (filter === 'docs')    return r.sourceType === 'Documentation' || r.sourceType === 'Reference';
    if (filter === 'news')    return r.sourceType === 'News';
    return true;
  });

  const counts = {
    all:     results.length,
    safe:    results.filter(r => r.posture === 'SAFE').length,
    caution: results.filter(r => r.posture === 'CAUTION' || r.posture === 'UNKNOWN').length,
    docs:    results.filter(r => r.sourceType === 'Documentation' || r.sourceType === 'Reference').length,
    news:    results.filter(r => r.sourceType === 'News').length,
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
      {/* Sticky header */}
      <div
        className="shrink-0 px-5 pt-4 pb-0 border-b border-white/[0.05]"
        style={{ background: 'rgba(6,7,10,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-3 h-3 text-primary/40 shrink-0" />
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/35">
                Sentrix Intelligence Search
                {provider === 'brave' && <span className="text-primary/35 ml-2">· Brave Search</span>}
              </span>
            </div>
            <h2 className="text-[15px] font-semibold text-foreground/88 leading-tight truncate">
              "{safeQuery || '—'}"
            </h2>
          </div>
          {loading ? (
            <Loader2 className="w-4 h-4 text-primary/50 animate-spin mt-1 shrink-0 ml-4" />
          ) : (
            <div className="text-right shrink-0 ml-4">
              <div className="text-[10px] font-mono text-muted-foreground/30">{results.length} results</div>
              <div className="text-[10px] font-mono text-primary/50 mt-0.5">{counts.safe} safe</div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-0.5 -mx-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={twMerge(
                'relative px-3 py-2.5 text-[11px] font-mono tracking-wide transition-all flex items-center gap-1.5',
                filter === f.key ? 'text-foreground/88' : 'text-muted-foreground/35 hover:text-muted-foreground/65'
              )}
            >
              {f.label}
              <span className={twMerge('text-[9px] font-bold tabular-nums', filter === f.key ? 'text-primary/65' : 'text-muted-foreground/25')}>
                {counts[f.key]}
              </span>
              {filter === f.key && (
                <motion.div layoutId="search-filter" className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-primary/65" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2.5">
            <Loader2 className="w-4 h-4 text-primary/50 animate-spin" />
            <span className="text-[12px] font-mono text-muted-foreground/35">Searching…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center py-12 gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500/50" />
            <span className="text-[12px] font-mono text-muted-foreground/40">Search unavailable — check your connection</span>
          </div>
        )}

        {!loading && !error && filtered.map((r, i) => (
          <ResultCard
            key={r.id}
            result={r}
            index={i}
            onInspect={() => setInspectUrl({ url: r.url, title: r.title, snippet: r.snippet })}
          />
        ))}

        {!loading && !error && filtered.length === 0 && results.length > 0 && (
          <div className="text-center py-14 text-muted-foreground/28 font-mono text-[12px]">
            — no results match this filter —
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="flex items-center gap-2 py-3 border-t border-white/[0.04] mt-2">
            <ShieldCheck className="w-3 h-3 text-primary/30" />
            <span className="text-[10px] font-mono text-muted-foreground/25">
              Results enriched with heuristic domain classification. Open externally to view live pages.
            </span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {inspectUrl && (
          <InspectDrawer
            url={inspectUrl.url}
            title={inspectUrl.title}
            snippet={inspectUrl.snippet}
            onClose={() => setInspectUrl(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
