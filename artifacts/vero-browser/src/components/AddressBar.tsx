import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Search,
  Bookmark, BookmarkCheck, ShieldCheck, Crosshair
} from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

export function AddressBar() {
  const {
    currentUrl, navigate, navigateOrOpen, setAddressBarUrl,
    riskLevel, pageType,
    navigateBack, navigateForward, canGoBack, canGoForward, isNavigating,
    addBookmark, removeBookmark, isBookmarked, bookmarks,
    setBlackdogPanelOpen, blackdogPanelOpen,
    investigationMode, toggleInvestigationMode, searchQuery,
  } = useBrowserState();

  const [inputValue, setInputValue] = useState(currentUrl);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setInputValue(currentUrl);
  }, [currentUrl, focused]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { navigateOrOpen(inputValue.trim()); e.currentTarget.blur(); }
    if (e.key === 'Escape') { setInputValue(currentUrl); e.currentTarget.blur(); }
  };

  const riskAccentColor =
    riskLevel === 'safe'    ? '#38BDF8' :
    riskLevel === 'caution' ? '#f59e0b' :
    riskLevel === 'danger'  ? '#ef4444' :
    'rgba(148,163,184,0.5)';

  const riskLabel =
    riskLevel === 'safe'    ? 'SAFE' :
    riskLevel === 'caution' ? 'CAUTION' :
    riskLevel === 'danger'  ? 'DANGER' : 'UNKNOWN';

  const riskCls =
    riskLevel === 'safe'    ? 'risk-safe' :
    riskLevel === 'caution' ? 'risk-caution' :
    riskLevel === 'danger'  ? 'risk-danger' : 'risk-unknown';

  const canBookmark = pageType === 'website';
  const bookmarked = isBookmarked(currentUrl);

  const handleBookmark = () => {
    if (!canBookmark) return;
    if (bookmarked) {
      const bm = bookmarks.find(b => b.url === currentUrl);
      if (bm) removeBookmark(bm.id);
    } else {
      addBookmark();
    }
  };

  const placeholder =
    pageType === 'newtab' ? 'Search or enter a URL…' :
    pageType === 'search' ? 'Refine your search…' :
    'Search or navigate…';

  return (
    <div className="relative z-10 shrink-0">
      {/* Navigation progress bar */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            key="nav-bar"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 0.88, opacity: 1 }}
            exit={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute top-0 left-0 right-0 h-[2px] origin-left z-50"
            style={{
              background: 'linear-gradient(90deg, rgba(56,189,248,0.4), #38BDF8, rgba(56,189,248,0.5))',
              boxShadow: '0 0 8px rgba(56,189,248,0.5)',
            }}
          />
        )}
      </AnimatePresence>

      <div
        className="flex items-center h-[42px] px-2 gap-1.5"
        style={{
          background: 'linear-gradient(180deg, rgba(8,8,11,0.95) 0%, rgba(6,6,9,0.98) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Back / Forward */}
        <div className="flex items-center gap-0.5 shrink-0">
          <NavBtn title="Back" disabled={!canGoBack} onClick={navigateBack}>
            <ArrowLeft className="w-3.5 h-3.5" />
          </NavBtn>
          <NavBtn title="Forward" disabled={!canGoForward} onClick={navigateForward}>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavBtn>
        </div>

        <div className="w-px h-4 mx-1 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Search / address bar */}
        <div
          className="flex flex-1 items-center h-[28px] px-3 gap-2 rounded-md min-w-0 transition-all duration-200"
          style={{
            background: focused ? 'rgba(0,0,0,0.58)' : 'rgba(0,0,0,0.4)',
            border: `1px solid ${focused ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.07)'}`,
            boxShadow: focused
              ? '0 0 0 1px rgba(56,189,248,0.08), 0 0 16px rgba(56,189,248,0.05), inset 0 1px 0 rgba(255,255,255,0.04)'
              : 'inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <Search
            className="w-3 h-3 shrink-0 transition-colors duration-200"
            style={{ color: focused ? 'rgba(56,189,248,0.70)' : 'rgba(148,163,184,0.3)' }}
          />
          <input
            type="text"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setAddressBarUrl(e.target.value); }}
            onKeyDown={handleKeyDown}
            onFocus={e => { setFocused(true); e.target.select(); }}
            onBlur={() => { setFocused(false); setInputValue(currentUrl); }}
            className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono text-foreground/80 placeholder:text-muted-foreground/25 min-w-0 caret-primary"
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
          />
          {!focused && pageType !== 'newtab' && (
            <div className={twMerge('flex items-center gap-[4px] px-[6px] py-[2px] rounded border text-[9px] font-bold tracking-[0.12em] uppercase shrink-0', riskCls)}>
              {riskLabel}
            </div>
          )}
        </div>

        <div className="w-px h-4 mx-1 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <NavBtn
            title={bookmarked ? 'Remove bookmark' : canBookmark ? 'Bookmark' : 'Bookmark'}
            active={bookmarked}
            onClick={canBookmark ? handleBookmark : undefined}
          >
            {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </NavBtn>
          <NavBtn
            title="System Panel"
            active={blackdogPanelOpen}
            onClick={() => setBlackdogPanelOpen(!blackdogPanelOpen)}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </NavBtn>
          <NavBtn
            title={investigationMode ? 'Investigation Mode: ON — click to disable' : 'Start Investigation Mode'}
            active={investigationMode}
            onClick={() => toggleInvestigationMode(searchQuery)}
            glow={investigationMode}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </NavBtn>
        </div>
      </div>
    </div>
  );
}

function NavBtn({
  children, title, disabled, active, glow, onClick,
}: {
  children: React.ReactNode; title?: string; disabled?: boolean; active?: boolean; glow?: boolean; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150"
      style={{
        color: disabled ? 'rgba(148,163,184,0.15)' : active ? '#38BDF8' : hovered ? 'rgba(148,163,184,0.8)' : 'rgba(148,163,184,0.4)',
        background: glow ? 'rgba(56,189,248,0.08)' : hovered && !disabled ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: glow ? '1px solid rgba(56,189,248,0.20)' : '1px solid transparent',
        boxShadow: glow ? '0 0 8px rgba(56,189,248,0.12)' : 'none',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
