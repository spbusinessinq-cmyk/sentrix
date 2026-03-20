/**
 * Sentrix Enrichment Layer
 * First-pass URL and result intelligence classification.
 * Uses URL patterns, protocol, keywords, domain signals.
 * No fake telemetry. No invented data.
 */

export type SourceType =
  | 'Documentation'
  | 'Reference'
  | 'News'
  | 'Forum'
  | 'Commercial'
  | 'Download'
  | 'Social'
  | 'Government'
  | 'Unknown';

export type Posture = 'SAFE' | 'CAUTION' | 'UNKNOWN' | 'DANGER';

export type Recommendation = 'Open normally' | 'Inspect before opening' | 'Use caution' | 'Avoid unless necessary';

export interface EnrichedResult {
  posture: Posture;
  sourceType: SourceType;
  reasoning: string;
  notes: string[];
  recommendation: Recommendation;
  protocol: string;
  rootDomain: string;
  isHttps: boolean;
}

// ─── Domain signal lists ────────────────────────────────────────────────────

const DOCUMENTATION_DOMAINS = [
  'developer.mozilla.org', 'docs.', 'react.dev', 'nodejs.org', 'npmjs.com',
  'typescript-lang.org', 'tailwindcss.com', 'vitejs.dev', 'webpack.js.org',
  'api.', 'readthedocs.io', 'pkg.go.dev', 'docs.python.org', 'jsr.io',
];

const REFERENCE_DOMAINS = [
  'wikipedia.org', 'wikidata.org', 'britannica.com', 'encyclopaedia.com',
  'merriam-webster.com', 'dictionary.com', 'wolframalpha.com', 'archive.org',
  'iana.org', 'rfc-editor.org',
];

const NEWS_DOMAINS = [
  'bbc.com', 'bbc.co.uk', 'reuters.com', 'apnews.com', 'theguardian.com',
  'nytimes.com', 'washingtonpost.com', 'wsj.com', 'bloomberg.com', 'ft.com',
  'techcrunch.com', 'arstechnica.com', 'wired.com', 'theverge.com',
  'news.ycombinator.com', 'economist.com', 'axios.com',
];

const FORUM_DOMAINS = [
  'reddit.com', 'stackoverflow.com', 'superuser.com', 'serverfault.com',
  'stackexchange.com', 'discord.com', 'discourse.', 'community.',
  'forums.', 'forum.', 'discuss.', 'answers.', 'ask.',
];

const TRUSTED_SAFE_DOMAINS = [
  'github.com', 'google.com', 'microsoft.com', 'apple.com', 'cloudflare.com',
  'mozilla.org', 'letsencrypt.org', 'rsrintel.com', 'sentrix.live',
];

const GOVERNMENT_DOMAINS = ['.gov', '.gov.uk', '.gc.ca', '.europa.eu', '.mil', '.edu'];

// ─── Keyword signals ─────────────────────────────────────────────────────────

const DOWNLOAD_KEYWORDS = [
  'download', 'installer', 'setup', 'release', '.zip', '.exe', '.dmg', '.msi',
  '.pkg', '.deb', '.rpm', '.tar.gz', 'free-download', 'get-', 'crack',
];

const DANGER_KEYWORDS = [
  'crack', 'keygen', 'serial-key', 'free-hack', 'cheat', 'malware', 'trojan',
];

const CAUTION_KEYWORDS = [
  'login', 'verify', 'reset-password', 'account-recovery', 'confirm-email',
  'billing', 'payment', 'checkout', 'subscribe', 'sign-in',
];

const COMMERCIAL_KEYWORDS = [
  'shop', 'store', 'buy', 'cart', 'checkout', 'product', 'pricing', 'plan',
  'subscription', '.shop',
];

// ─── Core enrichment logic ───────────────────────────────────────────────────

export function enrichUrl(url: string, title?: string, snippet?: string): EnrichedResult {
  let protocol = 'unknown';
  let rootDomain = url;
  let isHttps = false;
  let pathname = '';
  let fullText = `${url} ${title ?? ''} ${snippet ?? ''}`.toLowerCase();

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    protocol = parsed.protocol.replace(':', '');
    rootDomain = parsed.hostname.replace(/^www\./, '');
    isHttps = parsed.protocol === 'https:';
    pathname = parsed.pathname + parsed.search;
  } catch {
    rootDomain = url;
  }

  const domainLower = rootDomain.toLowerCase();
  const pathLower = pathname.toLowerCase();
  const fullLower = fullText;

  const notes: string[] = [];
  let posture: Posture = 'UNKNOWN';
  let sourceType: SourceType = 'Unknown';
  let reasoning = 'No strong domain signals identified';

  // ── Protocol check ───────────────────────────────────────────────────────
  if (protocol === 'http') {
    notes.push('Insecure protocol (HTTP) — connection not encrypted');
    posture = 'CAUTION';
  } else if (isHttps) {
    notes.push('Encrypted connection (HTTPS)');
  }

  // ── Danger signals ───────────────────────────────────────────────────────
  if (DANGER_KEYWORDS.some(k => fullLower.includes(k))) {
    posture = 'DANGER';
    reasoning = 'High-risk keyword patterns detected in URL or content';
    notes.push('Contains terms associated with malicious or piracy content');
    sourceType = 'Unknown';
    return { posture, sourceType, reasoning, notes, recommendation: 'Avoid unless necessary', protocol, rootDomain, isHttps };
  }

  // ── Source type classification ────────────────────────────────────────────

  if (GOVERNMENT_DOMAINS.some(tld => domainLower.endsWith(tld))) {
    sourceType = 'Government';
    posture = posture === 'CAUTION' ? 'CAUTION' : 'SAFE';
    reasoning = 'Government or public institution domain';
    notes.push('Registered government/institutional TLD');
  } else if (DOCUMENTATION_DOMAINS.some(d => domainLower.includes(d) || domainLower.startsWith(d))) {
    sourceType = 'Documentation';
    posture = posture === 'CAUTION' ? 'CAUTION' : 'SAFE';
    reasoning = 'Known developer documentation domain';
    notes.push('Recognized documentation or developer reference site');
  } else if (REFERENCE_DOMAINS.some(d => domainLower.includes(d))) {
    sourceType = 'Reference';
    posture = posture === 'CAUTION' ? 'CAUTION' : 'SAFE';
    reasoning = 'Established encyclopedic or reference domain';
    notes.push('Recognized reference database');
  } else if (NEWS_DOMAINS.some(d => domainLower.includes(d))) {
    sourceType = 'News';
    posture = posture === 'CAUTION' ? 'CAUTION' : 'SAFE';
    reasoning = 'Recognized news publication';
  } else if (FORUM_DOMAINS.some(d => domainLower.includes(d) || domainLower.startsWith(d))) {
    sourceType = 'Forum';
    posture = 'CAUTION';
    reasoning = 'Community or forum platform — user-generated content';
    notes.push('Content is user-submitted — apply editorial judgment');
  } else if (TRUSTED_SAFE_DOMAINS.some(d => domainLower.includes(d))) {
    sourceType = 'Reference';
    posture = posture === 'CAUTION' ? 'CAUTION' : 'SAFE';
    reasoning = 'Established trusted platform';
    notes.push('Domain recognized as a trusted platform');
  }

  // ── Download signals ──────────────────────────────────────────────────────
  if (DOWNLOAD_KEYWORDS.some(k => pathLower.includes(k) || fullLower.includes(k))) {
    if (sourceType === 'Unknown' || sourceType === 'Commercial') {
      sourceType = 'Download';
      if (posture !== 'SAFE') posture = 'CAUTION';
      reasoning = 'Download-oriented result — verify source before proceeding';
      notes.push('URL or content signals file download intent');
    }
  }

  // ── Caution keyword signals ───────────────────────────────────────────────
  if (posture !== 'DANGER' && CAUTION_KEYWORDS.some(k => pathLower.includes(k) || fullLower.includes(k))) {
    if (posture === 'SAFE') posture = 'CAUTION';
    notes.push('Login, payment, or credential-related language detected');
    if (reasoning === 'No strong domain signals identified') {
      reasoning = 'Authentication or payment path detected — verify destination';
    }
  }

  // ── Commercial signals ────────────────────────────────────────────────────
  if (sourceType === 'Unknown' && COMMERCIAL_KEYWORDS.some(k => pathLower.includes(k) || domainLower.includes(k))) {
    sourceType = 'Commercial';
    if (posture === 'UNKNOWN') posture = 'CAUTION';
    if (reasoning === 'No strong domain signals identified') {
      reasoning = 'Commercial destination — shopping or subscription context';
    }
  }

  // ── Default fallback ──────────────────────────────────────────────────────
  if (posture === 'UNKNOWN' && isHttps) {
    notes.push('No strong domain classification signals — HTTPS confirmed');
  }

  const recommendation: Recommendation =
    posture === 'DANGER'  ? 'Avoid unless necessary' :
    posture === 'CAUTION' ? 'Use caution' :
    posture === 'SAFE'    ? 'Open normally' :
    'Inspect before opening';

  return { posture, sourceType, reasoning, notes, recommendation, protocol, rootDomain, isHttps };
}

export function postureColor(posture: Posture): { text: string; border: string; bg: string } {
  return {
    SAFE:    { text: 'text-primary/80',   border: 'border-primary/20',    bg: 'bg-primary/[0.07]' },
    CAUTION: { text: 'text-amber-500/80', border: 'border-amber-500/20',  bg: 'bg-amber-500/[0.07]' },
    UNKNOWN: { text: 'text-slate-400/70', border: 'border-white/10',      bg: 'bg-white/[0.04]' },
    DANGER:  { text: 'text-red-500/80',   border: 'border-red-500/20',    bg: 'bg-red-500/[0.07]' },
  }[posture];
}

export function sourceTypeIcon(type: SourceType): string {
  const map: Record<SourceType, string> = {
    Documentation: '⊞', Reference: '◈', News: '◉', Forum: '◎',
    Commercial: '◇', Download: '↓', Social: '◐', Government: '◆', Unknown: '○',
  };
  return map[type] ?? '○';
}
