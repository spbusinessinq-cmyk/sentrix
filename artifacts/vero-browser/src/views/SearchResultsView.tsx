import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight,
  Shield, Cpu, Globe, Clock
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

type ActiveFilter = 'all' | 'safe' | 'news' | 'docs';

interface SearchResult {
  id: number;
  title: string;
  domain: string;
  displayDomain: string;
  url: string;
  snippet: string;
  risk: 'safe' | 'caution' | 'danger' | 'unknown';
  bdSummary: string;
  bdDetail: string;
  trackers: number;
  scripts: number;
  category: 'safe' | 'news' | 'docs';
  readTime?: string;
  resultType: string;
}

function generateResults(query: string): SearchResult[] {
  const q = query || 'results';
  const slug = q.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return [
    {
      id: 1,
      title: `${q} — Wikipedia, the free encyclopedia`,
      domain: 'wikipedia.org',
      displayDomain: 'wikipedia.org',
      url: `https://wikipedia.org/wiki/${encodeURIComponent(q)}`,
      snippet: `${q} is a concept covered extensively in this community-sourced encyclopedia entry. Includes verified citations, linked cross-references, and editorial peer review. Last edited today.`,
      risk: 'safe',
      bdSummary: '0 trackers — verified encyclopedia source',
      bdDetail: 'Domain on Sentra safe-list. TLS 1.3. No analytics, no ad network. Fully trusted.',
      trackers: 0, scripts: 1,
      category: 'docs', readTime: '8 min read', resultType: 'Encyclopedia',
    },
    {
      id: 2,
      title: `${q} · Official Documentation`,
      domain: `docs.${slug}.dev`,
      displayDomain: `docs.${slug}.dev`,
      url: `https://docs.${slug}.dev`,
      snippet: `The official documentation hub for ${q}. API references, getting started guides, changelogs, and example walkthroughs. Maintained by the core team.`,
      risk: 'safe',
      bdSummary: '0 trackers — verified official source',
      bdDetail: 'HSTS enforced. TLS 1.3. No external scripts detected. Certificate valid.',
      trackers: 0, scripts: 0,
      category: 'docs', readTime: 'Reference', resultType: 'Documentation',
    },
    {
      id: 3,
      title: `${q} — GitHub`,
      domain: 'github.com',
      displayDomain: 'github.com/search',
      url: `https://github.com/search?q=${encodeURIComponent(q)}`,
      snippet: `Open-source repositories related to ${q}. Browse code, issues, PRs, and community discussions. View dependency graphs and contributor activity.`,
      risk: 'safe',
      bdSummary: '0 trackers — verified developer platform',
      bdDetail: 'GitHub on Sentra safe-list. Minimal first-party analytics only. No cross-site tracking.',
      trackers: 0, scripts: 2,
      category: 'docs', readTime: 'Repository', resultType: 'Code',
    },
    {
      id: 4,
      title: `${q} — News, Analysis & Commentary`,
      domain: 'technews.io',
      displayDomain: 'technews.io',
      url: `https://technews.io/search?q=${encodeURIComponent(q)}`,
      snippet: `Recent editorial coverage and analysis of ${q} from multiple outlets. Aggregated articles from verified publishers. Third-party analytics scripts present.`,
      risk: 'caution',
      bdSummary: '3 analytics scripts — publisher tracking present',
      bdDetail: 'Segment.io, Google Analytics, and a third script identified. Mixed content origin. Reputation: neutral.',
      trackers: 3, scripts: 6,
      category: 'news', readTime: 'Today', resultType: 'News',
    },
    {
      id: 5,
      title: `${q} Community — Forum & Discussion`,
      domain: 'community.dev',
      displayDomain: 'community.dev',
      url: `https://community.dev/t/${encodeURIComponent(q)}`,
      snippet: `Active discussion thread about ${q} with community contributions, answers, and debate. Standard ad network active on this domain. Cookies set on load.`,
      risk: 'caution',
      bdSummary: '2 ad-network scripts — cookie risk',
      bdDetail: 'DoubleClick and a second ad SDK detected. Third-party cookies written on load. Proceed with isolation.',
      trackers: 2, scripts: 4,
      category: 'news', readTime: 'Discussion', resultType: 'Forum',
    },
    {
      id: 6,
      title: `Free ${q} Download — Unlimited Access`,
      domain: 'free-downloads.net',
      displayDomain: 'free-downloads.net',
      url: `http://free-downloads.net/${encodeURIComponent(q)}`,
      snippet: `Download ${q} completely free. No account needed. Instant access. Multiple mirrors. Fast download speeds.`,
      risk: 'danger',
      bdSummary: 'BLOCKED — 8 malicious redirects intercepted',
      bdDetail: 'Known malware distribution domain. Payload script confirmed. HTTP only — no encryption. Do not proceed.',
      trackers: 8, scripts: 12,
      category: 'safe', readTime: undefined, resultType: 'Download',
    },
  ];
}

function DomainDot({ risk, domain }: { risk: string; domain: string }) {
  const initial = domain.charAt(0).toUpperCase();
  const cls =
    risk === 'safe' ? 'bg-primary/15 text-primary/80 border-primary/20' :
    risk === 'caution' ? 'bg-amber-500/15 text-amber-500/80 border-amber-500/20' :
    risk === 'danger' ? 'bg-red-500/15 text-red-500/80 border-red-500/20' :
    'bg-white/[0.06] text-muted-foreground/50 border-white/10';
  return (
    <div className={twMerge('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 text-[11px] font-bold font-mono', cls)}>
      {initial}
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    safe:    { label: 'SAFE',    cls: 'text-primary border-primary/25 bg-primary/[0.07]',          Icon: ShieldCheck },
    caution: { label: 'CAUTION', cls: 'text-amber-500 border-amber-500/25 bg-amber-500/[0.07]',    Icon: AlertTriangle },
    danger:  { label: 'DANGER',  cls: 'text-red-500 border-red-500/25 bg-red-500/[0.07]',          Icon: ShieldAlert },
    unknown: { label: 'UNKNOWN', cls: 'text-muted-foreground border-white/[0.08] bg-white/[0.03]', Icon: Shield },
  };
  const { label, cls, Icon } = map[risk] ?? map.unknown;
  return (
    <div className={twMerge('flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold tracking-[0.12em] uppercase shrink-0', cls)}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </div>
  );
}

function ResultCard({ result, index, onClick }: { result: SearchResult; index: number; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isBlocked = result.risk === 'danger';

  const riskAccent =
    result.risk === 'safe' ? 'bg-primary' :
    result.risk === 'caution' ? 'bg-amber-500' :
    result.risk === 'danger' ? 'bg-red-500' : 'bg-muted-foreground/30';

  const cardHover = isBlocked
    ? 'hover:bg-red-500/[0.04] hover:border-red-500/20'
    : 'hover:bg-white/[0.03] hover:border-white/[0.09]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className={twMerge(
        'group relative border rounded-lg transition-all duration-150 overflow-hidden',
        isBlocked ? 'border-red-500/15 bg-black/30' : 'border-white/[0.05] bg-black/25',
        cardHover
      )}
    >
      <div className={twMerge('absolute left-0 top-0 w-[2px] h-full opacity-50 group-hover:opacity-90 transition-opacity', riskAccent)} />

      <div className="pl-4 pr-4 pt-3.5 pb-0 ml-0.5">
        <div className="flex items-start gap-3 mb-2.5">
          <DomainDot risk={result.risk} domain={result.domain} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={twMerge('text-[11px] font-mono truncate',
                result.risk === 'safe' ? 'text-primary/60' :
                result.risk === 'caution' ? 'text-amber-500/60' :
                result.risk === 'danger' ? 'text-red-500/60' : 'text-muted-foreground/50'
              )}>
                {result.displayDomain}
              </span>
              <span className="text-muted-foreground/20 text-[10px]">·</span>
              <span className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest">{result.resultType}</span>
              {result.readTime && (
                <>
                  <span className="text-muted-foreground/20 text-[10px]">·</span>
                  <span className="text-[10px] font-mono text-muted-foreground/30 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />{result.readTime}
                  </span>
                </>
              )}
            </div>

            <button
              onClick={onClick}
              className={twMerge(
                'text-[13px] font-semibold leading-snug text-left transition-colors',
                isBlocked
                  ? 'text-red-400/80 hover:text-red-400 line-through decoration-red-500/30'
                  : 'text-foreground/85 group-hover:text-foreground hover:text-primary'
              )}
            >
              {result.title}
            </button>
          </div>

          <RiskBadge risk={result.risk} />
        </div>

        <p className={twMerge(
          'text-[12px] leading-relaxed mb-3 pl-11',
          isBlocked ? 'text-red-400/40 line-through' : 'text-foreground/50'
        )}>
          {result.snippet}
        </p>

        <div className={twMerge(
          'flex items-center justify-between gap-3 py-2.5 px-3 mx-[-1rem] border-t',
          isBlocked ? 'border-red-500/10 bg-red-500/[0.04]' : 'border-white/[0.04] bg-black/20'
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className={twMerge('w-3 h-3 shrink-0',
              result.risk === 'safe' ? 'text-primary/60' :
              result.risk === 'caution' ? 'text-amber-500/60' :
              'text-red-500/60'
            )} />
            <span className={twMerge('text-[10px] font-mono truncate',
              result.risk === 'safe' ? 'text-muted-foreground/50' :
              result.risk === 'caution' ? 'text-amber-500/60' :
              'text-red-500/70 font-semibold'
            )}>
              {result.bdSummary}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground/30 flex items-center gap-1">
              <Globe className="w-2.5 h-2.5" />{result.trackers}t
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/30 flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5" />{result.scripts}s
            </span>

            {!isBlocked && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                  className="text-[10px] font-mono text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors uppercase tracking-widest"
                >
                  {expanded ? 'Less' : 'Inspect'}
                </button>
                <button
                  onClick={onClick}
                  className="flex items-center gap-1 text-[10px] font-mono text-primary/50 hover:text-primary transition-colors uppercase tracking-widest"
                >
                  Open <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </>
            )}
            {isBlocked && (
              <span className="text-[10px] font-mono text-red-500/70 uppercase tracking-widest font-bold">BLOCKED</span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && !isBlocked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="py-2.5 px-3 mx-[-1rem] border-t border-white/[0.04] bg-black/30">
                <div className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed">
                  <span className="text-primary/50 uppercase tracking-widest mr-2">BLACKDOG:</span>
                  {result.bdDetail}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function SearchResultsView() {
  const { searchQuery, navigate } = useBrowserState();
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const safeQuery = searchQuery ?? '';

  const results = useMemo(() => generateResults(safeQuery), [safeQuery]);

  const filtered = results.filter(r => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'safe') return r.risk === 'safe';
    if (activeFilter === 'news') return r.category === 'news';
    if (activeFilter === 'docs') return r.category === 'docs';
    return true;
  });

  const safeCount = results.filter(r => r.risk === 'safe').length;
  const flaggedCount = results.filter(r => r.risk !== 'safe').length;

  const filters: { id: ActiveFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: results.length },
    { id: 'safe', label: 'Safe Only', count: safeCount },
    { id: 'news', label: 'News', count: results.filter(r => r.category === 'news').length },
    { id: 'docs', label: 'Docs', count: results.filter(r => r.category === 'docs').length },
  ];

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="border-b border-white/[0.05] bg-black/25 px-6 pt-4 pb-0 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-muted-foreground/40 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-2.5 h-2.5 text-primary/50" />
              Sentra Secure Search — BLACKDOG pre-scanned
            </div>
            <h2 className="text-[15px] font-semibold text-foreground/90 leading-tight">
              "{safeQuery || '—'}"
            </h2>
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="text-[10px] font-mono text-muted-foreground/35">{results.length} results</div>
            <div className="text-[10px] font-mono mt-0.5">
              <span className="text-primary/60">{safeCount} safe</span>
              <span className="text-muted-foreground/20 mx-1">·</span>
              <span className={flaggedCount > 1 ? 'text-amber-500/60' : 'text-muted-foreground/40'}>{flaggedCount} flagged</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 -mx-1">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={twMerge(
                'relative px-3 py-2.5 text-[11px] font-mono tracking-wide transition-all flex items-center gap-1.5',
                activeFilter === f.id
                  ? 'text-foreground/90'
                  : 'text-muted-foreground/40 hover:text-muted-foreground/70'
              )}
            >
              {f.label}
              <span className={twMerge('text-[9px] font-bold tabular-nums', activeFilter === f.id ? 'text-primary/70' : 'text-muted-foreground/30')}>
                {f.count}
              </span>
              {activeFilter === f.id && (
                <motion.div layoutId="filter-underline" className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-primary/70" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-2.5 max-w-3xl">
        {filtered.map((result, i) => (
          <ResultCard
            key={result.id}
            result={result}
            index={i}
            onClick={() => navigate(result.url)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground/30 font-mono text-[12px]">
            — no results match this filter —
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-white/[0.04] flex items-center gap-3">
        <ShieldCheck className="w-3 h-3 text-primary/40" />
        <span className="text-[10px] font-mono text-muted-foreground/30">
          All results pre-analyzed by BLACKDOG. Risk assessments are heuristic — exercise independent judgment.
        </span>
      </div>
    </div>
  );
}
