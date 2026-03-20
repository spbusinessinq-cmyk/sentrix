export interface SearchResultItem {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  provider: 'brave' | 'mock';
  risk: 'safe' | 'caution' | 'danger' | 'unknown';
  category: 'web' | 'news' | 'docs';
  bdSummary: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  provider: 'brave' | 'mock';
  query: string;
  error?: boolean;
}

const DANGER_DOMAINS = ['free-download', 'crack', 'keygen', 'unknown-source', 'free-vpn'];
const CAUTION_DOMAINS = ['technews', 'community.dev', 'reddit.com', 'news.ycombinator'];
const TRUSTED_DOMAINS = [
  'wikipedia.org', 'github.com', 'developer.mozilla.org', 'stackoverflow.com',
  'npmjs.com', 'nodejs.org', 'react.dev', 'docs.', 'typescript-lang.org',
  'cloudflare.com', 'microsoft.com', 'apple.com',
];

function classifyDomain(domain: string): { risk: SearchResultItem['risk']; bdSummary: string; category: SearchResultItem['category'] } {
  const d = domain.toLowerCase();
  if (DANGER_DOMAINS.some(p => d.includes(p))) {
    return { risk: 'danger', bdSummary: 'High-risk domain pattern — use caution', category: 'web' };
  }
  if (TRUSTED_DOMAINS.some(p => d.includes(p))) {
    const isDocs = d.includes('docs.') || d.includes('developer.') || d.includes('mdn') || d.includes('npmjs') || d.includes('nodejs') || d.includes('react.dev');
    return { risk: 'safe', bdSummary: 'Trusted domain — heuristic classification', category: isDocs ? 'docs' : 'web' };
  }
  if (CAUTION_DOMAINS.some(p => d.includes(p))) {
    return { risk: 'caution', bdSummary: 'Domain reputation neutral — proceed with awareness', category: 'news' };
  }
  return { risk: 'unknown', bdSummary: 'Domain reputation unverified', category: 'web' };
}

function enrichResult(r: { id: number; title: string; url: string; domain: string; snippet: string; provider: 'brave' | 'mock' }): SearchResultItem {
  const { risk, bdSummary, category } = classifyDomain(r.domain);
  return { ...r, risk, bdSummary, category };
}

export async function searchWeb(query: string): Promise<SearchResponse> {
  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) throw new Error(`Search API returned ${resp.status}`);
    const data = await resp.json() as { results: Omit<SearchResultItem, 'risk' | 'bdSummary' | 'category'>[]; provider: 'brave' | 'mock'; query: string; error?: boolean };
    return {
      ...data,
      results: data.results.map(enrichResult),
    };
  } catch {
    return {
      results: [],
      provider: 'mock',
      query,
      error: true,
    };
  }
}
