import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, ShieldCheck, Lock,
  Globe, ExternalLink, Copy, ArrowLeft, ChevronRight,
  Eye, XCircle, Loader2, Check
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { getDomainTitle } from '@/lib/blackdog';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function getPathDisplay(url: string): string {
  try {
    const { pathname, search } = new URL(url);
    const full = pathname + search;
    return full === '/' ? '' : full.length > 60 ? full.slice(0, 60) + '…' : full;
  } catch { return ''; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CautionBanner({ finding }: { finding: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-500/[0.07] border-b border-amber-500/15 shrink-0">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <span className="text-[12px] text-amber-400/80 flex-1">
        <span className="font-semibold">Caution — </span>{finding}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-500/40 hover:text-amber-500/70 transition-colors text-[10px] font-mono shrink-0"
      >
        Dismiss
      </button>
    </div>
  );
}

function DangerBlockPage({ domain, url, onDismiss, onBack }: {
  domain: string; url: string; onDismiss: () => void; onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyUrl = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-full text-center px-8 bg-background"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full border border-red-500/20 bg-red-500/[0.06] flex items-center justify-center">
          <ShieldAlert className="w-9 h-9 text-red-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
          <XCircle className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-red-500/60 mb-2">
        Sentrix — High Risk Blocked
      </div>
      <h2 className="text-lg font-bold text-foreground/90 mb-2">Navigation Blocked</h2>
      <p className="text-[13px] text-muted-foreground/60 mb-1 max-w-xs">
        <span className="font-mono text-red-400/80">{domain}</span> matches high-risk domain patterns.
      </p>
      <p className="text-[11px] font-mono text-muted-foreground/35 max-w-xs leading-relaxed mb-7">
        This classification is heuristic — based on URL patterns and domain signals, not live page analysis.
      </p>

      <div className="flex flex-col gap-2 items-center w-full max-w-xs">
        <button
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] text-foreground/60 text-[12px] font-mono hover:bg-white/[0.05] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Go back
        </button>
        <button
          onClick={copyUrl}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.07] bg-white/[0.02] text-muted-foreground/50 text-[12px] font-mono hover:bg-white/[0.04] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy URL'}
        </button>
        <button
          onClick={onDismiss}
          className="w-full px-4 py-2 rounded-lg border border-red-500/15 bg-red-500/[0.05] text-red-400/70 text-[11px] font-mono hover:bg-red-500/[0.08] transition-colors mt-1"
        >
          Proceed anyway (not recommended)
        </button>
      </div>
    </motion.div>
  );
}

function BlockedEmbedFallback({ url, domain, onBack }: { url: string; domain: string; onBack: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center h-full text-center px-8 bg-background"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Globe className="w-6 h-6 text-muted-foreground/30" />
      </div>

      <h2 className="text-[15px] font-semibold text-foreground/70 mb-2">
        {domain} cannot be shown here
      </h2>
      <p className="text-[12px] font-mono text-muted-foreground/40 max-w-sm leading-relaxed mb-1">
        This site blocks embedding using X-Frame-Options or Content Security Policy.
        This is a site-level restriction — not a Sentrix limitation.
      </p>
      <p className="text-[10px] font-mono text-muted-foreground/25 max-w-xs leading-relaxed mb-8">
        Most modern sites enforce this to protect their users. Open externally to view the page in your system browser.
      </p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/[0.08] text-primary/80 text-[12px] font-mono hover:bg-primary/[0.12] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open {domain} externally
        </a>
        <button
          onClick={copyUrl}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.07] bg-white/[0.02] text-muted-foreground/50 text-[12px] font-mono hover:bg-white/[0.05] transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy URL'}
        </button>
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-muted-foreground/40 text-[11px] font-mono hover:text-muted-foreground/70 transition-colors mt-1"
        >
          <ArrowLeft className="w-3 h-3" /> Go back
        </button>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center text-[9px] font-mono text-muted-foreground/20">
        Opens outside of Sentrix — your system browser handles the connection
      </div>
    </motion.div>
  );
}

// Honest summary — no fake site navigation, no fake page chrome
function HonestSummary({ url, domain, riskLevel, blackdog }: {
  url: string; domain: string; riskLevel: string; blackdog: any;
}) {
  const [open, setOpen] = useState(false);
  const path = getPathDisplay(url);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Classification card */}
      <div className="px-6 py-6 flex flex-col gap-4 max-w-lg mx-auto w-full">

        <div className="p-5 rounded-xl border border-white/[0.05] bg-black/20">
          <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">Page</div>
          <div className="flex items-start gap-3 mb-4">
            <Globe className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-foreground/70 break-words">{domain}</div>
              {path && <div className="text-[11px] font-mono text-muted-foreground/40 break-all mt-0.5">{path}</div>}
              <div className="text-[10px] font-mono text-muted-foreground/25 break-all mt-1">{url}</div>
            </div>
          </div>

          <div className="flex items-center justify-between py-2.5 border-t border-white/[0.04]">
            <span className="text-[10px] font-mono text-muted-foreground/40">Sentrix classification</span>
            <span className={twMerge('text-[10px] font-mono font-bold uppercase tracking-widest',
              riskLevel === 'safe'    ? 'text-primary/80' :
              riskLevel === 'caution' ? 'text-amber-500/80' :
              riskLevel === 'danger'  ? 'text-red-500/80' :
              'text-muted-foreground/60'
            )}>
              {riskLevel}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-t border-white/[0.04]">
            <span className="text-[10px] font-mono text-muted-foreground/40">Certificate</span>
            <span className="text-[10px] font-mono text-foreground/60">{blackdog.certificate}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-t border-white/[0.04]">
            <span className="text-[10px] font-mono text-muted-foreground/40">HSTS</span>
            <span className={twMerge('text-[10px] font-mono', blackdog.hsts ? 'text-primary/60' : 'text-amber-500/60')}>
              {blackdog.hsts ? 'Enforced' : 'Not found'}
            </span>
          </div>
        </div>

        {/* Findings */}
        {blackdog.findings?.length > 0 && (
          <div className="p-4 rounded-xl border border-white/[0.04] bg-black/15">
            <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/35 mb-2">Analysis</div>
            {blackdog.findings.map((f: string, i: number) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/25 mt-1.5 shrink-0" />
                <span className="text-[11px] font-mono text-muted-foreground/45 leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-[9px] font-mono text-muted-foreground/25 text-center leading-relaxed">
          Classification is heuristic — based on URL patterns and domain signals, not live page content.
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary/15 bg-primary/[0.06] text-primary/70 text-[12px] font-mono hover:bg-primary/[0.1] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open {domain} in browser
        </a>
      </div>
    </div>
  );
}

// Page inspection panel (collapsible, BLACKDOG status-only)
function PageInspectionPanel({ riskLevel, blackdog }: { riskLevel: string; blackdog: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/[0.05] bg-black/20 shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-2 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-3 h-3 text-muted-foreground/30" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/35">
            Page Inspection
          </span>
          <span className={twMerge('text-[9px] font-mono font-bold uppercase tracking-widest',
            riskLevel === 'safe'    ? 'text-primary/50' :
            riskLevel === 'caution' ? 'text-amber-500/50' :
            riskLevel === 'danger'  ? 'text-red-500/60' :
            'text-muted-foreground/35'
          )}>
            {riskLevel.toUpperCase()}
          </span>
        </div>
        <ChevronRight className={twMerge('w-3 h-3 text-muted-foreground/25 transition-transform', open && 'rotate-90')} />
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
            <div className="px-5 pb-4 border-t border-white/[0.04] pt-3 grid grid-cols-2 gap-x-8 gap-y-1.5">
              {([
                ['Certificate',    blackdog.certificate],
                ['HSTS',           blackdog.hsts ? 'Enforced' : 'Not found'],
                ['Mixed Content',  blackdog.mixedContent ? 'Detected' : 'None'],
                ['Fingerprinting', blackdog.fingerprinting ? 'Detected' : 'None'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground/35">{k}</span>
                  <span className="text-[10px] font-mono text-foreground/55">{v}</span>
                </div>
              ))}
              <div className="col-span-2 pt-2 text-[9px] font-mono text-muted-foreground/22 leading-relaxed border-t border-white/[0.04] mt-1">
                Heuristic classification — URL patterns and domain signals only. Not live page analysis.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Iframe attempt ───────────────────────────────────────────────────────────

type EmbedState = 'loading' | 'loaded' | 'blocked';

function LiveEmbed({ url, domain, onBlocked }: {
  url: string; domain: string; onBlocked: () => void;
}) {
  const [embedState, setEmbedState] = useState<EmbedState>('loading');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setEmbedState('loading');
    // After 4 seconds, try to read contentDocument to detect embed block
    timerRef.current = setTimeout(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      try {
        const doc = iframe.contentDocument;
        if (!doc || doc.body.innerHTML === '') {
          setEmbedState('blocked');
          onBlocked();
        } else {
          setEmbedState('loaded');
        }
      } catch {
        // Cross-origin access denied = iframe loaded successfully (browser blocked our read)
        setEmbedState('loaded');
      }
    }, 4000);
    return () => clearTimeout(timerRef.current);
  }, [url]);

  const handleLoad = useCallback(() => {
    clearTimeout(timerRef.current);
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc || doc.body.innerHTML === '') {
        setEmbedState('blocked');
        onBlocked();
      } else {
        setEmbedState('loaded');
      }
    } catch {
      setEmbedState('loaded');
    }
  }, [onBlocked]);

  const handleError = useCallback(() => {
    clearTimeout(timerRef.current);
    setEmbedState('blocked');
    onBlocked();
  }, [onBlocked]);

  return (
    <div className="relative w-full h-full">
      {embedState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
          <div className="flex items-center gap-2.5 text-[12px] font-mono text-muted-foreground/40">
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
        style={{ opacity: embedState === 'loaded' ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function WebsiteView() {
  const { activeTab, navigateBack, canGoBack } = useBrowserState();
  const { url, riskLevel, blackdog } = activeTab;
  const domain = getDomain(url);

  const [dangerDismissed, setDangerDismissed] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [viewMode, setViewMode] = useState<'live' | 'summary'>('live');

  // Reset state when URL changes
  const prevUrl = useRef(url);
  useEffect(() => {
    if (prevUrl.current !== url) {
      prevUrl.current = url;
      setDangerDismissed(false);
      setEmbedBlocked(false);
      setViewMode('live');
    }
  }, [url]);

  const handleBack = () => {
    if (canGoBack) navigateBack();
  };

  // ── Danger block ──────────────────────────────────────────────────────────
  if (riskLevel === 'danger' && !dangerDismissed) {
    return (
      <motion.div key={`danger-${url}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full bg-background">
        <DangerBlockPage
          domain={domain}
          url={url}
          onDismiss={() => setDangerDismissed(true)}
          onBack={handleBack}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      key={url}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
      className="h-full flex flex-col bg-background overflow-hidden"
    >
      {/* Risk banners */}
      {riskLevel === 'danger' && dangerDismissed && (
        <div className="flex items-center gap-3 px-5 py-2 bg-red-500/[0.08] border-b border-red-500/20 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-[11px] font-mono text-red-400/80 flex-1">
            <span className="font-bold">HIGH RISK</span> — Heuristic classification. Viewing with warnings active.
          </span>
        </div>
      )}
      {riskLevel === 'caution' && <CautionBanner finding={blackdog.findings[0]} />}

      {/* URL bar */}
      <div
        className="flex items-center gap-2.5 px-4 py-2 border-b shrink-0"
        style={{
          borderColor: 'rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        {riskLevel === 'safe' || riskLevel === 'unknown'
          ? <Lock className="w-3 h-3 text-primary/50 shrink-0" />
          : <ShieldAlert className="w-3 h-3 text-amber-500/60 shrink-0" />
        }

        <div className="flex items-center gap-1 flex-1 min-w-0 font-mono text-[12px]">
          <span className="text-foreground/65 font-medium shrink-0">{domain}</span>
          <span className="text-muted-foreground/30 truncate">{getPathDisplay(url)}</span>
        </div>

        {/* View mode toggle */}
        <div
          className="flex items-center rounded border border-white/[0.06] overflow-hidden shrink-0"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <button
            onClick={() => { setViewMode('live'); setEmbedBlocked(false); }}
            className={twMerge(
              'px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors',
              viewMode === 'live'
                ? 'text-primary/80 bg-primary/[0.08]'
                : 'text-muted-foreground/35 hover:text-muted-foreground/65'
            )}
          >
            Live
          </button>
          <button
            onClick={() => setViewMode('summary')}
            className={twMerge(
              'px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider transition-colors border-l border-white/[0.06]',
              viewMode === 'summary'
                ? 'text-primary/80 bg-primary/[0.08]'
                : 'text-muted-foreground/35 hover:text-muted-foreground/65'
            )}
          >
            Summary
          </button>
        </div>

        <div className={twMerge(
          'px-2 py-0.5 rounded border text-[9px] font-bold font-mono tracking-wider uppercase shrink-0',
          riskLevel === 'safe'    ? 'text-primary   border-primary/20  bg-primary/[0.06]'   :
          riskLevel === 'caution' ? 'text-amber-500 border-amber-500/20 bg-amber-500/[0.05]' :
          riskLevel === 'danger'  ? 'text-red-500   border-red-500/20   bg-red-500/[0.05]'   :
          'text-muted-foreground border-white/10 bg-white/[0.03]'
        )}>
          {riskLevel}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'summary' ? (
          <HonestSummary
            url={url}
            domain={domain}
            riskLevel={riskLevel}
            blackdog={blackdog}
          />
        ) : embedBlocked ? (
          <BlockedEmbedFallback url={url} domain={domain} onBack={handleBack} />
        ) : (
          <LiveEmbed
            key={url}
            url={url}
            domain={domain}
            onBlocked={() => setEmbedBlocked(true)}
          />
        )}
      </div>

      <PageInspectionPanel riskLevel={riskLevel} blackdog={blackdog} />
    </motion.div>
  );
}
