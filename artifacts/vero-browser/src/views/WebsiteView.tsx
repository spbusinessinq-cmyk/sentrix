import React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, Globe, Lock, ExternalLink } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { getDomainTitle } from '@/lib/blackdog';

function extractPageTitle(url: string): string {
  const domain = getDomainTitle(url);
  const path = (() => {
    try { return new URL(url).pathname.split('/').filter(Boolean).join(' › '); }
    catch { return ''; }
  })();
  return path ? `${domain} › ${path}` : domain;
}

function MockPageContent({ url, risk }: { url: string; risk: string }) {
  const domain = getDomainTitle(url);

  const paragraphs = [
    `Welcome to ${domain}. This is a simulated page render — Vero does not embed a real page engine in this prototype. Navigation and BLACKDOG analysis are fully functional.`,
    `The BLACKDOG engine has completed a deep scan of this domain. All traffic metadata, certificate chain, script inventory, and network requests have been analyzed. Results are visible in the security panel.`,
    `Session isolation is active. Your browsing data on this page is sandboxed from other tabs. No persistent cookies have been written to disk outside the secure session boundary.`,
  ];

  return (
    <div className="px-8 py-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Globe className="w-5 h-5 text-muted-foreground/40" />
        <h1 className="text-lg font-semibold text-foreground/80">{extractPageTitle(url)}</h1>
      </div>
      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[13px] text-foreground/50 leading-relaxed font-mono">{p}</p>
        ))}
      </div>
      <div className="mt-8 p-4 rounded-lg border border-white/[0.05] bg-black/30">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">Page Metadata</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Domain', getDomainTitle(url)],
            ['Protocol', url.startsWith('https') ? 'HTTPS' : 'HTTP'],
            ['Render Mode', 'Vero Mock Renderer v1'],
            ['Page Type', 'External Website'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-1">
              <span className="text-[10px] font-mono text-muted-foreground/40">{k}</span>
              <span className="text-[10px] font-mono text-foreground/60">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WebsiteView() {
  const { activeTab } = useBrowserState();
  const { url, riskLevel, blackdog, title } = activeTab;

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Risk banner */}
      {riskLevel === 'danger' && (
        <div className="flex items-center gap-3 px-6 py-3 bg-red-500/10 border-b border-red-500/20">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-semibold text-red-400">BLACKDOG: High-risk page detected.</span>
            <span className="text-[11px] text-red-400/70 ml-2">{blackdog.findings[0]}</span>
          </div>
        </div>
      )}
      {riskLevel === 'caution' && (
        <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/8 border-b border-amber-500/15">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[12px] font-semibold text-amber-400">BLACKDOG: Proceed with caution.</span>
            <span className="text-[11px] text-amber-400/70 ml-2">{blackdog.findings[0]}</span>
          </div>
        </div>
      )}

      {/* Page URL bar */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-b border-white/[0.05] bg-black/20">
        <div className="flex items-center gap-2">
          {riskLevel === 'safe' || riskLevel === 'unknown'
            ? <Lock className="w-3 h-3 text-primary/60" />
            : <ShieldAlert className="w-3 h-3 text-amber-500/70" />
          }
          <span className="text-[12px] font-mono text-foreground/60 truncate">{url}</span>
        </div>
        <ExternalLink className="w-3 h-3 text-muted-foreground/30 ml-auto shrink-0" />
      </div>

      {/* Quick stats strip */}
      <div className="flex items-center gap-6 px-6 py-2 border-b border-white/[0.04] bg-black/10">
        <StatPill label="Trackers" value={String(blackdog.trackers)} color={blackdog.trackers > 0 ? 'text-amber-500' : 'text-primary'} />
        <StatPill label="Scripts" value={String(blackdog.scripts)} color={blackdog.scripts > 3 ? 'text-amber-500' : 'text-foreground/60'} />
        <StatPill label="Redirects" value={String(blackdog.redirects)} color={blackdog.redirects > 0 ? 'text-amber-500' : 'text-foreground/60'} />
        <StatPill label="Cert" value={blackdog.certificate.split('/')[0].trim()} color="text-foreground/60" />
        <div className="ml-auto flex items-center gap-1.5">
          {riskLevel === 'safe' && <><ShieldCheck className="w-3 h-3 text-primary" /><span className="text-[10px] font-mono text-primary">CLEAN</span></>}
          {riskLevel === 'caution' && <><AlertTriangle className="w-3 h-3 text-amber-500" /><span className="text-[10px] font-mono text-amber-500">CAUTION</span></>}
          {riskLevel === 'danger' && <><ShieldAlert className="w-3 h-3 text-red-500" /><span className="text-[10px] font-mono text-red-500">DANGER</span></>}
          {riskLevel === 'unknown' && <><ShieldCheck className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] font-mono text-muted-foreground">UNKNOWN</span></>}
        </div>
      </div>

      {/* Mock page content */}
      <MockPageContent url={url} risk={riskLevel} />
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">{label}</span>
      <span className={twMerge('text-[11px] font-bold font-mono', color)}>{value}</span>
    </div>
  );
}
