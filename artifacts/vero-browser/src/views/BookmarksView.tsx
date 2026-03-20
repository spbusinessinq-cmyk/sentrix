import React from 'react';
import { BookOpen, Trash2, ExternalLink, Bookmark } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

function RiskDot({ risk }: { risk: string }) {
  const cls =
    risk === 'safe'    ? 'bg-primary/60' :
    risk === 'caution' ? 'bg-amber-500/60' :
    risk === 'danger'  ? 'bg-red-500/60' :
    'bg-muted-foreground/30';
  return <span className={twMerge('w-1.5 h-1.5 rounded-full shrink-0', cls)} />;
}

export function BookmarksView() {
  const { bookmarks, removeBookmark, navigate } = useBrowserState();

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/20">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">sentrix://bookmarks</div>
          <h2 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground/50" />
            Bookmarks
          </h2>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/30">{bookmarks.length} saved</div>
      </div>

      <div className="px-6 py-4 max-w-2xl">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Bookmark className="w-5 h-5 text-muted-foreground/30" />
            </div>
            <div className="text-center">
              <div className="text-[13px] font-medium text-muted-foreground/40 mb-1">No bookmarks yet</div>
              <div className="text-[11px] font-mono text-muted-foreground/25">
                Click the bookmark icon in the address bar to save pages
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {bookmarks.map(entry => (
              <div
                key={entry.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
              >
                <RiskDot risk={entry.riskLevel} />
                <button
                  onClick={() => navigate(entry.url)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-[12px] font-medium text-foreground/70 group-hover:text-foreground/90 transition-colors truncate">
                    {entry.title}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/40 truncate">{entry.url}</div>
                </button>
                <span className="text-[10px] font-mono text-muted-foreground/25 shrink-0">
                  {format(entry.savedAt, 'MMM d')}
                </span>
                <button
                  onClick={() => navigate(entry.url)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 hover:text-primary/70"
                  title="Navigate"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeBookmark(entry.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 hover:text-red-500/70"
                  title="Remove bookmark"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
