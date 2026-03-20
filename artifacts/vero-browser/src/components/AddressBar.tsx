import React from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, ShieldAlert, Bookmark, ShieldCheck, Eye } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';

export function AddressBar() {
  const { currentUrl, setCurrentUrl, riskLevel, addLog } = useBrowserState();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = e.currentTarget.value.trim();
      const url = !val.includes('://') && !val.includes(' ') ? `https://${val}` : val;
      setCurrentUrl(url);
      addLog(`Navigation: ${url}`, 'info');
    }
  };

  const RiskBadge = () => {
    const map = {
      danger:  { label: 'DANGER',  cls: 'text-red-500 border-red-500/25 bg-red-500/[0.07]',    Icon: ShieldAlert },
      caution: { label: 'CAUTION', cls: 'text-amber-500 border-amber-500/25 bg-amber-500/[0.07]', Icon: ShieldAlert },
      safe:    { label: 'SAFE',    cls: 'text-primary border-primary/25 bg-primary/[0.07]',      Icon: ShieldCheck },
      unknown: { label: 'UNKNWN',  cls: 'text-muted-foreground border-white/10 bg-white/[0.04]', Icon: ShieldCheck },
    } as const;
    const { label, cls, Icon } = map[riskLevel] ?? map.safe;
    return (
      <div className={twMerge('flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold tracking-widest uppercase shrink-0', cls)}>
        <Icon className="w-2.5 h-2.5" />
        {label}
      </div>
    );
  };

  return (
    <div className="flex items-center h-10 bg-[#0a0a0c] border-b border-white/[0.05] px-2 gap-1.5 z-10 shrink-0">

      {/* Nav controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        <NavBtn title="Back"><ArrowLeft className="w-3.5 h-3.5" /></NavBtn>
        <NavBtn title="Forward" disabled><ArrowRight className="w-3.5 h-3.5 opacity-25" /></NavBtn>
        <NavBtn title="Refresh"><RotateCw className="w-3.5 h-3.5" /></NavBtn>
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-white/[0.06] shrink-0 mx-0.5" />

      {/* Address input */}
      <div className="flex flex-1 items-center h-7 bg-black/40 border border-white/[0.07] rounded px-3 gap-2 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10 transition-all min-w-0">
        <Lock className="w-3 h-3 text-primary/60 shrink-0" />
        <input
          type="text"
          value={currentUrl}
          onChange={(e) => setCurrentUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-foreground/80 placeholder:text-muted-foreground/30 min-w-0"
          placeholder="Search or enter address"
          spellCheck={false}
        />
        <RiskBadge />
      </div>

      {/* Separator */}
      <div className="w-px h-4 bg-white/[0.06] shrink-0 mx-0.5" />

      {/* Action icons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <NavBtn title="Bookmark"><Bookmark className="w-3.5 h-3.5" /></NavBtn>
        <NavBtn title="Secure Mode Active" active><ShieldCheck className="w-3.5 h-3.5" /></NavBtn>
        <NavBtn title="Inspect"><Eye className="w-3.5 h-3.5" /></NavBtn>
      </div>
    </div>
  );
}

function NavBtn({
  children,
  title,
  disabled,
  active,
}: {
  children: React.ReactNode;
  title?: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      className={twMerge(
        'flex items-center justify-center w-7 h-7 rounded transition-colors',
        disabled ? 'cursor-default text-muted-foreground/20' : 'text-muted-foreground/50 hover:bg-white/[0.05] hover:text-muted-foreground/80',
        active && 'text-primary/80 hover:text-primary'
      )}
    >
      {children}
    </button>
  );
}
