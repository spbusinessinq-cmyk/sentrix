/**
 * BLACKDOG Security Analysis Engine — Mock Service Layer
 *
 * This module provides the analysis interface for the BLACKDOG engine.
 * The current implementation is a heuristic mock. It is structured so
 * that `analyzeUrl()` and `classifyInput()` can later be replaced with
 * real backend/API calls without changing the calling code.
 */

export type RiskLevel = 'safe' | 'caution' | 'danger' | 'unknown';

export interface BlackdogData {
  trackers: number;
  scripts: number;
  redirects: number;
  findings: string[];
  certificate: string;
  hsts: boolean;
  fingerprinting: boolean;
  mixedContent: boolean;
}

export type PageType =
  | 'newtab'
  | 'search'
  | 'website'
  | 'history'
  | 'downloads'
  | 'privacy'
  | 'vault'
  | 'settings';

// ─── Domain reputation lists (mock — future: pull from BLACKDOG backend) ───────

const SAFE_DOMAINS = [
  'google.com', 'wikipedia.org', 'github.com',
  'sentra.browser', 'docs.sentra',
  'mozilla.org', 'apple.com', 'microsoft.com',
  'cloudflare.com', 'stackoverflow.com',
  'npmjs.com', 'nodejs.org', 'react.dev',
  'tailwindcss.com', 'typescript-lang.org',
];

const DANGER_PATTERNS = [
  'crack', 'keygen', 'free-download', 'login-verify', 'crypto-network',
  'payload', 'malware', 'phishing', 'danger-zone', 'unknown-source',
  'free-vpn',
];

const CAUTION_PATTERNS = [
  'free', 'download', 'promo', 'deal', 'track', 'analytics', 'technews',
];

// ─── Core analysis function ────────────────────────────────────────────────────

export function analyzeUrl(url: string): { riskLevel: RiskLevel; blackdog: BlackdogData } {
  const lower = url.toLowerCase().trim();

  // Internal Sentra protocol — always safe
  if (lower.startsWith('sentra://')) {
    return {
      riskLevel: 'safe',
      blackdog: {
        trackers: 0, scripts: 0, redirects: 0,
        findings: ['Internal Sentra page — fully trusted'],
        certificate: 'Internal', hsts: true, fingerprinting: false, mixedContent: false,
      },
    };
  }

  // Empty / null guard
  if (!lower) {
    return {
      riskLevel: 'unknown',
      blackdog: {
        trackers: 0, scripts: 0, redirects: 0,
        findings: ['No URL provided'],
        certificate: 'N/A', hsts: false, fingerprinting: false, mixedContent: false,
      },
    };
  }

  // Known danger patterns — block immediately
  if (DANGER_PATTERNS.some(p => lower.includes(p))) {
    return {
      riskLevel: 'danger',
      blackdog: {
        trackers: 8, scripts: 12, redirects: 5,
        findings: [
          'Known malicious domain signature detected',
          'Automated payload scripts active on landing page',
          'Multiple redirect chains intercepted',
          'Data harvesting fingerprint confirmed',
        ],
        certificate: 'Invalid / Self-signed',
        hsts: false, fingerprinting: true, mixedContent: true,
      },
    };
  }

  // HTTP — unencrypted connection
  if (lower.startsWith('http://')) {
    return {
      riskLevel: 'caution',
      blackdog: {
        trackers: 2, scripts: 4, redirects: 1,
        findings: [
          'Non-HTTPS connection — traffic unencrypted',
          'Third-party analytics scripts detected',
          'No HSTS policy enforced',
        ],
        certificate: 'None — HTTP only',
        hsts: false, fingerprinting: false, mixedContent: true,
      },
    };
  }

  // Safe known domains
  if (SAFE_DOMAINS.some(d => lower.includes(d))) {
    return {
      riskLevel: 'safe',
      blackdog: {
        trackers: 0, scripts: 1, redirects: 0,
        findings: [
          'Verified domain — trusted source',
          'TLS 1.3 certificate validated',
          'No tracking scripts detected',
        ],
        certificate: 'TLS 1.3 / Valid',
        hsts: true, fingerprinting: false, mixedContent: false,
      },
    };
  }

  // Caution-level patterns
  if (CAUTION_PATTERNS.some(p => lower.includes(p))) {
    return {
      riskLevel: 'caution',
      blackdog: {
        trackers: 3, scripts: 6, redirects: 1,
        findings: [
          'Moderate-risk domain patterns detected',
          'Third-party analytics and tracking present',
          'Mixed reputation signals — proceed with caution',
        ],
        certificate: 'TLS 1.2 / Valid',
        hsts: true, fingerprinting: false, mixedContent: false,
      },
    };
  }

  // Unknown domain — no reputation data
  return {
    riskLevel: 'unknown',
    blackdog: {
      trackers: 1, scripts: 2, redirects: 0,
      findings: [
        'Domain reputation unverified',
        'Standard script load detected',
        'No known threat signatures matched',
      ],
      certificate: 'TLS 1.3 / Valid',
      hsts: true, fingerprinting: false, mixedContent: false,
    },
  };
}

// ─── Input classification ───────────────────────────────────────────────────────

const INTERNAL_PAGES: Record<string, PageType> = {
  newtab: 'newtab', history: 'history', vault: 'vault',
  settings: 'settings', privacy: 'privacy', downloads: 'downloads',
  search: 'search',
};

/**
 * Classify raw user input into a navigable intent.
 * Future: may call a backend classification API.
 */
export function classifyInput(input: string): {
  pageType: PageType; url: string; searchQuery: string;
} {
  const trimmed = (input ?? '').trim();

  // Empty — go home
  if (!trimmed) {
    return { pageType: 'newtab', url: 'sentra://newtab', searchQuery: '' };
  }

  // Internal sentra:// protocol
  if (trimmed.startsWith('sentra://')) {
    const path = trimmed.replace('sentra://', '').split('?')[0].toLowerCase();
    const pageType: PageType = INTERNAL_PAGES[path] ?? 'newtab';
    const searchQuery = trimmed.includes('?q=')
      ? decodeURIComponent(trimmed.split('?q=')[1] ?? '')
      : '';
    return { pageType, url: trimmed, searchQuery };
  }

  // Legacy vero:// — transparently upgrade to sentra://
  if (trimmed.startsWith('vero://')) {
    const upgraded = trimmed.replace('vero://', 'sentra://');
    return classifyInput(upgraded);
  }

  // IP address (v4)
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(trimmed)) {
    return { pageType: 'website', url: `http://${trimmed}`, searchQuery: '' };
  }

  // URL with explicit scheme
  if (/^https?:\/\//.test(trimmed)) {
    return { pageType: 'website', url: trimmed, searchQuery: '' };
  }

  // Domain-like pattern without scheme — auto-upgrade to https://
  // Must have a dot and no spaces, and look like a real TLD
  const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/;
  if (!trimmed.includes(' ') && domainPattern.test(trimmed)) {
    return { pageType: 'website', url: `https://${trimmed}`, searchQuery: '' };
  }

  // Fallback: treat as a search query
  return {
    pageType: 'search',
    url: `sentra://search?q=${encodeURIComponent(trimmed)}`,
    searchQuery: trimmed,
  };
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

export function getDomainTitle(url: string): string {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const u = new URL(normalized);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('sentra://')) return trimmed;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
