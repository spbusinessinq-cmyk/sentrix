import React, { useState } from 'react';
import { Shield, Flame, Link as LinkIcon, FileText, LockKeyhole, RotateCcw, Plus, Clock, Search } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { useToast } from '@/hooks/use-toast';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

const SESSION_START = format(new Date(Date.now() - 1000 * 60 * 14), 'HH:mm:ss');
const LAST_SCAN = format(new Date(Date.now() - 1000 * 47), 'HH:mm:ss');

export function HomeView() {
  const { navigate, history, burnSession, addTab, activeTab } = useBrowserState();
  const [localSearch, setLocalSearch] = useState('');
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) navigate(localSearch.trim());
  };

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col items-center bg-background">
      {/* Status strip */}
      <div className="w-full border-b border-white/[0.04] bg-black/20 px-6 py-1.5 flex items-center gap-6 text-[10px] font-mono text-muted-foreground/60 tracking-widest shrink-0 overflow-x-auto">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
          SESSION ACTIVE — {SESSION_START}
        </span>
        <span className="text-white/20 shrink-0">|</span>
        <span className="shrink-0">LAST SCAN {LAST_SCAN}</span>
        <span className="text-white/20 shrink-0">|</span>
        <span className="shrink-0">VAULT LOCKED</span>
        <span className="text-white/20 shrink-0">|</span>
        <span className="text-primary/60 shrink-0">LOCAL PROTECTIONS ENABLED</span>
        <span className="ml-auto shrink-0">CERT: TLS 1.3 / VALID</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-12 pb-10 w-full max-w-2xl mx-auto">

        {/* Brand */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary opacity-90" />
            <div className="text-left">
              <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">
                Browse clearly. <span className="text-primary">Stay protected.</span>
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 mt-0.5 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary/80 inline-block" />
                Protected by BLACKDOG Engine v4.1.2
              </p>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="w-full mb-8">
          <div className="flex items-center h-11 bg-black/50 border border-white/[0.08] rounded-lg overflow-hidden focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/10 transition-all">
            <div className="pl-4 pr-3 text-muted-foreground/50 shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search securely or enter a URL"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground/30 font-mono"
              spellCheck={false}
            />
            {localSearch && (
              <button type="submit" className="mr-2 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded text-[11px] font-bold tracking-wider uppercase transition-colors">
                Go
              </button>
            )}
          </div>
        </form>

        {/* Quick tools */}
        <div className="w-full mb-8">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">Quick Tools</div>
          <div className="grid grid-cols-3 gap-2">
            <UtilityBlock icon={<Plus className="w-3.5 h-3.5" />} label="New Secure Tab" sub="Isolated session" onClick={addTab} />
            <UtilityBlock icon={<Flame className="w-3.5 h-3.5 text-red-500" />} label="Burn Session" sub="Sanitize all data" onClick={() => { burnSession(); toast({ title: 'Session Burned', description: 'All data sanitized.' }); }} variant="danger" />
            <UtilityBlock icon={<LinkIcon className="w-3.5 h-3.5 text-blue-400" />} label="Link Check" sub="Pre-flight analysis" onClick={() => toast({ title: 'Link Check', description: 'Enter a URL in the address bar to analyze.' })} />
            <UtilityBlock icon={<FileText className="w-3.5 h-3.5 text-purple-400" />} label="Privacy Report" sub="Tracker summary" onClick={() => navigate('vero://privacy')} />
            <UtilityBlock icon={<LockKeyhole className="w-3.5 h-3.5 text-primary/80" />} label="Vault Access" sub="Credentials locked" onClick={() => navigate('vero://vault')} />
            <UtilityBlock icon={<RotateCcw className="w-3.5 h-3.5 text-muted-foreground/60" />} label="Session Controls" sub="Manage isolation" onClick={() => navigate('vero://settings')} />
          </div>
        </div>

        {/* Page inspection */}
        <div className="w-full border border-white/[0.05] rounded-lg bg-black/20 overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">Page Inspection — vero://newtab</span>
            <span className="text-[10px] font-mono text-primary/60">CLEAN</span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-white/[0.04]">
            <StatCell label="Trackers" value="0" color="text-primary" />
            <StatCell label="Scripts" value="0" color="text-muted-foreground" />
            <StatCell label="Redirects" value="0" color="text-muted-foreground" />
            <StatCell label="Risk" value="LOW" color="text-primary" />
          </div>
        </div>

        {/* Recent history */}
        {history.length > 0 && (
          <div className="w-full">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Recent
            </div>
            <div className="flex flex-col gap-0.5">
              {history.slice(0, 5).map(entry => (
                <button
                  key={entry.id}
                  onClick={() => navigate(entry.url)}
                  className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/[0.03] transition-colors cursor-pointer text-left group"
                >
                  <span className={twMerge('w-1 h-1 rounded-full shrink-0',
                    entry.riskLevel === 'safe' ? 'bg-primary/50' :
                    entry.riskLevel === 'caution' ? 'bg-amber-500/50' :
                    entry.riskLevel === 'danger' ? 'bg-red-500/50' : 'bg-muted-foreground/30'
                  )} />
                  <span className="text-[12px] font-mono text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors truncate">
                    {entry.title}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground/30 shrink-0">
                    {format(entry.visitedAt, 'HH:mm')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UtilityBlock({ icon, label, sub, onClick, variant = 'default' }: {
  icon: React.ReactNode; label: string; sub: string; onClick: () => void; variant?: 'default' | 'danger';
}) {
  return (
    <button onClick={onClick} className={twMerge(
      'flex items-center gap-3 px-3 py-2.5 rounded border transition-all text-left group',
      variant === 'danger'
        ? 'border-white/[0.04] bg-black/20 hover:bg-red-500/5 hover:border-red-500/15'
        : 'border-white/[0.04] bg-black/20 hover:bg-white/[0.04] hover:border-white/[0.08]'
    )}>
      <div className="shrink-0 p-1.5 rounded bg-white/[0.04] border border-white/[0.04] group-hover:border-white/[0.08] transition-colors">
        {icon}
      </div>
      <div>
        <div className="text-[12px] font-medium text-foreground/80 leading-tight">{label}</div>
        <div className="text-[10px] font-mono text-muted-foreground/40 leading-tight mt-0.5">{sub}</div>
      </div>
    </button>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-4 py-3 flex flex-col gap-1">
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">{label}</span>
      <span className={twMerge('text-sm font-bold font-mono', color)}>{value}</span>
    </div>
  );
}
