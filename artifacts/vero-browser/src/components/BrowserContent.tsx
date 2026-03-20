import React, { useState } from 'react';
import { Shield, Flame, Link as LinkIcon, FileText, Search, LockKeyhole, RotateCcw, Plus, Clock } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { SearchResults } from './SearchResults';
import { useToast } from '@/hooks/use-toast';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

const SESSION_START = format(new Date(Date.now() - 1000 * 60 * 14), 'HH:mm:ss');
const LAST_SCAN = format(new Date(Date.now() - 1000 * 47), 'HH:mm:ss');

export function BrowserContent() {
  const { searchQuery, setSearchQuery, clearLogs, setCurrentUrl, addLog, setRiskLevel } = useBrowserState();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    if (localSearch) {
      addLog(`Search query intercepted: ${localSearch}`, 'info');
      setCurrentUrl(`vero://search?q=${encodeURIComponent(localSearch)}`);
    }
  };

  const handleBurnSession = () => {
    clearLogs();
    setSearchQuery('');
    setLocalSearch('');
    setCurrentUrl('vero://newtab');
    setRiskLevel('safe');
    toast({
      title: 'Session Burned',
      description: 'All tracking data, local storage, and history sanitized.',
      variant: 'default',
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto flex flex-col items-center bg-background">

      {/* Top Status Strip */}
      <div className="w-full border-b border-white/[0.04] bg-black/20 px-6 py-1.5 flex items-center gap-6 text-[10px] font-mono text-muted-foreground/60 tracking-widest shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
          SESSION ACTIVE — {SESSION_START}
        </span>
        <span className="text-white/20">|</span>
        <span>LAST SCAN {LAST_SCAN}</span>
        <span className="text-white/20">|</span>
        <span>VAULT LOCKED</span>
        <span className="text-white/20">|</span>
        <span className="text-primary/60">LOCAL PROTECTIONS ENABLED</span>
        <span className="ml-auto">CERT: TLS 1.3 / VALID</span>
      </div>

      {/* Main Page Body */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-14 pb-10 w-full max-w-3xl mx-auto">

        {/* Compact Brand Identity */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8 text-primary opacity-90" />
            <div className="text-left">
              <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">
                Browse clearly. <span className="text-primary">Stay protected.</span>
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 mt-0.5 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary/80 inline-block" />
                Protected by BLACKDOG Engine
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-8">
          <div className="flex items-center h-11 bg-black/50 border border-white/[0.08] rounded-lg shadow-lg overflow-hidden focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/15 transition-all">
            <div className="pl-4 pr-3 text-muted-foreground/50 shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search securely or enter a URL"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-foreground placeholder:text-muted-foreground/40 py-3 font-mono"
              spellCheck={false}
            />
            {localSearch && (
              <button
                type="submit"
                className="mr-2 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded text-[11px] font-bold tracking-wider uppercase transition-colors"
              >
                Go
              </button>
            )}
          </div>
        </form>

        {/* Conditional: Actions or Results */}
        {!searchQuery ? (
          <>
            {/* Quick Utility Grid */}
            <div className="w-full mb-8">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">Quick Tools</div>
              <div className="grid grid-cols-3 gap-2">
                <UtilityBlock
                  icon={<Plus className="w-3.5 h-3.5" />}
                  label="New Secure Tab"
                  sub="Isolated session"
                  onClick={() => {
                    setSearchQuery('');
                    setLocalSearch('');
                    setCurrentUrl('vero://newtab');
                  }}
                />
                <UtilityBlock
                  icon={<Flame className="w-3.5 h-3.5 text-red-500" />}
                  label="Burn Session"
                  sub="Sanitize all data"
                  onClick={handleBurnSession}
                  variant="danger"
                />
                <UtilityBlock
                  icon={<LinkIcon className="w-3.5 h-3.5 text-blue-400" />}
                  label="Link Check"
                  sub="Pre-flight analysis"
                  onClick={() => toast({ title: 'Link Inspector', description: 'Paste a URL into the address bar to analyze.' })}
                />
                <UtilityBlock
                  icon={<FileText className="w-3.5 h-3.5 text-purple-400" />}
                  label="Privacy Report"
                  sub="24 blocked last 7d"
                  onClick={() => toast({ title: 'Privacy Report', description: '24 trackers blocked in the last 7 days.' })}
                />
                <UtilityBlock
                  icon={<LockKeyhole className="w-3.5 h-3.5 text-primary/80" />}
                  label="Vault Access"
                  sub="Credentials locked"
                  onClick={() => toast({ title: 'Vault Locked', description: 'Authenticate to access the secure vault.' })}
                />
                <UtilityBlock
                  icon={<RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />}
                  label="Session Controls"
                  sub="Manage isolation"
                  onClick={() => toast({ title: 'Session Controls', description: 'Manage active session isolation settings.' })}
                />
              </div>
            </div>

            {/* Status Panel */}
            <div className="w-full border border-white/[0.05] rounded-lg bg-black/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">Page Inspection — vero://newtab</span>
                <span className="text-[10px] font-mono text-primary/60">CLEAN</span>
              </div>
              <div className="grid grid-cols-4 divide-x divide-white/[0.04]">
                <StatusCell label="Trackers" value="0" color="text-primary" />
                <StatusCell label="Scripts" value="0" color="text-muted-foreground" />
                <StatusCell label="Redirects" value="0" color="text-muted-foreground" />
                <StatusCell label="Risk Score" value="LOW" color="text-primary" />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="w-full mt-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Recent
              </div>
              <div className="flex flex-col gap-0.5">
                {['docs.vero.browser — Safe', 'vero://newtab — Clean session', 'search.vero.browser — Secure'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-white/[0.03] transition-colors cursor-default group">
                    <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary/70 transition-colors" />
                    <span className="text-[12px] font-mono text-muted-foreground/60 group-hover:text-foreground/60 transition-colors">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <SearchResults />
        )}
      </div>
    </div>
  );
}

function UtilityBlock({
  icon,
  label,
  sub,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        'flex items-center gap-3 px-3 py-2.5 rounded border transition-all text-left group',
        variant === 'danger'
          ? 'border-white/[0.04] bg-black/20 hover:bg-red-500/5 hover:border-red-500/15'
          : 'border-white/[0.04] bg-black/20 hover:bg-white/[0.04] hover:border-white/[0.08]'
      )}
    >
      <div className="shrink-0 p-1.5 rounded bg-white/[0.04] border border-white/[0.04] group-hover:border-white/[0.08] transition-colors">
        {icon}
      </div>
      <div>
        <div className="text-[12px] font-medium text-foreground/80 leading-tight">{label}</div>
        <div className="text-[10px] font-mono text-muted-foreground/50 leading-tight mt-0.5">{sub}</div>
      </div>
    </button>
  );
}

function StatusCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-4 py-3 flex flex-col gap-1">
      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">{label}</span>
      <span className={twMerge('text-sm font-bold font-mono', color)}>{value}</span>
    </div>
  );
}
