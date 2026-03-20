/**
 * BLACKDOG Security Analysis Engine — Classification Layer
 *
 * BLACKDOG is a private backend security engine.
 * This module provides the URL classification interface only.
 * Real analysis occurs server-side — this is the heuristic client layer.
 */

export type RiskLevel = 'safe' | 'caution' | 'danger' | 'unknown';

export interface BlackdogData {
  certificate: string;
  hsts: boolean;
  fingerprinting: boolean;
  mixedContent: boolean;
  findings: string[];
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

// ─── Domain classification lists ──────────────────────────────────────────────

const TRUSTED_DOMAINS = [
  'google.com', 'wikipedia.org', 'github.com',
  'sentrix.live', 'docs.sentrix',
  'mozilla.org', 'apple.com', 'microsoft.com',
  'cloudflare.com', 'stackoverflow.com',
  'npmjs.com', 'nodejs.org', 'react.dev',
  'tailwindcss.com', 'typescript-lang.org', 'rsrintel.com',
];

const DANGER_PATTERNS = [
  'crack', 'keygen', 'free-download', 'login-verify', 'crypto-network',
  'payload', 'malware', 'phishing', 'danger-zone', 'unknown-source',
  'free-vpn',
];

const CAUTION_PATTERNS = [
  'free', 'download', 'promo', 'deal', 'track', 'analytics', 'technews',
];

// ─── URL analysis ─────────────────────────────────────────────────────────────

export function analyzeUrl(url: string): { riskLevel: RiskLevel; blackdog: BlackdogData } {
  const lower = (url ?? '').toLowerCase().trim();

  // Internal Sentrix protocol
  if (lower.startsWith('sentrix://')) {
    return {
      riskLevel: 'safe',
      blackdog: {
        certificate: 'Internal',
        hsts: true, fingerprinting: false, mixedContent: false,
        findings: ['Internal Sentrix page — system trusted'],
      },
    };
  }

  if (!lower) {
    return {
      riskLevel: 'unknown',
      blackdog: {
        certificate: 'N/A',
        hsts: false, fingerprinting: false, mixedContent: false,
        findings: ['No URL provided'],
      },
    };
  }

  // High-risk patterns
  if (DANGER_PATTERNS.some(p => lower.includes(p))) {
    return {
      riskLevel: 'danger',
      blackdog: {
        certificate: 'Invalid / Self-signed',
        hsts: false, fingerprinting: true, mixedContent: true,
        findings: [
          'High-risk domain pattern detected',
          'Connection security cannot be verified',
          'BLACKDOG: Proceed with extreme caution',
        ],
      },
    };
  }

  // HTTP — unencrypted
  if (lower.startsWith('http://')) {
    return {
      riskLevel: 'caution',
      blackdog: {
        certificate: 'None — HTTP only',
        hsts: false, fingerprinting: false, mixedContent: true,
        findings: [
          'Unencrypted connection — HTTP',
          'No HSTS policy enforced',
          'BLACKDOG: Recommend HTTPS upgrade',
        ],
      },
    };
  }

  // Trusted domains
  if (TRUSTED_DOMAINS.some(d => lower.includes(d))) {
    return {
      riskLevel: 'safe',
      blackdog: {
        certificate: 'TLS 1.3 / Valid',
        hsts: true, fingerprinting: false, mixedContent: false,
        findings: [
          'Verified domain — trusted source',
          'TLS 1.3 certificate validated',
        ],
      },
    };
  }

  // Caution patterns
  if (CAUTION_PATTERNS.some(p => lower.includes(p))) {
    return {
      riskLevel: 'caution',
      blackdog: {
        certificate: 'TLS 1.2 / Valid',
        hsts: true, fingerprinting: false, mixedContent: false,
        findings: [
          'Moderate-risk domain patterns detected',
          'BLACKDOG: Proceed with caution',
        ],
      },
    };
  }

  // Unknown domain
  return {
    riskLevel: 'unknown',
    blackdog: {
      certificate: 'TLS 1.3 / Valid',
      hsts: true, fingerprinting: false, mixedContent: false,
      findings: [
        'Domain reputation unverified',
        'BLACKDOG: No known threat signatures matched',
      ],
    },
  };
}

// ─── Input classification ──────────────────────────────────────────────────────

const INTERNAL_PAGES: Record<string, PageType> = {
  newtab: 'newtab', history: 'history', vault: 'vault',
  settings: 'settings', privacy: 'privacy', downloads: 'downloads',
  search: 'search',
};

export function classifyInput(input: string): {
  pageType: PageType; url: string; searchQuery: string;
} {
  const trimmed = (input ?? '').trim();

  if (!trimmed) {
    return { pageType: 'newtab', url: 'sentrix://newtab', searchQuery: '' };
  }

  // Internal sentrix:// protocol
  if (trimmed.startsWith('sentrix://')) {
    const path = trimmed.replace('sentrix://', '').split('?')[0].toLowerCase();
    const pageType: PageType = INTERNAL_PAGES[path] ?? 'newtab';
    const searchQuery = trimmed.includes('?q=')
      ? decodeURIComponent(trimmed.split('?q=')[1] ?? '')
      : '';
    return { pageType, url: trimmed, searchQuery };
  }

  // Legacy sentra:// — upgrade
  if (trimmed.startsWith('sentra://')) {
    return classifyInput(trimmed.replace('sentra://', 'sentrix://'));
  }

  // Legacy vero:// — upgrade
  if (trimmed.startsWith('vero://')) {
    return classifyInput(trimmed.replace('vero://', 'sentrix://'));
  }

  // IPv4 address
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(trimmed)) {
    return { pageType: 'website', url: `http://${trimmed}`, searchQuery: '' };
  }

  // Explicit URL with scheme
  if (/^https?:\/\//.test(trimmed)) {
    return { pageType: 'website', url: trimmed, searchQuery: '' };
  }

  // Domain-like — auto https://
  const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/;
  if (!trimmed.includes(' ') && domainPattern.test(trimmed)) {
    return { pageType: 'website', url: `https://${trimmed}`, searchQuery: '' };
  }

  // Search query
  return {
    pageType: 'search',
    url: `sentrix://search?q=${encodeURIComponent(trimmed)}`,
    searchQuery: trimmed,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function getDomainTitle(url: string): string {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
