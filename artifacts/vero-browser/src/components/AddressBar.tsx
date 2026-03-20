import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, ShieldAlert, Bookmark, ShieldCheck, Eye } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';

export function AddressBar() {
  const { currentUrl, navigate, setAddressBarUrl, riskLevel } = useBrowserState();
  const [inputValue, setInputValue] = useState(currentUrl);

  // Sync input when the active tab URL changes externally (e.g. clicking a result)
  useEffect(() => {
    setInputValue(currentUrl);
  }, [currentUrl]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigate(inputValue.trim());
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setInputValue(currentUrl);
      e.currentTarget.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setAddressBarUrl(e.target.value);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const RiskBadge = () => {
    const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
      danger:  { label: 'DANGER',  cls: 'text-red-500 border-red-500/25 bg-red-500/[0.07]',       Icon: ShieldAlert },
      caution: { label: 'CAUTION', cls: 'text-amber-500 border-amber-500/25 bg-amber-500/[0.07]', Icon: ShieldAlert },
      safe:    { label: 'SAFE',    cls: 'text-primary border-primary/25 bg-primary/[0.07]',        Icon: ShieldCheck },
      unknown: { label: 'UNKNWN',  cls: 'text-muted-foreground border-white/10 bg-white/[0.04]',  Icon: ShieldCheck },
    };
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
        <NavBtn title="Refresh" onClick={() => navigate(currentUrl)}><RotateCw className="w-3.5 h-3.5" /></NavBtn>
      </div>

      <div className="w-px h-4 bg-white/[0.06] shrink-0 mx-0.5" />

      {/* Address input */}
      <div className="flex flex-1 items-center h-7 bg-black/40 border border-white/[0.07] rounded px-3 gap-2 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10 transition-all min-w-0">
        <Lock className="w-3 h-3 text-primary/60 shrink-0" />
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-foreground/80 placeholder:text-muted-foreground/30 min-w-0"
          placeholder="Search or enter address"
          spellCheck={false}
        />
        <RiskBadge />
      </div>

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
  children, title, disabled, active, onClick,
}: {
  children: React.ReactNode; title?: string; disabled?: boolean; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={twMerge(
        'flex items-center justify-center w-7 h-7 rounded transition-colors',
        disabled ? 'cursor-default text-muted-foreground/20'
          : 'text-muted-foreground/50 hover:bg-white/[0.05] hover:text-muted-foreground/80',
        active && 'text-primary/80 hover:text-primary'
      )}
    >
      {children}
    </button>
  );
}
