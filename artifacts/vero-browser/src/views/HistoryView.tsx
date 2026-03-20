import React from 'react';
import { Clock, Trash2, ExternalLink } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isYesterday } from 'date-fns';

function groupByDate(entries: { visitedAt: Date; [key: string]: any }[]) {
  const groups: Record<string, typeof entries> = {};
  for (const e of entries) {
    const label = isToday(e.visitedAt)
      ? 'Today'
      : isYesterday(e.visitedAt)
      ? 'Yesterday'
      : format(e.visitedAt, 'MMM d, yyyy');
    (groups[label] ??= []).push(e);
  }
  return groups;
}

export function HistoryView() {
  const { history, clearHistory, navigate } = useBrowserState();
  const grouped = groupByDate(history);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/20">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">sentrix://history</div>
          <h2 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground/50" />
            Session History
          </h2>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-500/15 bg-red-500/5 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all text-[11px] font-mono"
          >
            <Trash2 className="w-3 h-3" /> Clear History
          </button>
        )}
      </div>

      <div className="px-6 py-4 max-w-2xl">
        {history.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground/30 font-mono text-[12px]">
            — No history in this session —
          </div>
        ) : (
          Object.entries(grouped).map(([date, entries]) => (
            <div key={date} className="mb-6">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3 pb-2 border-b border-white/[0.04]">
                {date}
              </div>
              <div className="flex flex-col gap-0.5">
                {entries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => navigate(entry.url)}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <RiskDot risk={entry.riskLevel} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-foreground/70 group-hover:text-foreground/90 transition-colors truncate">
                        {entry.title}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/40 truncate">{entry.url}</div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/30 shrink-0">
                      {format(entry.visitedAt, 'HH:mm:ss')}
                    </span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RiskDot({ risk }: { risk: string }) {
  const cls =
    risk === 'safe'    ? 'bg-primary/60' :
    risk === 'caution' ? 'bg-amber-500/60' :
    risk === 'danger'  ? 'bg-red-500/60' :
    'bg-muted-foreground/30';
  return <span className={twMerge('w-1.5 h-1.5 rounded-full shrink-0', cls)} />;
}
