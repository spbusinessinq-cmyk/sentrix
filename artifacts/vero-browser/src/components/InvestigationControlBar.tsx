import React, { useState, useRef, useEffect } from 'react';
import { Crosshair, Plus, X, Check } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';

export function InvestigationControlBar() {
  const {
    investigationMode, toggleInvestigationMode,
    activeInvestigationId, investigations, savedItems, sageAnalyses,
    startInvestigation, setActiveInvestigation, navigate,
  } = useBrowserState();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCreate) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showCreate]);

  const activeInv = investigations.find(i => i.id === activeInvestigationId);
  const invSourceCount = activeInv ? savedItems.filter(s => activeInv.savedItemIds.includes(s.id)).length : 0;
  const invAnalysisCount = activeInv ? (activeInv.analysisIds ?? []).length : 0;
  const invTotalItems = invSourceCount + invAnalysisCount;

  const handleToggle = () => {
    if (!investigationMode && investigations.length === 0) {
      setShowCreate(true);
      return;
    }
    toggleInvestigationMode();
  };

  const handleCreate = () => {
    const name = newName.trim() || `Investigation ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    startInvestigation(name);
    setNewName('');
    setShowCreate(false);
    if (!investigationMode) toggleInvestigationMode();
  };

  const handleCancelCreate = () => {
    setShowCreate(false);
    setNewName('');
  };

  const modeColor = 'hsl(142 72% 38%)';
  const modeBorderColor = 'rgba(22,163,74,0.25)';
  const modeBg = 'rgba(22,163,74,0.07)';

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4 h-[30px] overflow-hidden"
      style={{
        background: investigationMode
          ? 'rgba(22,163,74,0.04)'
          : 'rgba(0,0,0,0.25)',
        borderBottom: `1px solid ${investigationMode ? 'rgba(22,163,74,0.15)' : 'rgba(255,255,255,0.04)'}`,
        transition: 'background 300ms ease-out, border-color 300ms ease-out',
      }}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Crosshair
          className="w-3 h-3 shrink-0"
          style={{ color: investigationMode ? modeColor : 'rgba(148,163,184,0.28)' }}
        />
        <span
          className="text-[8.5px] font-mono uppercase tracking-[0.18em] font-semibold"
          style={{ color: investigationMode ? modeColor : 'rgba(148,163,184,0.28)' }}
        >
          Investigation
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-3 shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Status / Create input */}
      {showCreate ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            ref={inputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') handleCancelCreate();
            }}
            placeholder="Name this investigation…"
            className="flex-1 min-w-0 bg-transparent text-[10px] font-mono outline-none"
            style={{
              color: 'rgba(148,163,184,0.8)',
              borderBottom: '1px solid rgba(22,163,74,0.4)',
            }}
          />
          <button
            onClick={handleCreate}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono tracking-[0.1em] uppercase transition-all"
            style={{
              background: modeBg,
              border: `1px solid ${modeBorderColor}`,
              color: modeColor,
            }}
          >
            <Check className="w-2.5 h-2.5" />
            Create
          </button>
          <button
            onClick={handleCancelCreate}
            className="p-0.5 rounded"
            style={{ color: 'rgba(148,163,184,0.3)' }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {activeInv ? (
            <button
              onClick={() => navigate('sentrix://investigations')}
              className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity"
              title="View investigation"
            >
              {investigationMode && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                  style={{ background: modeColor }}
                />
              )}
              <span
                className="text-[10px] font-mono truncate"
                style={{ color: investigationMode ? 'rgba(34,197,94,0.8)' : 'rgba(148,163,184,0.5)' }}
              >
                {activeInv.name}
              </span>
              {invTotalItems > 0 && (
                <span
                  className="text-[9px] font-mono shrink-0"
                  style={{ color: 'rgba(148,163,184,0.35)' }}
                >
                  · {invTotalItems} item{invTotalItems !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          ) : (
            <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.25)' }}>
              No active investigation
            </span>
          )}

          {/* Auto-capture indicator */}
          {investigationMode && (
            <span
              className="text-[8.5px] font-mono uppercase tracking-[0.15em] shrink-0"
              style={{ color: 'rgba(22,163,74,0.55)' }}
            >
              · auto-capture active
            </span>
          )}

          {/* Create new button (when mode is active but want to switch) */}
          {!investigationMode && investigations.length > 0 && !activeInv && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 text-[9px] font-mono shrink-0"
              style={{ color: 'rgba(148,163,184,0.3)' }}
            >
              <Plus className="w-2.5 h-2.5" />
              New
            </button>
          )}
        </div>
      )}

      {/* Right: Toggle button */}
      {!showCreate && (
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {investigations.length > 0 && !investigationMode && !activeInvestigationId && (
            <button
              onClick={() => {
                const first = investigations[0];
                setActiveInvestigation(first.id);
              }}
              className="text-[8.5px] font-mono uppercase tracking-[0.12em] transition-all"
              style={{ color: 'rgba(148,163,184,0.3)' }}
            >
              select
            </button>
          )}
          <button
            onClick={handleToggle}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded transition-all duration-200"
            style={{
              background: investigationMode ? modeBg : 'rgba(255,255,255,0.04)',
              border: `1px solid ${investigationMode ? modeBorderColor : 'rgba(255,255,255,0.07)'}`,
              color: investigationMode ? modeColor : 'rgba(148,163,184,0.4)',
            }}
            title={investigationMode ? 'Disable investigation mode' : 'Enable investigation mode'}
          >
            <span
              className={`w-1 h-1 rounded-full shrink-0 ${investigationMode ? 'animate-pulse' : ''}`}
              style={{ background: investigationMode ? modeColor : 'rgba(148,163,184,0.3)' }}
            />
            <span className="text-[8.5px] font-mono uppercase tracking-[0.14em] font-semibold">
              {investigationMode ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
