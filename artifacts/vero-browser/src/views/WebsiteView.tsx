import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert, AlertTriangle, ShieldCheck, Lock, Globe,
  ChevronRight, Hash, XCircle, Eye, ExternalLink, Loader2
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { getDomainTitle } from '@/lib/blackdog';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Structural preview content ───────────────────────────────────────────────

interface MockPage {
  pageTitle: string;
  navItems: string[];
  sections: { heading?: string; body: string }[];
  tags?: string[];
}

function getMockPage(url: string, domain: string): MockPage {
  const d = domain.toLowerCase();

  if (d.includes('wikipedia.org')) {
    const title = (() => { try { return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? 'Article').replace(/_/g, ' '); } catch { return 'Article'; } })();
    return {
      pageTitle: title,
      navItems: ['Article', 'Talk', 'Read', 'Edit source', 'View history'],
      sections: [
        { body: `Showing a structural preview of the Wikipedia article for "${title}". Click "Open in browser" above to load the live page.` },
        { heading: 'Overview', body: `${title} encompasses a broad range of concepts and has been documented across numerous peer-reviewed publications and reference works.` },
        { heading: 'History', body: `The origins of ${title} can be traced to foundational research spanning several decades. Key milestones are noted in the timeline section.` },
        { heading: 'See also', body: `Related topics, cross-linked articles, and bibliographic references are maintained by the editorial board.` },
      ],
      tags: ['Reference', 'Open Content', 'CC BY-SA'],
    };
  }

  if (d.includes('github.com')) {
    const repo = (() => { try { return new URL(url).pathname.replace(/^\//, '') || 'Search'; } catch { return 'Search'; } })();
    return {
      pageTitle: `${repo} · GitHub`,
      navItems: ['Code', 'Issues', 'Pull Requests', 'Actions', 'Insights'],
      sections: [
        { body: `Showing a structural preview for GitHub. This page cannot be embedded directly. Click "Open in browser" to load the live repository.` },
        { heading: 'Repository', body: `${repo} — open source project hosted on GitHub. Browse code, issues, PRs, and community discussions on github.com.` },
      ],
      tags: ['Open Source', 'Verified Platform'],
    };
  }

  if (d.includes('docs.') || d.includes('developer.') || d.includes('mdn')) {
    return {
      pageTitle: `Documentation — ${domain}`,
      navItems: ['Getting Started', 'API Reference', 'Examples', 'Changelog'],
      sections: [
        { body: `Showing a structural preview of the documentation site at ${domain}. Click "Open in browser" to view the live documentation.` },
        { heading: 'API Reference', body: `Full endpoint documentation, request schemas, response models, and integration guides available at ${domain}.` },
      ],
      tags: ['Documentation', 'Official'],
    };
  }

  return {
    pageTitle: domain,
    navItems: ['Home', 'About', 'Services', 'Contact'],
    sections: [
      { body: `Sentrix structural preview of ${domain}. This is a risk-classification summary, not the live page. Click "Open in browser" to load the actual site.` },
      { heading: 'Session Status', body: `Navigation to this domain has been classified and logged in your session history. Risk level and certificate status are shown in the header above.` },
    ],
    tags: undefined,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageNav({ items }: { items: string[] }) {
  const [active, setActive] = useState(items[0]);
  return (
    <div className="flex items-center gap-0 border-b border-white/[0.05] overflow-x-auto shrink-0">
      {items.map(item => (
        <button
          key={item}
          onClick={() => setActive(item)}
          className={twMerge(
            'relative px-4 py-2.5 text-[11px] font-mono whitespace-nowrap transition-colors',
            active === item ? 'text-foreground/80' : 'text-muted-foreground/40 hover:text-muted-foreground/70'
          )}
        >
          {item}
          {active === item && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-primary/60" />}
        </button>
      ))}
    </div>
  );
}

function DangerBlockPage({ domain, onDismiss }: { domain: string; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-center px-8 bg-background"
    >
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full border border-red-500/20 bg-red-500/[0.06] flex items-center justify-center">
          <ShieldAlert className="w-9 h-9 text-red-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
          <XCircle className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-red-500/60 mb-2">Sentrix — High Risk</div>
      <h2 className="text-lg font-bold text-foreground/90 mb-2">Navigation Blocked</h2>
      <p className="text-[13px] text-muted-foreground/60 mb-1 max-w-xs">
        <span className="font-mono text-red-400/80">{domain}</span> matches known high-risk domain patterns.
      </p>
      <p className="text-[12px] text-muted-foreground/40 max-w-xs leading-relaxed mb-8">
        This is a heuristic classification. If you believe this is a false positive, you can proceed at your own risk.
      </p>
      <div className="flex flex-col gap-2 items-center w-full max-w-xs">
        <button
          onClick={onDismiss}
          className="w-full px-4 py-2 rounded border border-red-500/20 bg-red-500/[0.06] text-red-400/80 text-[12px] font-mono hover:bg-red-500/10 transition-colors"
        >
          Proceed anyway (not recommended)
        </button>
        <div className="text-[10px] font-mono text-muted-foreground/30 mt-2">Classification is heuristic — not a definitive threat verdict.</div>
      </div>
    </motion.div>
  );
}

function CautionBanner({ finding }: { finding: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/[0.07] border-b border-amber-500/15 shrink-0">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <span className="text-[12px] text-amber-400/80 flex-1">
        <span className="font-semibold">Caution: </span>{finding}
      </span>
      <button onClick={() => setDismissed(true)} className="text-amber-500/40 hover:text-amber-500/70 transition-colors text-[10px] font-mono shrink-0">Dismiss</button>
    </div>
  );
}

function PageInspectionPanel({ riskLevel, blackdog, url }: { riskLevel: string; blackdog: any; url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/[0.05] bg-black/20 shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">Page Inspection</span>
          <span className={twMerge('text-[9px] font-mono font-bold uppercase tracking-widest',
            riskLevel === 'safe' ? 'text-primary/60' :
            riskLevel === 'caution' ? 'text-amber-500/60' :
            riskLevel === 'danger' ? 'text-red-500/70' : 'text-muted-foreground/40'
          )}>
            {riskLevel.toUpperCase()}
          </span>
        </div>
        <ChevronRight className={twMerge('w-3 h-3 text-muted-foreground/30 transition-transform', open && 'rotate-90')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-white/[0.04]">
              <div className="col-span-2 pt-3 pb-1 text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest">Heuristic Classification</div>
              {[
                ['Certificate',    blackdog.certificate,                            blackdog.certificate.includes('None') || blackdog.certificate.includes('Invalid')],
                ['HSTS',           blackdog.hsts ? 'Enforced' : 'Not found',        !blackdog.hsts],
                ['Mixed Content',  blackdog.mixedContent ? 'Detected' : 'None',     blackdog.mixedContent],
                ['Fingerprinting', blackdog.fingerprinting ? 'Detected' : 'None',   blackdog.fingerprinting],
              ].map(([k, v, warn]) => (
                <div key={String(k)} className="flex items-center justify-between py-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground/40">{k}</span>
                  <span className={twMerge('text-[10px] font-mono', warn ? 'text-amber-500/70' : 'text-primary/60')}>{v}</span>
                </div>
              ))}
              <div className="col-span-2 pt-2 border-t border-white/[0.04]">
                {blackdog.findings.map((f: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-0.5">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                    <span className="text-[10px] font-mono text-muted-foreground/45">{f}</span>
                  </div>
                ))}
              </div>
              <div className="col-span-2 pt-2 border-t border-white/[0.04] text-[9px] font-mono text-muted-foreground/25 leading-relaxed">
                Classification is heuristic — based on URL patterns and domain signals, not live page analysis.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Iframe rendering attempt ─────────────────────────────────────────────────

type IframeState = 'loading' | 'loaded' | 'blocked' | 'error';

function IframeView({ url, domain }: { url: string; domain: string }) {
  const [iframeState, setIframeState] = useState<IframeState>('loading');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setIframeState('loading');
    // Give the iframe 8 seconds to determine its state
    timeoutRef.current = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        // If we can access contentDocument and it's empty → blocked by X-Frame-Options
        const doc = iframe.contentDocument;
        if (!doc || doc.body.innerHTML === '') {
          setIframeState('blocked');
        } else {
          setIframeState('loaded');
        }
      } catch {
        // Cross-origin access denied → iframe loaded real content (CORS prevents reading it)
        setIframeState('loaded');
      }
    }, 3000);
    return () => clearTimeout(timeoutRef.current);
  }, [url]);

  const handleLoad = () => {
    clearTimeout(timeoutRef.current);
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc || doc.body.innerHTML === '') {
        setIframeState('blocked');
      } else {
        setIframeState('loaded');
      }
    } catch {
      // Cross-origin but loaded → real page
      setIframeState('loaded');
    }
  };

  const handleError = () => {
    clearTimeout(timeoutRef.current);
    setIframeState('error');
  };

  if (iframeState === 'blocked' || iframeState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-5">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Globe className="w-6 h-6 text-muted-foreground/30" />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-foreground/60 mb-2">{domain} cannot be embedded</div>
          <div className="text-[11px] font-mono text-muted-foreground/40 max-w-xs leading-relaxed">
            This site restricts embedding (X-Frame-Options or CSP). This is common for most modern websites and is not a Sentrix limitation.
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/20 bg-primary/[0.08] text-primary/80 text-[12px] font-mono hover:bg-primary/[0.12] transition-colors"
        >
          Open {domain} in browser <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <div className="text-[10px] font-mono text-muted-foreground/25">Opens in your default browser outside of Sentrix</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {iframeState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex items-center gap-2 text-[12px] font-mono text-muted-foreground/40">
            <Loader2 className="w-4 h-4 animate-spin text-primary/50" />
            Loading {domain}…
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        title={domain}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function WebsiteView() {
  const { activeTab } = useBrowserState();
  const { url, riskLevel, blackdog } = activeTab;
  const domain = getDomainTitle(url);
  const mockPage = getMockPage(url, domain);
  const [dangerDismissed, setDangerDismissed] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'live'>('preview');

  const key = url;

  if (riskLevel === 'danger' && !dangerDismissed) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div key={key} className="flex-1">
          <DangerBlockPage domain={domain} onDismiss={() => setDangerDismissed(true)} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key={key}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="h-full flex flex-col bg-background overflow-hidden"
    >
      {/* Risk banners */}
      {riskLevel === 'danger' && dangerDismissed && (
        <div className="flex items-center gap-3 px-5 py-2 bg-red-500/10 border-b border-red-500/20 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-[11px] font-mono text-red-400/80 flex-1">
            <span className="font-bold">HIGH RISK — </span>Heuristic classification. Viewing with warnings.
          </span>
        </div>
      )}
      {riskLevel === 'caution' && <CautionBanner finding={blackdog.findings[0]} />}

      {/* URL header bar */}
      <div className={twMerge(
        'flex items-center gap-3 px-5 py-2 border-b shrink-0',
        riskLevel === 'safe' ? 'border-white/[0.05] bg-black/20' :
        riskLevel === 'caution' ? 'border-amber-500/10 bg-black/20' :
        'border-red-500/10 bg-black/20'
      )}>
        <div className="flex items-center gap-1.5 shrink-0">
          {riskLevel === 'safe' || riskLevel === 'unknown'
            ? <Lock className="w-3 h-3 text-primary/60" />
            : <ShieldAlert className="w-3 h-3 text-amber-500/70" />
          }
          {!url.startsWith('http://') && (
            <span className="text-[10px] font-mono text-primary/40">https://</span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-1 min-w-0 font-mono text-[12px]">
          <span className="text-foreground/70 font-medium">{domain}</span>
          <span className="text-muted-foreground/30">
            {(() => { try { const path = new URL(url).pathname; return path !== '/' ? path : ''; } catch { return ''; } })()}
          </span>
        </div>

        {/* View mode toggle */}
        <div
          className="flex items-center rounded border border-white/[0.06] overflow-hidden shrink-0"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <button
            onClick={() => setViewMode('preview')}
            className={twMerge(
              'px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors',
              viewMode === 'preview' ? 'text-primary/80 bg-primary/[0.08]' : 'text-muted-foreground/40 hover:text-muted-foreground/70'
            )}
          >
            Preview
          </button>
          <button
            onClick={() => setViewMode('live')}
            className={twMerge(
              'px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors border-l border-white/[0.06]',
              viewMode === 'live' ? 'text-primary/80 bg-primary/[0.08]' : 'text-muted-foreground/40 hover:text-muted-foreground/70'
            )}
          >
            Live
          </button>
        </div>

        <div className={twMerge('px-2 py-0.5 rounded border text-[9px] font-bold font-mono tracking-wider uppercase shrink-0',
          riskLevel === 'safe' ? 'text-primary border-primary/20 bg-primary/[0.06]' :
          riskLevel === 'caution' ? 'text-amber-500 border-amber-500/20 bg-amber-500/[0.05]' :
          riskLevel === 'danger' ? 'text-red-500 border-red-500/20 bg-red-500/[0.05]' :
          'text-muted-foreground border-white/10 bg-white/[0.03]'
        )}>
          {riskLevel}
        </div>
      </div>

      {/* Content area */}
      {viewMode === 'live' ? (
        <div className="flex-1 overflow-hidden">
          <IframeView url={url} domain={domain} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-background">
          {/* Preview banner */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.04] bg-black/30 shrink-0">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              <h1 className="text-[13px] font-semibold text-foreground/70">{mockPage.pageTitle}</h1>
              {mockPage.tags && (
                <div className="flex items-center gap-1.5">
                  {mockPage.tags.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded border border-white/[0.06] text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/[0.06] text-[10px] font-mono text-muted-foreground/50 hover:text-primary/70 hover:border-primary/20 transition-colors shrink-0"
            >
              Open in browser <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <PageNav items={mockPage.navItems} />

          <div className="flex items-center gap-1.5 px-5 py-2.5 text-[10px] font-mono text-muted-foreground/30">
            <span>{domain}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-muted-foreground/50">{mockPage.pageTitle}</span>
          </div>

          <div className="px-5 pb-6 max-w-2xl">
            {/* Structural preview notice */}
            <div className="mb-4 px-3 py-2.5 rounded border border-white/[0.06] bg-white/[0.02] flex items-start gap-2.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 mt-0.5" />
              <div className="text-[10px] font-mono text-muted-foreground/40 leading-relaxed">
                <span className="text-muted-foreground/60">Structural preview</span> — This is a Sentrix classification summary, not the live page. Switch to "Live" mode or open in browser to view the actual content.
              </div>
            </div>

            {mockPage.sections.map((section, i) => (
              <div key={i} className={twMerge('mb-5', i > 0 && 'pt-5 border-t border-white/[0.04]')}>
                {section.heading && (
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-3 h-3 text-muted-foreground/25 shrink-0" />
                    <h2 className="text-[13px] font-semibold text-foreground/60">{section.heading}</h2>
                  </div>
                )}
                <p className={twMerge(
                  'text-[13px] leading-[1.75] font-mono whitespace-pre-line',
                  section.heading ? 'text-foreground/45 pl-5' : 'text-foreground/55'
                )}>
                  {section.body}
                </p>
              </div>
            ))}

            <div className={twMerge(
              'mt-6 px-4 py-3 rounded-lg border text-[11px] font-mono leading-snug',
              riskLevel === 'safe' ? 'border-primary/10 bg-primary/[0.04] text-primary/50' :
              riskLevel === 'caution' ? 'border-amber-500/10 bg-amber-500/[0.04] text-amber-500/50' :
              'border-red-500/10 bg-red-500/[0.04] text-red-500/50'
            )}>
              <span className="font-bold tracking-widest uppercase text-[9px]">Classification</span>
              {' '}— {blackdog.findings.join(' · ')}
            </div>
          </div>
        </div>
      )}

      <PageInspectionPanel riskLevel={riskLevel} blackdog={blackdog} url={url} />
    </motion.div>
  );
}
