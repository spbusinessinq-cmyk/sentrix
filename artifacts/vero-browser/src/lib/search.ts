import { apiUrl } from './api-client';

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
  // ── Tier 1: Primary reference & authoritative ─────────────────────────────
  { pattern: 'wikipedia.org',         risk: 'safe',    category: 'web',  scoreBoost: 32, whyReason: 'High-authority reference source',                       bdSummary: 'Known trusted domain' },
  { pattern: 'britannica.com',        risk: 'safe',    category: 'web',  scoreBoost: 30, whyReason: 'Authoritative encyclopedia — editorial standards',       bdSummary: 'Known trusted domain' },
  // ── Tier 1: Primary news wires ────────────────────────────────────────────
  { pattern: 'reuters.com',           risk: 'safe',    category: 'news', scoreBoost: 30, whyReason: 'Reuters — primary international news wire',              bdSummary: 'Known trusted domain' },
  { pattern: 'apnews.com',            risk: 'safe',    category: 'news', scoreBoost: 30, whyReason: 'Associated Press — primary news wire',                  bdSummary: 'Known trusted domain' },
  { pattern: 'bbc.com',              risk: 'safe',    category: 'news', scoreBoost: 28, whyReason: 'BBC — established international broadcaster',            bdSummary: 'Known trusted domain' },
  { pattern: 'bbc.co.uk',           risk: 'safe',    category: 'news', scoreBoost: 28, whyReason: 'BBC — established international broadcaster',            bdSummary: 'Known trusted domain' },
  { pattern: 'nytimes.com',           risk: 'safe',    category: 'news', scoreBoost: 26, whyReason: 'New York Times — established news source',               bdSummary: 'Known trusted domain' },
  { pattern: 'washingtonpost.com',    risk: 'safe',    category: 'news', scoreBoost: 26, whyReason: 'Washington Post — established news source',              bdSummary: 'Known trusted domain' },
  { pattern: 'theguardian.com',       risk: 'safe',    category: 'news', scoreBoost: 25, whyReason: 'The Guardian — established international news source',   bdSummary: 'Known trusted domain' },
  { pattern: 'npr.org',               risk: 'safe',    category: 'news', scoreBoost: 26, whyReason: 'NPR — public broadcast, editorial standards',            bdSummary: 'Known trusted domain' },
  { pattern: 'pbs.org',               risk: 'safe',    category: 'news', scoreBoost: 24, whyReason: 'PBS — public broadcast, editorial standards',            bdSummary: 'Known trusted domain' },
  { pattern: 'politico.com',          risk: 'safe',    category: 'news', scoreBoost: 22, whyReason: 'Politico — political reporting, editorial standards',    bdSummary: 'Known trusted domain' },
  { pattern: 'ft.com',                risk: 'safe',    category: 'news', scoreBoost: 25, whyReason: 'Financial Times — established financial news',           bdSummary: 'Known trusted domain' },
  { pattern: 'wsj.com',               risk: 'safe',    category: 'news', scoreBoost: 25, whyReason: 'Wall Street Journal — established financial news',       bdSummary: 'Known trusted domain' },
  { pattern: 'economist.com',         risk: 'safe',    category: 'news', scoreBoost: 25, whyReason: 'The Economist — editorial standards',                   bdSummary: 'Known trusted domain' },
  // ── Tier 2: Developer documentation ──────────────────────────────────────
  { pattern: 'developer.mozilla.org', risk: 'safe',    category: 'docs', scoreBoost: 28, whyReason: 'MDN — authoritative web developer reference',           bdSummary: 'Recognized documentation domain' },
  { pattern: 'stackoverflow.com',     risk: 'safe',    category: 'docs', scoreBoost: 18, whyReason: 'Stack Overflow — peer-reviewed developer Q&A',          bdSummary: 'Recognized developer domain' },
  { pattern: 'npmjs.com',             risk: 'safe',    category: 'docs', scoreBoost: 20, whyReason: 'npm — official Node.js package registry',               bdSummary: 'Recognized documentation domain' },
  { pattern: 'nodejs.org',            risk: 'safe',    category: 'docs', scoreBoost: 22, whyReason: 'Official Node.js documentation',                        bdSummary: 'Recognized documentation domain' },
  { pattern: 'react.dev',             risk: 'safe',    category: 'docs', scoreBoost: 22, whyReason: 'Official React documentation',                          bdSummary: 'Recognized documentation domain' },
  { pattern: 'pkg.go.dev',            risk: 'safe',    category: 'docs', scoreBoost: 22, whyReason: 'Official Go package documentation',                     bdSummary: 'Recognized documentation domain' },
  { pattern: 'docs.',                 risk: 'safe',    category: 'docs', scoreBoost: 18, whyReason: 'Developer documentation',                               bdSummary: 'Recognized documentation domain' },
  // ── Tier 2: Official government & academic ────────────────────────────────
  { pattern: '.gov',                  risk: 'safe',    category: 'web',  scoreBoost: 35, whyReason: 'Official government source — high authority',            bdSummary: 'Government source' },
  { pattern: '.edu',                  risk: 'safe',    category: 'web',  scoreBoost: 30, whyReason: 'Academic institution — high authority',                  bdSummary: 'Academic source' },
  { pattern: 'who.int',               risk: 'safe',    category: 'web',  scoreBoost: 32, whyReason: 'World Health Organization — authoritative health data',  bdSummary: 'International authority' },
  { pattern: 'un.org',                risk: 'safe',    category: 'web',  scoreBoost: 30, whyReason: 'United Nations — international authority',               bdSummary: 'International authority' },
  // ── Tier 3: Official tech companies ──────────────────────────────────────
  { pattern: 'microsoft.com',         risk: 'safe',    category: 'web',  scoreBoost: 18, whyReason: 'Official Microsoft resource',                           bdSummary: 'Known trusted domain' },
  { pattern: 'apple.com',             risk: 'safe',    category: 'web',  scoreBoost: 18, whyReason: 'Official Apple resource',                               bdSummary: 'Known trusted domain' },
  { pattern: 'cloudflare.com',        risk: 'safe',    category: 'web',  scoreBoost: 16, whyReason: 'Known infrastructure provider',                         bdSummary: 'Known trusted domain' },
  { pattern: 'google.com',            risk: 'safe',    category: 'web',  scoreBoost:  8, whyReason: 'Search aggregation page — indirect source',             bdSummary: 'Known trusted domain' },
  { pattern: 'duckduckgo.com',        risk: 'safe',    category: 'web',  scoreBoost:  5, whyReason: 'Privacy-first search engine',                           bdSummary: 'Known trusted domain' },
  // ── GitHub: only relevant for developer queries ───────────────────────────
  { pattern: 'github.com',            risk: 'safe',    category: 'web',  scoreBoost:  6, whyReason: 'Open source repository — relevance varies by query',    bdSummary: 'Recognized developer domain' },
  // ── Community / social (lower trust) ─────────────────────────────────────
  { pattern: 'news.ycombinator',      risk: 'caution', category: 'news', scoreBoost:  3, whyReason: 'Hacker News — tech community discussion, apply judgment', bdSummary: 'User-generated content' },
  { pattern: 'youtube.com',           risk: 'caution', category: 'web',  scoreBoost: -8, whyReason: 'Video platform — verify via primary sources',           bdSummary: 'User-generated content — verify' },
  { pattern: 'reddit.com',            risk: 'caution', category: 'web',  scoreBoost:-15, whyReason: 'User-generated content — verify all claims',            bdSummary: 'User-generated content' },
  { pattern: 'quora.com',             risk: 'caution', category: 'web',  scoreBoost:-15, whyReason: 'User-generated content — verify claims',                bdSummary: 'User-generated content' },
  { pattern: 'medium.com',            risk: 'caution', category: 'web',  scoreBoost: -8, whyReason: 'Self-published blog — editorial standards vary',        bdSummary: 'Self-published content' },
  { pattern: 'substack.com',          risk: 'caution', category: 'web',  scoreBoost:-10, whyReason: 'Newsletter platform — editorial standards vary',        bdSummary: 'Self-published content' },
  { pattern: 'x.com',                 risk: 'caution', category: 'web',  scoreBoost:-20, whyReason: 'Social media post — unverified claims',                 bdSummary: 'Social media — unverified' },
  { pattern: 'twitter.com',           risk: 'caution', category: 'web',  scoreBoost:-20, whyReason: 'Social media post — unverified claims',                 bdSummary: 'Social media — unverified' },
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
  // ─── Query intent parsing (must come first) ───────────────────────────────
  const q = query.toLowerCase();
  const isDocsQuery       = /\b(how to|tutorial|guide|api|documentation|docs|reference|example|install|setup|configure|code|programming|develop)\b/.test(q);
  const isNewsQuery       = /\b(news|latest|today|breaking|current|2024|2025|2026|recently|update|happening)\b/.test(q);
  const isRefQuery        = /\b(what is|who is|define|definition|meaning|explain|overview|history of|biography|background)\b/.test(q);
  const isProceduralQuery = /\b(how to|how do|steps|recipe|make|bake|cook|build|create|fix|repair|install|setup|configure|set up)\b/.test(q);
  const isDiscussionQuery = /\b(opinion|thoughts|reddit|forum|community|recommend|advice|experience|vs|versus|compared|best)\b/.test(q);

  const domainInfo = classifyDomain(r.domain);
  let score = 50 + domainInfo.scoreBoost;
  let whyReason = domainInfo.whyReason;

  // GitHub: heavily penalized for non-technical queries
  if (r.domain.toLowerCase().includes('github.com') && !isDocsQuery) score -= 25;

  // .gov / .edu TLD boost
  const d2 = r.domain.toLowerCase();
  if (d2.endsWith('.gov') || d2.endsWith('.gov.uk') || d2.endsWith('.gov.au')) score += 8;
  if (d2.endsWith('.edu')) score += 6;

  // SEO spam heuristics
  const hyphenCount = (r.domain.match(/-/g) || []).length;
  if (hyphenCount >= 3) { score -= 15; whyReason = 'Domain pattern suggests SEO-optimised site — verify source'; }

  const spamTitlePatterns = /\b(best|top\s+\d+|review|vs\.?|versus|comparison|buy|cheap|deal|discount|coupon|free\s+trial)\b/i;
  if (spamTitlePatterns.test(r.title) && !domainInfo.matched) score -= 10;

  // Forum penalty for non-discussion queries (Reddit, Quora, etc.)
  const isForumDomain = d2.includes('reddit.com') || d2.includes('quora.com') || d2.includes('answers.') || d2.includes('forum.');
  if (isForumDomain && !isDiscussionQuery) { score -= 15; }

  // Procedural / recipe boost — reward direct answer pages
  if (isProceduralQuery) {
    const procedureBoostDomains = [
      'allrecipes.com', 'food.com', 'epicurious.com', 'seriouseats.com', 'simplyrecipes.com',
      'bbcgoodfood.com', 'delish.com', 'tasty.co', 'bonappetit.com', 'instructables.com',
      'wikihow.com', 'thespruce.com', 'thespruceeats.com', 'nytimes.com/recipes',
    ];
    if (procedureBoostDomains.some(pd => d2.includes(pd))) { score += 20; whyReason += ' — direct how-to source'; }
    // Boost domains with "recipe" or "how-to" in the URL path
    if (r.url.toLowerCase().includes('/recipe') || r.url.toLowerCase().includes('/how-to')) { score += 10; }
    // Penalize GitHub/LinkedIn/social for procedural queries
    if (d2.includes('github.com') || d2.includes('linkedin.com')) { score -= 20; }
  }

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
  const d = d2; // alias for readability
  if (isDocsQuery && (d.includes('docs.') || d.includes('developer.') || d.includes('npmjs') || d.includes('github') || d.includes('stackoverflow') || d.includes('react.dev') || d.includes('nodejs'))) {
    score += 15; whyReason += ' — boosted for your query';
  }
  if (isNewsQuery && (d.includes('reuters') || d.includes('bbc') || d.includes('apnews') || d.includes('ycombinator') || d.includes('nytimes') || d.includes('theguardian') || d.includes('washingtonpost') || d.includes('npr.org'))) {
    score += 15; whyReason += ' — boosted for your query';
  }
  if (isRefQuery && d.includes('wikipedia')) {
    score += 15; whyReason += ' — boosted for your query';
  }
  if (isProceduralQuery && (d.includes('wikihow') || d.includes('instructables') || d.includes('ehow'))) {
    score += 12; whyReason += ' — step-by-step source';
  }
  if (isDiscussionQuery && (d.includes('reddit') || d.includes('ycombinator'))) {
    score += 8; whyReason += ' — community discussion';
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

// ─── Frontend mock results (fallback when API is unreachable) ─────────────────

function isTechnicalQuery(q: string): boolean {
  return /\b(javascript|typescript|react|python|css|html|node\.?js|npm|api|function|component|code|deploy|error|bug|debug|install|package|github|git|docker|kubernetes|sql|database|aws|cloud|server|backend|frontend|webpack|vite|eslint|jest|vitest|ruby|rust|java|swift|kotlin|golang|bash|shell|terminal|regex|algorithm|recursion|dockerfile|terraform|ansible)\b/i.test(q);
}

function mockResults(query: string): Array<{
  id: number; title: string; url: string; domain: string; snippet: string; provider: 'brave' | 'duckduckgo' | 'mock';
}> {
  const q = query.trim() || 'results';
  const qEnc = encodeURIComponent(q);
  const qWiki = encodeURIComponent(q.replace(/\s+/g, '_'));

  if (isTechnicalQuery(q)) {
    return [
      { id: 1, title: `${q} — MDN Web Docs`,    url: `https://developer.mozilla.org/en-US/search?q=${qEnc}`,          domain: 'developer.mozilla.org', snippet: `Developer documentation for ${q}.`,                 provider: 'mock' },
      { id: 2, title: `${q} — Wikipedia`,        url: `https://en.wikipedia.org/wiki/${qWiki}`,                         domain: 'en.wikipedia.org',      snippet: `${q} — overview and key concepts.`,               provider: 'mock' },
      { id: 3, title: `${q} — GitHub`,           url: `https://github.com/search?q=${qEnc}&type=repositories`,          domain: 'github.com',            snippet: `Open source repositories related to ${q}.`,       provider: 'mock' },
      { id: 4, title: `${q} — Stack Overflow`,   url: `https://stackoverflow.com/search?q=${qEnc}`,                    domain: 'stackoverflow.com',     snippet: `Community answers about ${q}.`,                   provider: 'mock' },
      { id: 5, title: `${q} — npm`,              url: `https://www.npmjs.com/search?q=${qEnc}`,                         domain: 'npmjs.com',             snippet: `JavaScript packages for ${q}.`,                   provider: 'mock' },
      { id: 6, title: `${q} — Hacker News`,      url: `https://news.ycombinator.com/search?q=${qEnc}`,                 domain: 'news.ycombinator.com',  snippet: `Technical discussions about ${q}.`,               provider: 'mock' },
      { id: 7, title: `${q} — YouTube`,          url: `https://www.youtube.com/results?search_query=${qEnc}`,           domain: 'youtube.com',           snippet: `Video tutorials for ${q}.`,                       provider: 'mock' },
      { id: 8, title: `${q} — Reddit`,           url: `https://www.reddit.com/search?q=${qEnc}`,                       domain: 'reddit.com',            snippet: `Community discussions about ${q}.`,               provider: 'mock' },
      { id: 9, title: `${q} — DuckDuckGo`,       url: `https://duckduckgo.com/?q=${qEnc}`,                             domain: 'duckduckgo.com',        snippet: `Search for ${q}.`,                                provider: 'mock' },
      { id: 10, title: `${q} — Google`,          url: `https://www.google.com/search?q=${qEnc}`,                       domain: 'google.com',            snippet: `Web search for ${q}.`,                            provider: 'mock' },
    ];
  }

  return [
    { id: 1,  title: `${q} — Reuters`,       url: `https://www.reuters.com/search/news?blob=${qEnc}`,    domain: 'reuters.com',         snippet: `Breaking news and journalism about ${q} from Reuters.`,       provider: 'mock' },
    { id: 2,  title: `${q} — AP News`,       url: `https://apnews.com/search?q=${qEnc}`,                 domain: 'apnews.com',          snippet: `Associated Press reporting on ${q}. Nonpartisan, fact-based.`, provider: 'mock' },
    { id: 3,  title: `${q} — Wikipedia`,     url: `https://en.wikipedia.org/wiki/${qWiki}`,              domain: 'en.wikipedia.org',    snippet: `${q} — overview, history, and key facts.`,                    provider: 'mock' },
    { id: 4,  title: `${q} — BBC News`,      url: `https://www.bbc.com/search?q=${qEnc}`,                domain: 'bbc.com',             snippet: `BBC News coverage of ${q}.`,                                   provider: 'mock' },
    { id: 5,  title: `${q} — The Guardian`,  url: `https://www.theguardian.com/search?q=${qEnc}`,        domain: 'theguardian.com',     snippet: `In-depth reporting on ${q} from The Guardian.`,               provider: 'mock' },
    { id: 6,  title: `${q} — NPR`,           url: `https://www.npr.org/search?query=${qEnc}`,            domain: 'npr.org',             snippet: `NPR coverage and analysis of ${q}.`,                           provider: 'mock' },
    { id: 7,  title: `${q} — Bloomberg`,     url: `https://www.bloomberg.com/search?query=${qEnc}`,      domain: 'bloomberg.com',       snippet: `Business and news coverage of ${q}.`,                         provider: 'mock' },
    { id: 8,  title: `${q} — Reddit`,        url: `https://www.reddit.com/search?q=${qEnc}`,             domain: 'reddit.com',          snippet: `Community discussion about ${q}.`,                             provider: 'mock' },
    { id: 9,  title: `${q} — X / Twitter`,   url: `https://x.com/search?q=${qEnc}`,                     domain: 'x.com',               snippet: `Real-time posts about ${q}.`,                                  provider: 'mock' },
    { id: 10, title: `${q} — DuckDuckGo`,    url: `https://duckduckgo.com/?q=${qEnc}`,                   domain: 'duckduckgo.com',      snippet: `Privacy-first search for ${q}.`,                               provider: 'mock' },
  ];
}

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
  const url = apiUrl(`/api/search?q=${encodeURIComponent(query)}`);
  console.info(`[Sentrix] Search request → ${url}`);

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });

    if (!resp.ok) {
      console.error(`[Sentrix] Search API returned ${resp.status} for: ${url}`);
      return { results: rankAndProcess(mockResults(query), query), provider: 'mock', query, error: true };
    }

    // Guard against the SPA rewrite returning index.html instead of JSON.
    // This happens in production when EdgeOne cloud functions are not mounted correctly.
    const contentType = resp.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      console.error(
        `[Sentrix] /api/search is not mounted to a function; received HTML instead of JSON`
      );
      return { results: rankAndProcess(mockResults(query), query), provider: 'mock', query, error: true };
    }

    const data = await resp.json() as {
      results: Array<{ id: number; title: string; url: string; domain: string; snippet: string; provider: 'brave' | 'duckduckgo' | 'mock' }>;
      provider: 'brave' | 'duckduckgo' | 'mock';
      query: string;
      error?: boolean;
    };

    const results = rankAndProcess(data.results, query);
    toCache(query, results, data.provider);

    return { results, provider: data.provider, query, error: data.error };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error(`[Sentrix] Search timed out (12s) for: ${url}`);
    } else {
      console.error(`[Sentrix] Search failed for: ${url}`, err);
    }
    // Fall back to mock results so the UI always shows something useful.
    return { results: rankAndProcess(mockResults(query), query), provider: 'mock', query, error: true };
  }
}
