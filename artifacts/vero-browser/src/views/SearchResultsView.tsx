import React, { useState, useMemo } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ExternalLink, Filter } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';

type Filter = 'all' | 'safe' | 'news' | 'docs';

interface SearchResult {
  id: number;
  title: string;
  domain: string;
  url: string;
  snippet: string;
  risk: 'safe' | 'caution' | 'danger' | 'unknown';
  note: string;
  category: 'safe' | 'news' | 'docs';
}

function generateResults(query: string): SearchResult[] {
  const q = query || 'results';
  return [
    {
      id: 1,
      title: `${q} — Wikipedia`,
      domain: 'wikipedia.org',
      url: `https://wikipedia.org/wiki/${encodeURIComponent(q)}`,
      snippet: `Wikipedia article covering ${q}. Community-sourced encyclopedia entry with verified citations and cross-references.`,
      risk: 'safe',
      note: '0 trackers — verified encyclopedia domain',
      category: 'docs',
    },
    {
      id: 2,
      title: `${q} — Official Documentation`,
      domain: `docs.${q.toLowerCase().replace(/\s+/g, '-')}.dev`,
      url: `https://docs.${q.toLowerCase().replace(/\s+/g, '-')}.dev`,
      snippet: `Official documentation and reference material for ${q}. Maintained by the core development team with regular updates.`,
      risk: 'safe',
      note: '0 trackers — verified official source',
      category: 'docs',
    },
    {
      id: 3,
      title: `${q} — Latest News & Updates`,
      domain: 'technews.io',
      url: `https://technews.io/search?q=${encodeURIComponent(q)}`,
      snippet: `Recent coverage and news articles related to ${q}. Aggregated from multiple editorial sources. Third-party analytics in use.`,
      risk: 'caution',
      note: '3 analytics scripts — mixed publisher tracking',
      category: 'news',
    },
    {
      id: 4,
      title: `${q} Discussion — Community Forum`,
      domain: 'community.dev',
      url: `https://community.dev/t/${encodeURIComponent(q)}`,
      snippet: `Community discussion thread about ${q}. User-generated content, moderated forum. Standard ad network active.`,
      risk: 'caution',
      note: '2 third-party scripts — ad network detected',
      category: 'news',
    },
    {
      id: 5,
      title: `Free ${q} Download — Get It Now`,
      domain: 'free-downloads.net',
      url: `http://free-downloads.net/${encodeURIComponent(q)}`,
      snippet: `Download ${q} for free. Unlimited access. No registration required. Fast servers. Click to get started immediately.`,
      risk: 'danger',
      note: 'BLACKDOG blocked 8 malicious redirects — do not enter',
      category: 'safe',
    },
    {
      id: 6,
      title: `${q} — GitHub Repository`,
      domain: 'github.com',
      url: `https://github.com/search?q=${encodeURIComponent(q)}`,
      snippet: `Open source repositories and code related to ${q}. Browse public repositories, issues, and pull requests.`,
      risk: 'safe',
      note: '0 trackers — verified developer platform',
      category: 'docs',
    },
  ];
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    safe:    { label: 'SAFE',    cls: 'text-primary border-primary/20 bg-primary/[0.06]',         Icon: ShieldCheck },
    caution: { label: 'CAUTION', cls: 'text-amber-500 border-amber-500/20 bg-amber-500/[0.06]',   Icon: AlertTriangle },
    danger:  { label: 'DANGER',  cls: 'text-red-500 border-red-500/20 bg-red-500/[0.06]',         Icon: ShieldAlert },
    unknown: { label: 'UNKNWN',  cls: 'text-muted-foreground border-white/10 bg-white/[0.04]',    Icon: ShieldCheck },
  };
  const { label, cls, Icon } = map[risk] ?? map.unknown;
  return (
    <div className={twMerge('flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold tracking-widest uppercase', cls)}>
      <Icon className="w-2.5 h-2.5" />
      {label}
    </div>
  );
}

export function SearchResultsView() {
  const { searchQuery, navigate, activeTab } = useBrowserState();
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const results = useMemo(() => generateResults(searchQuery), [searchQuery]);

  const filtered = results.filter(r => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'safe') return r.risk === 'safe';
    if (activeFilter === 'news') return r.category === 'news';
    if (activeFilter === 'docs') return r.category === 'docs';
    return true;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'safe', label: 'Safe Only' },
    { id: 'news', label: 'News' },
    { id: 'docs', label: 'Docs' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="border-b border-white/[0.05] bg-black/20 px-6 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">Deep Search Results</div>
            <h2 className="text-sm font-semibold text-foreground/90">"{searchQuery}"</h2>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/40">{filtered.length} results — secure connection</div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-muted-foreground/30 mr-1" />
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={twMerge(
                'px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition-all',
                activeFilter === f.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground/50 hover:text-muted-foreground/80 border border-transparent hover:border-white/[0.06]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-6 py-4 flex flex-col gap-3 max-w-3xl">
        {filtered.map(result => (
          <button
            key={result.id}
            onClick={() => navigate(result.url)}
            className="group w-full text-left p-4 rounded-lg border border-white/[0.05] bg-black/20 hover:bg-black/40 hover:border-white/[0.09] transition-all relative overflow-hidden"
          >
            {/* Risk accent */}
            <div className={twMerge('absolute left-0 top-0 w-0.5 h-full opacity-60 group-hover:opacity-100 transition-opacity',
              result.risk === 'safe' ? 'bg-primary' :
              result.risk === 'caution' ? 'bg-amber-500' :
              result.risk === 'danger' ? 'bg-red-500' : 'bg-muted-foreground/30'
            )} />

            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[13px] font-semibold text-foreground/90 group-hover:text-primary transition-colors truncate">
                    {result.title}
                  </h3>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity shrink-0 text-muted-foreground" />
                </div>
                <div className="text-[11px] font-mono text-muted-foreground/50 truncate">{result.url}</div>
              </div>
              <RiskBadge risk={result.risk} />
            </div>

            <p className="text-[12px] text-foreground/60 leading-relaxed mb-3 line-clamp-2">{result.snippet}</p>

            <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.05]">
              <ShieldCheck className="w-3 h-3 text-primary/50 shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground/40">
                BLACKDOG: <span className={result.risk === 'safe' ? 'text-primary/60' : result.risk === 'danger' ? 'text-red-500/70' : 'text-amber-500/70'}>{result.note}</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
