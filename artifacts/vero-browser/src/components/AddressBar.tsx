import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Lock, ShieldAlert, Bookmark, ShieldCheck, Eye } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';

export function AddressBar() {
  const { currentUrl, navigate, setAddressBarUrl, riskLevel } = useBrowserState();
  const [inputValue, setInputValue] = useState(currentUrl);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setInputValue(currentUrl);
  }, [currentUrl]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { navigate(inputValue.trim()); e.currentTarget.blur(); }
    if (e.key === 'Escape') { setInputValue(currentUrl); e.currentTarget.blur(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setAddressBarUrl(e.target.value);
  };

  const riskMap = {
    safe:    { label: 'SAFE',    lockColor: 'hsl(142 72% 38%)', cls: 'risk-safe',    Icon: ShieldCheck },
    caution: { label: 'CAUTION', lockColor: '#f59e0b',          cls: 'risk-caution', Icon: ShieldAlert },
    danger:  { label: 'DANGER',  lockColor: '#ef4444',          cls: 'risk-danger',  Icon: ShieldAlert },
    unknown: { label: 'UNKNOWN', lockColor: 'rgba(148,163,184,0.5)', cls: 'risk-unknown', Icon: ShieldCheck },
  };
  const risk = riskMap[riskLevel] ?? riskMap.safe;

  const focusRingShadow = focused
    ? '0 0 0 1px rgba(22,163,74,0.25), 0 0 20px rgba(22,163,74,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
    : 'inset 0 1px 0 rgba(255,255,255,0.03)';

  return (
    <div
      className="flex items-center h-[42px] px-2 gap-1.5 z-10 shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(8,8,11,0.95) 0%, rgba(6,6,9,0.98) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.02)',
      }}
    >
      {/* Navigation buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <NavBtn title="Back"><ArrowLeft className="w-3.5 h-3.5" /></NavBtn>
        <NavBtn title="Forward" disabled><ArrowRight className="w-3.5 h-3.5" /></NavBtn>
        <NavBtn title="Refresh" onClick={() => navigate(currentUrl)}><RotateCw className="w-3.5 h-3.5" /></NavBtn>
      </div>

      <div className="w-px h-4 mx-1 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Address input container */}
      <div
        className="flex flex-1 items-center h-[28px] px-3 gap-2 rounded-md min-w-0 transition-all duration-200"
        style={{
          background: focused
            ? 'rgba(0,0,0,0.55)'
            : 'rgba(0,0,0,0.42)',
          border: `1px solid ${focused ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.07)'}`,
          boxShadow: focusRingShadow,
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease, background 0.15s ease',
        }}
      >
        {/* Lock icon - risk-colored */}
        <Lock
          className="w-3 h-3 shrink-0 transition-colors duration-200"
          style={{ color: focused ? risk.lockColor : 'rgba(22,163,74,0.55)' }}
        />

        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={e => { setFocused(true); e.target.select(); }}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-foreground/82 placeholder:text-muted-foreground/28 min-w-0 caret-primary"
          placeholder="Search securely or enter address"
          spellCheck={false}
        />

        {/* Risk badge */}
        {!focused && (
          <div
            className={twMerge(
              'flex items-center gap-[4px] px-[7px] py-[2px] rounded border text-[9px] font-bold tracking-[0.13em] uppercase shrink-0',
              risk.cls
            )}
          >
            <risk.Icon className="w-2.5 h-2.5" />
            {risk.label}
          </div>
        )}
      </div>

      <div className="w-px h-4 mx-1 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Action buttons */}
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
  const [hovered, setHovered] = useState(false);

  const baseColor = disabled
    ? 'rgba(148,163,184,0.18)'
    : active
    ? 'hsl(142 72% 40%)'
    : hovered
    ? 'rgba(148,163,184,0.82)'
    : 'rgba(148,163,184,0.44)';

  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-150"
      style={{
        color: baseColor,
        background: hovered && !disabled ? 'rgba(255,255,255,0.05)' : 'transparent',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
