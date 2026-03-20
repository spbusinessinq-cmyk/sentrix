import React from 'react';
import { Download, CheckCircle, XCircle, AlertTriangle, Folder, Clock, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useBrowserState } from '@/hooks/use-browser-state';

export function DownloadsView() {
  const { downloads, clearDownloads } = useBrowserState();

  const completeCount = downloads.filter(d => d.status === 'downloaded').length;
  const blockedCount  = downloads.filter(d => d.status === 'blocked').length;

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
        <div className="flex items-center gap-2">
          {downloads.length > 0 && (
            <button
              onClick={clearDownloads}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.05] bg-black/20 text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-white/[0.04] transition-all text-[11px] font-mono"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {downloads.length > 0 && (
        <div className="flex items-center gap-6 px-6 py-3 border-b border-white/[0.04] bg-black/10">
          <Stat label="Total"    value={`${downloads.length}`} />
          <Stat label="Complete" value={`${completeCount}`} color="text-primary" />
          <Stat label="Blocked"  value={`${blockedCount}`}  color="text-red-500" />
        </div>
      )}

      <div className="px-6 py-4 flex flex-col gap-2 max-w-2xl">
        {downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Folder className="w-5 h-5 text-muted-foreground/30" />
            </div>
            <div className="text-center">
              <div className="text-[13px] font-medium text-muted-foreground/40 mb-1">No downloads this session</div>
              <div className="text-[11px] font-mono text-muted-foreground/25">
                File-type URLs (.pdf, .zip, .dmg, etc.) are automatically tracked here
              </div>
            </div>
          </div>
        ) : (
          downloads.map(dl => (
            <div key={dl.id} className={twMerge(
              'flex items-center gap-4 p-4 rounded-lg border transition-colors',
              dl.status === 'blocked'
                ? 'border-red-500/10 bg-red-500/[0.03]'
                : 'border-white/[0.05] bg-black/20 hover:bg-black/30'
            )}>
              <div className="shrink-0">
                {dl.status === 'downloaded'
                  ? <CheckCircle className="w-4 h-4 text-primary/70" />
                  : dl.status === 'blocked'
                  ? <XCircle className="w-4 h-4 text-red-500/70" />
                  : <Clock className="w-4 h-4 text-amber-500/70" />
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
          ))
        )}
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
