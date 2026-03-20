import React, { useState, useRef } from 'react';
import { Link as LinkIcon, ShieldCheck, AlertTriangle, ShieldAlert, Shield, X, ArrowRight } from 'lucide-react';
import { analyzeUrl, classifyInput } from '@/lib/blackdog';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

interface LinkCheckResult {
  url: string;
  domain: string;
  risk: 'safe' | 'caution' | 'danger' | 'unknown';
  findings: string[];
  certificate: string;
  hsts: boolean;
}

interface Props {
  onClose: () => void;
  onNavigate: (url: string) => void;
}

export function LinkCheckModal({ onClose, onNavigate }: Props) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<LinkCheckResult | null>(null);
  const [checked, setChecked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runCheck = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const { url, pageType } = classifyInput(trimmed);
    const { riskLevel, blackdog } = analyzeUrl(url);
    let domain = '';
    try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { domain = url; }
    setResult({
      url,
      domain: pageType === 'search' ? '(search query)' : domain,
      risk: riskLevel,
      findings: blackdog.findings,
      certificate: blackdog.certificate,
      hsts: blackdog.hsts,
    });
    setChecked(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runCheck();
    if (e.key === 'Escape') onClose();
  };

  const riskConfig = result ? {
    safe:    { label: 'SAFE',    color: 'text-primary',   border: 'border-primary/20',    bg: 'bg-primary/[0.07]',    Icon: ShieldCheck },
    caution: { label: 'CAUTION', color: 'text-amber-500', border: 'border-amber-500/20',  bg: 'bg-amber-500/[0.06]',  Icon: AlertTriangle },
    danger:  { label: 'DANGER',  color: 'text-red-500',   border: 'border-red-500/20',    bg: 'bg-red-500/[0.06]',    Icon: ShieldAlert },
    unknown: { label: 'UNKNOWN', color: 'text-muted-foreground', border: 'border-white/10', bg: 'bg-white/[0.03]', Icon: Shield },
  }[result.risk] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md rounded-xl overflow-hidden"
        style={{
          background: 'rgba(10,12,16,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(22,163,74,0.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-primary/60" />
            <span className="text-[13px] font-semibold text-foreground/80">Link Check</span>
            <span className="text-[10px] font-mono text-muted-foreground/30 ml-1">— pre-flight URL analysis</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="px-5 py-4">
          <div
            className="flex items-center h-10 rounded-lg overflow-hidden"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setChecked(false); setResult(null); }}
              onKeyDown={handleKeyDown}
              placeholder="Paste a URL or domain to check…"
              className="flex-1 bg-transparent border-none outline-none px-4 text-[12px] font-mono text-foreground/80 placeholder:text-muted-foreground/30 caret-primary"
              spellCheck={false}
            />
            <button
              onClick={runCheck}
              disabled={!input.trim()}
              className="h-full px-4 text-[10px] font-bold tracking-widest uppercase transition-all border-l border-white/[0.06] disabled:opacity-30"
              style={{ background: 'rgba(22,163,74,0.1)', color: 'hsl(142 72% 44%)' }}
            >
              Check
            </button>
          </div>
        </div>

        {/* Result */}
        <AnimatePresence>
          {checked && result && riskConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-3">
                {/* Risk header */}
                <div className={twMerge('flex items-center gap-3 px-4 py-3 rounded-lg border', riskConfig.border, riskConfig.bg)}>
                  <riskConfig.Icon className={twMerge('w-5 h-5 shrink-0', riskConfig.color)} />
                  <div className="flex-1 min-w-0">
                    <div className={twMerge('text-[11px] font-bold tracking-widest uppercase', riskConfig.color)}>{riskConfig.label}</div>
                    <div className="text-[11px] font-mono text-muted-foreground/60 truncate">{result.domain}</div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  {[
                    ['Certificate', result.certificate],
                    ['HSTS', result.hsts ? 'Enforced' : 'Not found'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-mono text-muted-foreground/40">{k}</span>
                      <span className="text-[10px] font-mono text-foreground/60">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Findings */}
                <div className="space-y-1">
                  {result.findings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 px-1">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                      <span className="text-[10px] font-mono text-muted-foreground/50">{f}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {result.risk !== 'danger' && (
                    <button
                      onClick={() => { onNavigate(result.url); onClose(); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/20 bg-primary/[0.08] text-primary/80 text-[11px] font-mono hover:bg-primary/[0.12] transition-colors"
                    >
                      Open <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded border border-white/[0.06] text-muted-foreground/50 text-[11px] font-mono hover:text-muted-foreground/80 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {!checked && (
          <div className="px-5 pb-4 text-[10px] font-mono text-muted-foreground/25">
            Analysis is heuristic — based on URL patterns and domain classification signals.
          </div>
        )}
      </motion.div>
    </div>
  );
}
