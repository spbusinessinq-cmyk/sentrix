export interface SearchResultItem {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  provider: 'brave' | 'duckduckgo' | 'mock';
  risk: 'safe' | 'caution' | 'danger' | 'unknown';
  category: 'web' | 'news' | 'docs';
  bdSummary: string;
  // Intelligence ranking fields
  score: number;
  whyReason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SearchResponse {
  results: SearchResultItem[];
  provider: 'brave' | 'duckduckgo' | 'mock';
  query: string;
  error?: boolean;
}

// ─── Domain classification ────────────────────────────────────────────────────

interface DomainRule {
  pattern: string;
  risk: SearchResultItem['risk'];
  category: SearchResultItem['category'];
  scoreBoost: number;
  whyReason: string;
  bdSummary: string;
}

const DOMAIN_RULES: DomainRule[] = [
  { pattern: 'wikipedia.org',         risk: 'safe',    category: 'web',  scoreBoost: 30, whyReason: 'High-authority reference source',                    bdSummary: 'Known trusted domain' },
  { pattern: 'github.com',            risk: 'safe',    category: 'web',  scoreBoost: 25, whyReason: 'Open source repository — low risk',                  bdSummary: 'Recognized developer domain' },
  { pattern: 'stackoverflow.com',     risk: 'safe',    category: 'docs', scoreBoost: 20, whyReason: 'Developer Q&A — peer-reviewed answers',              bdSummary: 'Recognized developer domain' },
  { pattern: 'reuters.com',           risk: 'safe',    category: 'news', scoreBoost: 25, whyReason: 'Established news source — international standard',   bdSummary: 'Known trusted domain' },
  { pattern: 'apnews.com',            risk: 'safe',    category: 'news', scoreBoost: 25, whyReason: 'Associated Press — primary news wire',               bdSummary: 'Known trusted domain' },
  { pattern: 'bbc.com',              risk: 'safe',    category: 'news', scoreBoost: 25, whyReason: 'Established news source — BBC editorial standards',  bdSummary: 'Known trusted domain' },
  { pattern: 'bbc.co.uk',           risk: 'safe',    category: 'news', scoreBoost: 25, whyReason: 'Established news source — BBC editorial standards',  bdSummary: 'Known trusted domain' },
  { pattern: 'developer.mozilla.org', risk: 'safe',    category: 'docs', scoreBoost: 25, whyReason: 'Developer documentation — low risk',                 bdSummary: 'Recognized documentation domain' },
  { pattern: 'npmjs.com',             risk: 'safe',    category: 'docs', scoreBoost: 20, whyReason: 'Package registry — official Node.js ecosystem',      bdSummary: 'Recognized documentation domain' },
  { pattern: 'nodejs.org',            risk: 'safe',    category: 'docs', scoreBoost: 20, whyReason: 'Official Node.js documentation',                     bdSummary: 'Recognized documentation domain' },
  { pattern: 'react.dev',             risk: 'safe',    category: 'docs', scoreBoost: 20, whyReason: 'Official React documentation',                       bdSummary: 'Recognized documentation domain' },
  { pattern: 'docs.',                 risk: 'safe',    category: 'docs', scoreBoost: 20, whyReason: 'Developer documentation — low risk',                 bdSummary: 'Recognized documentation domain' },
  { pattern: 'pkg.go.dev',            risk: 'safe',    category: 'docs', scoreBoost: 20, whyReason: 'Official Go package documentation',                  bdSummary: 'Recognized documentation domain' },
  { pattern: 'microsoft.com',         risk: 'safe',    category: 'web',  scoreBoost: 15, whyReason: 'Official Microsoft resource',                        bdSummary: 'Known trusted domain' },
  { pattern: 'apple.com',             risk: 'safe',    category: 'web',  scoreBoost: 15, whyReason: 'Official Apple resource',                            bdSummary: 'Known trusted domain' },
  { pattern: 'cloudflare.com',        risk: 'safe',    category: 'web',  scoreBoost: 15, whyReason: 'Known infrastructure provider',                      bdSummary: 'Known trusted domain' },
  { pattern: 'google.com',            risk: 'safe',    category: 'web',  scoreBoost: 10, whyReason: 'Search aggregation page — indirect source',          bdSummary: 'Known trusted domain' },
  { pattern: 'duckduckgo.com',        risk: 'safe',    category: 'web',  scoreBoost:  5, whyReason: 'Privacy-first search engine',                        bdSummary: 'Known trusted domain' },
  { pattern: 'news.ycombinator',      risk: 'caution', category: 'news', scoreBoost:  5, whyReason: 'Tech community discussion — apply judgment',          bdSummary: 'User-generated content' },
  { pattern: 'youtube.com',           risk: 'caution', category: 'web',  scoreBoost: -5, whyReason: 'Video content — indirect source',                   bdSummary: 'User-generated content — verify' },
  { pattern: 'reddit.com',            risk: 'caution', category: 'web',  scoreBoost:-10, whyReason: 'User-generated content — verify claims',             bdSummary: 'User-generated content' },
  { pattern: 'quora.com',             risk: 'caution', category: 'web',  scoreBoost:-10, whyReason: 'User-generated content — verify claims',             bdSummary: 'User-generated content' },
  { pattern: 'x.com',                 risk: 'caution', category: 'web',  scoreBoost:-15, whyReason: 'Social media post — unverified claims',              bdSummary: 'Social media — unverified' },
  { pattern: 'twitter.com',           risk: 'caution', category: 'web',  scoreBoost:-15, whyReason: 'Social media post — unverified claims',              bdSummary: 'Social media — unverified' },
];

const DANGER_PATTERNS = ['free-download', 'crack', 'keygen', 'free-vpn', 'warez', 'nulled'];
const SUSPICIOUS_TLDS  = ['.xyz', '.click', '.top', '.tk', '.ml', '.cf', '.ga', '.pw'];

function classifyDomain(domain: string): Omit<DomainRule, 'pattern'> & { matched: boolean } {
  const d = domain.toLowerCase();

  // Danger check first
  if (DANGER_PATTERNS.some(p => d.includes(p))) {
    return { risk: 'danger', category: 'web', scoreBoost: -30, whyReason: 'High-risk domain pattern detected — avoid', bdSummary: 'High-risk domain pattern', matched: true };
  }

  for (const rule of DOMAIN_RULES) {
    if (d.includes(rule.pattern)) {
      return { ...rule, matched: true };
    }
  }

  return { risk: 'unknown', category: 'web', scoreBoost: 0, whyReason: 'General web result — verify before relying', bdSummary: 'Domain unverified', matched: false };
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

function scoreAndAnnotate(r: {
  id: number; title: string; url: string; domain: string; snippet: string;
  provider: 'brave' | 'duckduckgo' | 'mock';
}, query: string): SearchResultItem {
  const domainInfo = classifyDomain(r.domain);
  let score = 50 + domainInfo.scoreBoost;
  let whyReason = domainInfo.whyReason;

  // HTTPS bonus
  if (r.url.startsWith('https://')) score += 10;

  // Clean URL bonus / query spam penalty
  try {
    const u = new URL(r.url);
    const paramCount = [...u.searchParams.keys()].length;
    if (paramCount === 0) score += 5;
    if (paramCount > 3) score -= 10;
  } catch { /* ignore */ }

  // Suspicious TLD penalty
  if (SUSPICIOUS_TLDS.some(tld => r.domain.toLowerCase().endsWith(tld))) {
    score -= 20;
    whyReason = 'Suspicious TLD — exercise caution';
  }

  // Long URL penalty
  if (r.url.length > 200) score -= 10;

  // ─── Query intent boosting ─────────────────────────────────────────────────
  const q = query.toLowerCase();
  const isDocsQuery = /\b(how to|tutorial|guide|api|documentation|docs|reference|example|install|setup)\b/.test(q);
  const isNewsQuery = /\b(news|latest|today|breaking|current|2024|2025|2026|recently)\b/.test(q);
  const isRefQuery  = /\b(what is|who is|define|definition|meaning|explain|overview|history of)\b/.test(q);

  const d = r.domain.toLowerCase();
  if (isDocsQuery && (d.includes('docs.') || d.includes('developer.') || d.includes('npmjs') || d.includes('github') || d.includes('stackoverflow') || d.includes('react.dev') || d.includes('nodejs'))) {
    score += 15;
    whyReason += ' — boosted for your query';
  }
  if (isNewsQuery && (d.includes('reuters') || d.includes('bbc') || d.includes('apnews') || d.includes('ycombinator') || d.includes('nytimes'))) {
    score += 15;
    whyReason += ' — boosted for your query';
  }
  if (isRefQuery && d.includes('wikipedia')) {
    score += 15;
    whyReason += ' — boosted for your query';
  }

  score = Math.max(0, Math.min(100, score));
  const confidence: SearchResultItem['confidence'] = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';

  return {
    ...r,
    risk: domainInfo.risk,
    category: domainInfo.category,
    bdSummary: domainInfo.bdSummary,
    score,
    whyReason,
    confidence,
  };
}

// ─── Filter, deduplicate, rank, and diversify ─────────────────────────────────

// Category buckets for diversity pass
const DIVERSITY_BUCKETS = {
  reference: (d: string) => d.includes('wikipedia.org') || d.includes('britannica'),
  docs:       (d: string) => d.includes('docs.') || d.includes('developer.') || d.includes('npmjs') || d.includes('nodejs') || d.includes('react.dev') || d.includes('pkg.go.dev') || d.includes('stackoverflow'),
  news:       (d: string) => d.includes('reuters') || d.includes('bbc') || d.includes('apnews') || d.includes('ycombinator') || d.includes('nytimes'),
  forum:      (d: string) => d.includes('reddit') || d.includes('quora') || d.includes('forum'),
  official:   (d: string) => d.includes('github') || d.includes('microsoft') || d.includes('apple') || d.includes('cloudflare'),
};

type BucketKey = keyof typeof DIVERSITY_BUCKETS;

function getBucket(domain: string): BucketKey | 'other' {
  const d = domain.toLowerCase();
  for (const [key, fn] of Object.entries(DIVERSITY_BUCKETS) as [BucketKey, (d: string) => boolean][]) {
    if (fn(d)) return key;
  }
  return 'other';
}

function rankAndProcess(
  raw: Array<{ id: number; title: string; url: string; domain: string; snippet: string; provider: 'brave' | 'duckduckgo' | 'mock' }>,
  query: string
): SearchResultItem[] {
  // 1. Basic validity filter
  const valid = raw.filter(r => {
    if (!r.title || r.title.length < 2) return false;
    if (!r.url || !r.url.startsWith('http')) return false;
    if (!r.snippet || r.snippet.length < 5) return false;
    // Filter out DDG internal disambiguation pages
    try {
      const u = new URL(r.url);
      if (u.hostname === 'duckduckgo.com' || u.hostname === 'www.duckduckgo.com') return false;
    } catch { return false; }
    return true;
  });

  // 2. Score each result
  const scored = valid.map(r => scoreAndAnnotate(r, query));

  // 3. Deduplicate by domain — keep highest score per domain
  const byDomain = new Map<string, SearchResultItem>();
  for (const r of scored) {
    const existing = byDomain.get(r.domain);
    if (!existing || r.score > existing.score) {
      byDomain.set(r.domain, r);
    }
  }
  const deduped = [...byDomain.values()];

  // 4. Sort by score DESC
  deduped.sort((a, b) => b.score - a.score);

  // 5. Diversity pass for top 5 — interleave different buckets
  if (deduped.length > 5) {
    const usedBuckets = new Set<string>();
    const top5: SearchResultItem[] = [];
    const rest: SearchResultItem[] = [];

    for (const r of deduped) {
      if (top5.length >= 5) { rest.push(r); continue; }
      const bucket = getBucket(r.domain);
      if (usedBuckets.has(bucket) && bucket !== 'other') {
        rest.push(r);
      } else {
        top5.push(r);
        usedBuckets.add(bucket);
      }
    }

    // Fill up to 5 if diversity left gaps
    while (top5.length < 5 && rest.length > 0) {
      top5.push(rest.shift()!);
    }

    const final = [...top5, ...rest];
    return final.map((r, i) => ({ ...r, id: i + 1 }));
  }

  return deduped.map((r, i) => ({ ...r, id: i + 1 }));
}

// ─── In-memory search cache ──────────────────────────────────────────────────

interface CacheEntry { results: SearchResultItem[]; provider: SearchResponse['provider']; ts: number; }
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function fromCache(query: string): CacheEntry | null {
  const key = query.toLowerCase().trim();
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { CACHE.delete(key); return null; }
  return entry;
}

function toCache(query: string, results: SearchResultItem[], provider: SearchResponse['provider']): void {
  const key = query.toLowerCase().trim();
  CACHE.set(key, { results, provider, ts: Date.now() });
  if (CACHE.size > 50) {
    const oldest = [...CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) CACHE.delete(oldest[0]);
  }
}

// ─── Pending request deduplication ───────────────────────────────────────────

const PENDING = new Map<string, Promise<SearchResponse>>();

// ─── Main search function ─────────────────────────────────────────────────────

export async function searchWeb(query: string): Promise<SearchResponse> {
  const key = query.toLowerCase().trim();

  const cached = fromCache(key);
  if (cached) return { results: cached.results, provider: cached.provider, query, error: false };

  const inflight = PENDING.get(key);
  if (inflight) return inflight;

  const promise = _doSearch(query).finally(() => PENDING.delete(key));
  PENDING.set(key, promise);
  return promise;
}

async function _doSearch(query: string): Promise<SearchResponse> {
  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) throw new Error(`Search API ${resp.status}`);

    const data = await resp.json() as {
      results: Array<{ id: number; title: string; url: string; domain: string; snippet: string; provider: 'brave' | 'duckduckgo' | 'mock' }>;
      provider: 'brave' | 'duckduckgo' | 'mock';
      query: string;
      error?: boolean;
    };

    const results = rankAndProcess(data.results, query);
    toCache(query, results, data.provider);

    return { results, provider: data.provider, query, error: data.error };
  } catch {
    return { results: [], provider: 'mock', query, error: true };
  }
}
