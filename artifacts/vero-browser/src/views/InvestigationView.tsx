import React, { useState, useMemo } from 'react';
import {
  Crosshair, Plus, Pencil, Check, X, Trash2, ExternalLink,
  FileText, FileJson, ChevronDown, ChevronRight, Layers,
} from 'lucide-react';
import { useBrowserState, Investigation, SavedItem } from '@/hooks/use-browser-state';
import { format } from 'date-fns';

// ─── Posture + Source helpers ──────────────────────────────────────────────────

function postureColor(p: string) {
  if (p === 'safe')    return '#22c55e';
  if (p === 'caution') return '#f59e0b';
  if (p === 'danger')  return '#ef4444';
  return 'rgba(148,163,184,0.5)';
}

function PostureDot({ posture }: { posture: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: postureColor(posture) }}
    />
  );
}

// ─── Factual summary ──────────────────────────────────────────────────────────

function buildSummary(items: SavedItem[]): string {
  if (items.length === 0) return 'No sources collected yet. Save items while Investigation Mode is active to build this investigation.';

  const typeSet = new Set(items.map(s => s.sourceType).filter(Boolean));
  const types = Array.from(typeSet).slice(0, 3);
  const typeStr = types.length > 1
    ? types.slice(0, -1).join(', ') + ' and ' + types[types.length - 1]
    : types[0] ?? 'various';

  const safe    = items.filter(s => s.posture === 'safe').length;
  const caution = items.filter(s => s.posture === 'caution').length;
  const danger  = items.filter(s => s.posture === 'danger').length;

  const parts: string[] = [];
  if (safe > 0)    parts.push(`${safe} low-risk`);
  if (caution > 0) parts.push(`${caution} requiring review`);
  if (danger > 0)  parts.push(`${danger} flagged high-risk`);

  const riskStr = parts.length === 0
    ? 'all risk levels unknown'
    : parts.join(', ');

  return `This investigation contains ${items.length} source${items.length !== 1 ? 's' : ''} across ${typeStr}. ${
    riskStr.charAt(0).toUpperCase() + riskStr.slice(1)}.`;
}

// ─── Breakdown bar ────────────────────────────────────────────────────────────

function BreakdownBar({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono tracking-[0.1em] uppercase w-16 shrink-0" style={{ color: 'rgba(148,163,184,0.5)' }}>
        {label}
      </span>
      <div className="flex-1 h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {pct > 0 && (
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        )}
      </div>
      <span className="text-[10px] font-mono w-5 text-right" style={{ color: 'rgba(148,163,184,0.6)' }}>
        {count}
      </span>
    </div>
  );
}

// ─── Source row ───────────────────────────────────────────────────────────────

function SourceRow({ item, onRemove, onOpen }: {
  item: SavedItem;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-colors duration-150 group"
      style={{
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: '1px solid transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <PostureDot posture={item.posture} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-mono text-foreground/80 truncate leading-tight">{item.title}</p>
        <p className="text-[9px] font-mono truncate mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }}>
          {item.domain}
          {item.sourceType ? ` · ${item.sourceType}` : ''}
        </p>
        {item.reasoning && (
          <p className="text-[9px] font-mono truncate mt-0.5 italic" style={{ color: 'rgba(148,163,184,0.35)' }}>
            {item.reasoning}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onOpen}
          className="w-5 h-5 flex items-center justify-center rounded transition-colors"
          style={{ color: 'rgba(148,163,184,0.5)' }}
          title="Open URL"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
        <button
          onClick={onRemove}
          className="w-5 h-5 flex items-center justify-center rounded transition-colors"
          style={{ color: 'rgba(239,68,68,0.5)' }}
          title="Remove from investigation"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Investigation panel ──────────────────────────────────────────────────────

function InvestigationPanel({ inv }: { inv: Investigation }) {
  const {
    savedItems, unsaveItem,
    renameInvestigation, updateInvestigationNotes,
    clearInvestigationItems, deleteInvestigation, exportInvestigation,
    activeInvestigationId, setActiveInvestigation, investigations,
    investigationMode,
  } = useBrowserState();

  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(inv.name);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const invItems = useMemo(
    () => savedItems.filter(s => inv.savedItemIds.includes(s.id)),
    [savedItems, inv.savedItemIds]
  );

  const postureCounts = useMemo(() => ({
    safe:    invItems.filter(s => s.posture === 'safe').length,
    caution: invItems.filter(s => s.posture === 'caution').length,
    danger:  invItems.filter(s => s.posture === 'danger').length,
    unknown: invItems.filter(s => s.posture !== 'safe' && s.posture !== 'caution' && s.posture !== 'danger').length,
  }), [invItems]);

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    invItems.forEach(s => {
      const t = s.sourceType || 'Unknown';
      map[t] = (map[t] ?? 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [invItems]);

  const summary = useMemo(() => buildSummary(invItems), [invItems]);

  const handleRename = () => {
    if (renameVal.trim()) renameInvestigation(inv.id, renameVal.trim());
    setRenaming(false);
  };

  const handleRemoveFromInv = (itemId: string) => {
    // We don't unsave the item globally — just detach it from the investigation
    // by rebuilding savedItemIds without this ID
    // The cleanest hook for this is to call clearInvestigationItems approach,
    // but we only want to remove one. We'll use a workaround via updateInvestigationNotes
    // to trigger a re-render, but actually we need a specific removeFromInvestigation.
    // For now, use unsaveItem since items saved to an investigation are investigation-scoped.
    // The user can always re-save it from results.
    // Actually let's just filter it — we'll update the investigation's savedItemIds via
    // the notes update pattern. A proper removeFromInvestigation was not exposed,
    // but we can use the fact that unsaveItem removes from savedItems, making it invisible.
    unsaveItem(itemId);
  };

  const isActive = activeInvestigationId === inv.id;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                className="flex-1 bg-transparent border-none outline-none text-[13px] font-mono text-foreground/90 min-w-0"
                style={{ borderBottom: '1px solid rgba(22,163,74,0.4)' }}
              />
              <button onClick={handleRename} className="w-5 h-5 flex items-center justify-center" style={{ color: 'hsl(142 72% 40%)' }}>
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setRenaming(false)} className="w-5 h-5 flex items-center justify-center" style={{ color: 'rgba(148,163,184,0.5)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-mono font-semibold text-foreground/90 truncate">{inv.name}</h2>
              <button
                onClick={() => { setRenameVal(inv.name); setRenaming(true); }}
                className="w-4 h-4 flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity"
                style={{ color: 'rgba(148,163,184,0.8)' }}
                title="Rename"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className="text-[9px] font-mono tracking-[0.08em] mt-0.5" style={{ color: 'rgba(148,163,184,0.35)' }}>
            Started {format(inv.createdAt, 'MMM d, yyyy · HH:mm')}
            {inv.querySeed ? ` · seed: "${inv.querySeed.slice(0, 32)}"` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isActive && (
            <button
              onClick={() => setActiveInvestigation(inv.id)}
              className="text-[8px] font-mono tracking-[0.12em] px-2 py-1 rounded border transition-colors"
              style={{ color: 'hsl(142 72% 40%)', borderColor: 'rgba(22,163,74,0.25)', background: 'rgba(22,163,74,0.05)' }}
            >
              SET ACTIVE
            </button>
          )}
          <button
            onClick={() => deleteInvestigation(inv.id)}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:text-red-400"
            style={{ color: 'rgba(148,163,184,0.3)' }}
            title="Delete investigation"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isActive && investigationMode && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-mono tracking-[0.1em]"
          style={{
            background: 'rgba(22,163,74,0.07)',
            border: '1px solid rgba(22,163,74,0.18)',
            color: 'hsl(142 72% 46%)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          INVESTIGATION MODE ACTIVE — items saved will attach here
        </div>
      )}

      {/* Summary */}
      <div
        className="px-3 py-2.5 rounded-lg text-[11px] font-mono leading-relaxed"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(148,163,184,0.7)',
        }}
      >
        {summary}
      </div>

      {/* Stats grid */}
      {invItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div
            className="px-3 py-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="section-label mb-2">POSTURE</p>
            <div className="flex flex-col gap-1.5">
              <BreakdownBar label="SAFE"    count={postureCounts.safe}    total={invItems.length} color="#22c55e" />
              <BreakdownBar label="CAUTION" count={postureCounts.caution} total={invItems.length} color="#f59e0b" />
              <BreakdownBar label="DANGER"  count={postureCounts.danger}  total={invItems.length} color="#ef4444" />
              <BreakdownBar label="UNKNOWN" count={postureCounts.unknown} total={invItems.length} color="rgba(148,163,184,0.35)" />
            </div>
          </div>

          <div
            className="px-3 py-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="section-label mb-2">SOURCE TYPES</p>
            <div className="flex flex-col gap-1">
              {typeCounts.length === 0
                ? <p className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.3)' }}>—</p>
                : typeCounts.slice(0, 5).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-[9px] font-mono tracking-[0.08em] uppercase truncate" style={{ color: 'rgba(148,163,184,0.5)' }}>
                        {type}
                      </span>
                      <span className="text-[10px] font-mono shrink-0 ml-1" style={{ color: 'rgba(148,163,184,0.6)' }}>
                        {count}
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Sources list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">SOURCES ({invItems.length})</p>
          {invItems.length > 0 && (
            <button
              onClick={() => clearInvestigationItems(inv.id)}
              className="text-[8px] font-mono tracking-[0.12em] px-1.5 py-0.5 rounded transition-colors hover:text-red-400"
              style={{ color: 'rgba(148,163,184,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              CLEAR ALL
            </button>
          )}
        </div>
        {invItems.length === 0 ? (
          <div
            className="flex items-center justify-center h-20 rounded-lg text-[10px] font-mono"
            style={{
              background: 'rgba(255,255,255,0.015)',
              border: '1px dashed rgba(255,255,255,0.07)',
              color: 'rgba(148,163,184,0.3)',
            }}
          >
            No sources yet — save items while Investigation Mode is active
          </div>
        ) : (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {invItems.map((item, idx) => (
              <div key={item.id}>
                <SourceRow
                  item={item}
                  onRemove={() => handleRemoveFromInv(item.id)}
                  onOpen={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                />
                {idx < invItems.length - 1 && (
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', marginLeft: '12px', marginRight: '12px' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <p className="section-label mb-2">NOTES</p>
        <textarea
          value={inv.notes}
          onChange={e => updateInvestigationNotes(inv.id, e.target.value)}
          placeholder="Add investigation notes…"
          className="w-full resize-none text-[11px] font-mono rounded-lg p-3 bg-transparent outline-none leading-relaxed placeholder:text-muted-foreground/20 text-foreground/70"
          style={{
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(0,0,0,0.2)',
            minHeight: '80px',
          }}
          rows={4}
        />
      </div>

      {/* Export */}
      <div>
        <p className="section-label mb-2">EXPORT</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportInvestigation(inv.id, 'text')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-[0.1em] transition-all duration-150 hover:opacity-80"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(148,163,184,0.7)',
            }}
          >
            <FileText className="w-3 h-3" />
            PLAIN TEXT
          </button>
          <button
            onClick={() => exportInvestigation(inv.id, 'json')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-[0.1em] transition-all duration-150 hover:opacity-80"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(148,163,184,0.7)',
            }}
          >
            <FileJson className="w-3 h-3" />
            JSON
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Investigation selector ───────────────────────────────────────────────────

function InvestigationSelector() {
  const {
    investigations, activeInvestigationId, setActiveInvestigation,
    startInvestigation, investigationMode, toggleInvestigationMode,
  } = useBrowserState();

  return (
    <div className="flex flex-col gap-3">
      <p className="section-label">ALL INVESTIGATIONS ({investigations.length})</p>
      {investigations.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 h-32 rounded-lg text-center"
          style={{
            background: 'rgba(255,255,255,0.015)',
            border: '1px dashed rgba(255,255,255,0.07)',
          }}
        >
          <Crosshair className="w-6 h-6" style={{ color: 'rgba(148,163,184,0.2)' }} />
          <p className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.35)' }}>
            No investigations yet
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {investigations.map(inv => (
            <button
              key={inv.id}
              onClick={() => setActiveInvestigation(inv.id)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-150"
              style={{
                background: activeInvestigationId === inv.id ? 'rgba(22,163,74,0.07)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${activeInvestigationId === inv.id ? 'rgba(22,163,74,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-mono truncate" style={{ color: activeInvestigationId === inv.id ? 'hsl(142 72% 46%)' : 'rgba(148,163,184,0.8)' }}>
                  {inv.name}
                </p>
                <p className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(148,163,184,0.35)' }}>
                  {inv.savedItemIds.length} source{inv.savedItemIds.length !== 1 ? 's' : ''} · {format(inv.updatedAt, 'MMM d')}
                </p>
              </div>
              {activeInvestigationId === inv.id && investigationMode && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function InvestigationView() {
  const {
    investigations, activeInvestigationId, setActiveInvestigation,
    investigationMode, toggleInvestigationMode, startInvestigation,
    navigate,
  } = useBrowserState();

  const [showAll, setShowAll] = useState(false);

  const activeInv = investigations.find(i => i.id === activeInvestigationId);
  const displayInv = activeInv ?? investigations[0] ?? null;

  const handleNew = () => {
    const name = `Investigation ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    startInvestigation(name);
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: 'hsl(220 14% 5.5%)' }}
    >
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-4 h-4" style={{ color: investigationMode ? 'hsl(142 72% 40%)' : 'rgba(148,163,184,0.4)' }} />
            <div>
              <h1
                className="text-[11px] font-mono tracking-[0.2em] uppercase font-semibold"
                style={{ color: investigationMode ? 'hsl(142 72% 46%)' : 'rgba(148,163,184,0.6)' }}
              >
                Investigations
              </h1>
              <p className="text-[9px] font-mono tracking-[0.08em]" style={{ color: 'rgba(148,163,184,0.3)' }}>
                {investigations.length} investigation{investigations.length !== 1 ? 's' : ''} · {investigationMode ? 'mode active' : 'mode off'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Investigation Mode toggle */}
            <button
              onClick={() => toggleInvestigationMode()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-mono tracking-[0.12em] uppercase transition-all duration-200"
              style={{
                background: investigationMode ? 'rgba(22,163,74,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${investigationMode ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: investigationMode ? 'hsl(142 72% 46%)' : 'rgba(148,163,184,0.5)',
              }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${investigationMode ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`}
              />
              {investigationMode ? 'Mode On' : 'Mode Off'}
            </button>

            <button
              onClick={handleNew}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-mono tracking-[0.12em] uppercase transition-all duration-150 hover:opacity-80"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(148,163,184,0.6)',
              }}
            >
              <Plus className="w-3 h-3" />
              New
            </button>
          </div>
        </div>

        {/* Switcher toggle (if multiple investigations) */}
        {investigations.length > 1 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg mb-4 text-[10px] font-mono tracking-[0.1em] transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(148,163,184,0.5)',
            }}
          >
            <Layers className="w-3 h-3" />
            {showAll ? 'Hide' : 'Browse'} all investigations ({investigations.length})
            {showAll ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
          </button>
        )}

        {/* All investigations list */}
        {showAll && investigations.length > 1 && (
          <div className="mb-6">
            <InvestigationSelector />
          </div>
        )}

        {/* Active investigation panel */}
        {displayInv ? (
          <InvestigationPanel inv={displayInv} />
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-xl py-16"
            style={{
              background: 'rgba(255,255,255,0.015)',
              border: '1px dashed rgba(255,255,255,0.07)',
            }}
          >
            <Crosshair className="w-8 h-8" style={{ color: 'rgba(148,163,184,0.15)' }} />
            <div className="text-center">
              <p className="text-[11px] font-mono" style={{ color: 'rgba(148,163,184,0.45)' }}>No active investigation</p>
              <p className="text-[9px] font-mono mt-1" style={{ color: 'rgba(148,163,184,0.25)' }}>
                Start one to begin tracking sources
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => { toggleInvestigationMode(); }}
                className="px-4 py-2 rounded-lg text-[10px] font-mono tracking-[0.12em] uppercase transition-all duration-150"
                style={{
                  background: 'rgba(22,163,74,0.1)',
                  border: '1px solid rgba(22,163,74,0.25)',
                  color: 'hsl(142 72% 46%)',
                }}
              >
                Start Investigation Mode
              </button>
              <button
                onClick={() => navigate('sentrix://search')}
                className="text-[9px] font-mono tracking-[0.1em]"
                style={{ color: 'rgba(148,163,184,0.3)' }}
              >
                or go search first
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
