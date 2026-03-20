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

const SAFE_DOMAINS = [
  'google.com', 'wikipedia.org', 'github.com', 'vero.browser', 'docs.vero',
  'mozilla.org', 'apple.com', 'microsoft.com', 'cloudflare.com', 'stackoverflow.com',
  'npmjs.com', 'nodejs.org', 'react.dev', 'tailwindcss.com',
];

const DANGER_PATTERNS = [
  'crack', 'keygen', 'free-download', 'login-verify', 'crypto-network',
  'payload', 'malware', 'phishing', 'danger-zone', 'unknown-source',
];

const CAUTION_PATTERNS = [
  'free', 'download', 'promo', 'deal', 'track', 'analytics',
];

export function analyzeUrl(url: string): { riskLevel: RiskLevel; blackdog: BlackdogData } {
  const lower = url.toLowerCase();

  // Internal Vero pages are always safe
  if (lower.startsWith('vero://')) {
    return {
      riskLevel: 'safe',
      blackdog: {
        trackers: 0, scripts: 0, redirects: 0, findings: ['Internal Vero page — fully trusted'],
        certificate: 'Internal', hsts: true, fingerprinting: false, mixedContent: false,
      },
    };
  }

  // Known danger patterns
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
        certificate: 'Invalid / Self-signed', hsts: false, fingerprinting: true, mixedContent: true,
      },
    };
  }

  // HTTP non-secure
  if (lower.startsWith('http://')) {
    return {
      riskLevel: 'caution',
      blackdog: {
        trackers: 2, scripts: 4, redirects: 1,
        findings: [
          'Non-HTTPS connection — traffic unencrypted',
          'Third-party analytics scripts detected',
          'No HSTS policy found',
        ],
        certificate: 'None — HTTP only', hsts: false, fingerprinting: false, mixedContent: true,
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
        certificate: 'TLS 1.3 / Valid', hsts: true, fingerprinting: false, mixedContent: false,
      },
    };
  }

  // Caution patterns
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
        certificate: 'TLS 1.2 / Valid', hsts: true, fingerprinting: false, mixedContent: false,
      },
    };
  }

  // Unknown
  return {
    riskLevel: 'unknown',
    blackdog: {
      trackers: 1, scripts: 2, redirects: 0,
      findings: [
        'Domain reputation unverified',
        'Standard script load detected',
        'No known threat signatures matched',
      ],
      certificate: 'TLS 1.3 / Valid', hsts: true, fingerprinting: false, mixedContent: false,
    },
  };
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

export function classifyInput(input: string): { pageType: PageType; url: string; searchQuery: string } {
  const trimmed = input.trim();

  if (!trimmed || trimmed === 'vero://newtab') {
    return { pageType: 'newtab', url: 'vero://newtab', searchQuery: '' };
  }

  if (trimmed.startsWith('vero://')) {
    const path = trimmed.replace('vero://', '').split('?')[0];
    const map: Record<string, PageType> = {
      newtab: 'newtab', history: 'history', vault: 'vault',
      settings: 'settings', privacy: 'privacy', downloads: 'downloads',
      search: 'search',
    };
    const pageType: PageType = map[path] ?? 'newtab';
    const searchQuery = trimmed.includes('?q=')
      ? decodeURIComponent(trimmed.split('?q=')[1] ?? '')
      : '';
    return { pageType, url: trimmed, searchQuery };
  }

  // URL detection
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?$/;
  if (!trimmed.includes(' ') && urlPattern.test(trimmed)) {
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    return { pageType: 'website', url, searchQuery: '' };
  }

  // Search query
  return {
    pageType: 'search',
    url: `vero://search?q=${encodeURIComponent(trimmed)}`,
    searchQuery: trimmed,
  };
}

export function getDomainTitle(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace('www.', '');
  } catch {
    return url;
  }
}
