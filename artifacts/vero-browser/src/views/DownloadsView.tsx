import React from 'react';
import { Download, CheckCircle, XCircle, AlertTriangle, Folder } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const MOCK_DOWNLOADS = [
  {
    id: '1', name: 'sentrix-browser-1.0.0.dmg', size: '94.2 MB',
    status: 'complete', source: 'sentrix.live', risk: 'safe',
    date: 'Today, 04:51',
  },
  {
    id: '2', name: 'blackdog-security-report-q1.pdf', size: '2.1 MB',
    status: 'complete', source: 'docs.sentrix.live', risk: 'safe',
    date: 'Today, 03:12',
  },
  {
    id: '3', name: 'react-docs.pdf', size: '8.4 MB',
    status: 'complete', source: 'react.dev', risk: 'safe',
    date: 'Yesterday, 21:30',
  },
  {
    id: '4', name: 'free-vpn-pro-setup.exe', size: '12.8 MB',
    status: 'blocked', source: 'free-vpn-download.net', risk: 'danger',
    date: 'Yesterday, 14:02',
  },
  {
    id: '5', name: 'suspicious-update.js', size: '340 KB',
    status: 'blocked', source: 'unknown-domain.net', risk: 'caution',
    date: '3 days ago',
  },
];

export function DownloadsView() {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/20">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">sentrix://downloads</div>
          <h2 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
            <Download className="w-4 h-4 text-muted-foreground/50" />
            Downloads
          </h2>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.05] bg-black/20 text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-white/[0.04] transition-all text-[11px] font-mono">
          <Folder className="w-3 h-3" /> Open Folder
        </button>
      </div>

      <div className="flex items-center gap-6 px-6 py-3 border-b border-white/[0.04] bg-black/10">
        <Stat label="Total"    value={`${MOCK_DOWNLOADS.length}`} />
        <Stat label="Complete" value={`${MOCK_DOWNLOADS.filter(d => d.status === 'complete').length}`} color="text-primary" />
        <Stat label="Blocked"  value={`${MOCK_DOWNLOADS.filter(d => d.status === 'blocked').length}`}  color="text-red-500" />
      </div>

      <div className="px-6 py-4 flex flex-col gap-2 max-w-2xl">
        {MOCK_DOWNLOADS.map(dl => (
          <div key={dl.id} className={twMerge(
            'flex items-center gap-4 p-4 rounded-lg border transition-colors',
            dl.status === 'blocked'
              ? 'border-red-500/10 bg-red-500/[0.03]'
              : 'border-white/[0.05] bg-black/20 hover:bg-black/30'
          )}>
            <div className="shrink-0">
              {dl.status === 'complete'
                ? <CheckCircle className="w-4 h-4 text-primary/70" />
                : <XCircle className="w-4 h-4 text-red-500/70" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-foreground/80 truncate">{dl.name}</div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] font-mono text-muted-foreground/40">{dl.source}</span>
                <span className="text-[10px] font-mono text-muted-foreground/30">•</span>
                <span className="text-[10px] font-mono text-muted-foreground/40">{dl.size}</span>
                <span className="text-[10px] font-mono text-muted-foreground/30">•</span>
                <span className="text-[10px] font-mono text-muted-foreground/40">{dl.date}</span>
              </div>
            </div>

            <RiskTag risk={dl.risk} />

            {dl.status === 'blocked' && (
              <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-red-500/60">
                <AlertTriangle className="w-3 h-3" />
                BLOCKED
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'text-foreground/60' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">{label}</span>
      <span className={twMerge('text-[12px] font-bold font-mono', color)}>{value}</span>
    </div>
  );
}

function RiskTag({ risk }: { risk: string }) {
  const map: Record<string, string> = {
    safe:    'text-primary border-primary/20 bg-primary/[0.06]',
    caution: 'text-amber-500 border-amber-500/20 bg-amber-500/[0.06]',
    danger:  'text-red-500 border-red-500/20 bg-red-500/[0.06]',
    unknown: 'text-muted-foreground border-white/10 bg-white/[0.04]',
  };
  return (
    <div className={twMerge('px-2 py-0.5 rounded border text-[9px] font-bold tracking-widest uppercase shrink-0', map[risk] ?? map.unknown)}>
      {risk.toUpperCase()}
    </div>
  );
}
