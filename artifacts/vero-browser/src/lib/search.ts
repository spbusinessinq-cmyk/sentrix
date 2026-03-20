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
}

export interface SearchResponse {
  results: SearchResultItem[];
  provider: 'brave' | 'duckduckgo' | 'mock';
  query: string;
  error?: boolean;
}

// ─── Domain classification ────────────────────────────────────────────────────

const DANGER_DOMAINS = ['free-download', 'crack', 'keygen', 'free-vpn', 'warez'];
const CAUTION_DOMAINS = ['reddit.com', 'news.ycombinator', 'x.com', 'twitter.com', 'quora.com', 'youtube.com'];
const TRUSTED_DOMAINS = [
  'wikipedia.org', 'github.com', 'developer.mozilla.org', 'stackoverflow.com',
  'npmjs.com', 'nodejs.org', 'react.dev', 'docs.', 'typescript-lang.org',
  'cloudflare.com', 'microsoft.com', 'apple.com', 'google.com', 'reuters.com',
  'bbc.com', 'bbc.co.uk', 'apnews.com', 'duckduckgo.com', 'iana.org',
];
const DOC_DOMAINS = ['developer.mozilla.org', 'docs.', 'npmjs.com', 'nodejs.org', 'react.dev', 'pkg.go.dev'];

function classifyDomain(domain: string): {
  risk: SearchResultItem['risk'];
  bdSummary: string;
  category: SearchResultItem['category'];
} {
  const d = domain.toLowerCase();
  if (DANGER_DOMAINS.some(p => d.includes(p))) {
    return { risk: 'danger', bdSummary: 'High-risk domain pattern detected', category: 'web' };
  }
  if (DOC_DOMAINS.some(p => d.includes(p))) {
    return { risk: 'safe', bdSummary: 'Recognized developer documentation domain', category: 'docs' };
  }
  if (TRUSTED_DOMAINS.some(p => d.includes(p))) {
    return { risk: 'safe', bdSummary: 'Known trusted domain', category: 'web' };
  }
  if (CAUTION_DOMAINS.some(p => d.includes(p))) {
    return { risk: 'caution', bdSummary: 'User-generated content — apply judgment', category: 'news' };
  }
  return { risk: 'unknown', bdSummary: 'Domain unverified — HTTPS status pending', category: 'web' };
}

function toSearchResultItem(r: {
  id: number; title: string; url: string; domain: string; snippet: string;
  provider: 'brave' | 'duckduckgo' | 'mock';
}): SearchResultItem {
  const { risk, bdSummary, category } = classifyDomain(r.domain);
  return { ...r, risk, bdSummary, category };
}

// ─── In-memory search cache ──────────────────────────────────────────────────

interface CacheEntry { results: SearchResultItem[]; provider: SearchResponse['provider']; ts: number; }
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  // Trim cache to 50 entries
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

  // Cache hit
  const cached = fromCache(key);
  if (cached) {
    return { results: cached.results, provider: cached.provider, query, error: false };
  }

  // Deduplicate in-flight requests
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

    const results = data.results.map(toSearchResultItem);
    toCache(query, results, data.provider);

    return { results, provider: data.provider, query, error: data.error };
  } catch {
    return { results: [], provider: 'mock', query, error: true };
  }
}
