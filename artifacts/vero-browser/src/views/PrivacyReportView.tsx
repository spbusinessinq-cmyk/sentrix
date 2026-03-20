import React from 'react';
import { Shield, Eye, ShieldCheck, Lock, Cpu, Flame, Clock } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

const SENTRIX_POLICIES = [
  {
    label: 'Tab session isolation',
    description: 'Each tab maintains its own navigation state, history, and risk context — no cross-tab data leakage within Sentrix',
    active: true,
  },
  {
    label: 'Burn session (one-click wipe)',
    description: 'Instant full wipe of tabs, history, bookmarks, and all Sentrix-persisted data on demand',
    active: true,
  },
  {
    label: 'Heuristic URL risk classification',
    description: 'URLs are analyzed against known pattern databases and domain reputation signals before navigation completes',
    active: true,
  },
  {
    label: 'High-risk domain blocking',
    description: 'Domains matching known danger signatures show a block screen. User must actively override to proceed',
    active: true,
  },
  {
    label: 'Session persistence control',
    description: 'You control what is saved and when it is cleared — including disabling all session persistence via Clear Data on Exit',
    active: true,
  },
  {
    label: 'Download risk tracking',
    description: 'File-type navigation events are logged and risk-classified before completion — blocked if danger risk is detected',
    active: true,
  },
];

export function PrivacyReportView() {
  const { history, settings, blackdogStatus, burnSession } = useBrowserState();
  const sitesVisited = history.filter(h => h.url.startsWith('http')).length;
  const cautionCount = history.filter(h => h.riskLevel === 'caution').length;
  const dangerCount  = history.filter(h => h.riskLevel === 'danger').length;
  const safeCount    = history.filter(h => h.riskLevel === 'safe').length;

  const bdStatusColor =
    blackdogStatus === 'connected' ? 'text-primary/70' :
    blackdogStatus === 'unavailable' ? 'text-red-500/70' : 'text-amber-500/70';
  const bdStatusLabel =
    blackdogStatus === 'connected' ? 'Active' :
    blackdogStatus === 'unavailable' ? 'Unavailable' : 'Connecting…';

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="px-6 py-4 border-b border-white/[0.05] bg-black/20">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">sentrix://privacy</div>
        <h2 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary/70" />
          Privacy Report
        </h2>
      </div>

      <div className="px-6 py-5 max-w-2xl space-y-6">

        {/* Session stats — real from history */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            icon={<ShieldCheck className="w-4 h-4" />}
            label="Sites Visited"
            value={String(sitesVisited || 0)}
            color="text-primary"
          />
          <SummaryCard
            icon={<Eye className="w-4 h-4" />}
            label="Caution Flagged"
            value={String(cautionCount)}
            color="text-amber-500"
          />
          <SummaryCard
            icon={<Lock className="w-4 h-4" />}
            label="Danger Blocked"
            value={String(dangerCount)}
            color="text-red-400"
          />
        </div>

        {/* Session breakdown */}
        {sitesVisited > 0 && (
          <div className="p-4 rounded-lg border border-white/[0.05] bg-black/20">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">Session Breakdown</div>
            <div className="space-y-2">
              {[
                { label: 'Safe sites', value: safeCount, color: 'text-primary/70', bar: 'bg-primary/50' },
                { label: 'Caution sites', value: cautionCount, color: 'text-amber-500/70', bar: 'bg-amber-500/50' },
                { label: 'Danger blocked', value: dangerCount, color: 'text-red-500/70', bar: 'bg-red-500/50' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className={twMerge('text-[10px] font-mono w-28 shrink-0', row.color)}>{row.label}</span>
                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className={twMerge('h-full rounded-full transition-all', row.bar)}
                      style={{ width: sitesVisited > 0 ? `${Math.min(100, (row.value / sitesVisited) * 100)}%` : '0%' }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/40 w-4 text-right shrink-0">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BLACKDOG status */}
        <div className="p-4 rounded-lg border border-white/[0.05] bg-black/20">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-1.5">
            <Cpu className="w-3 h-3" />
            BLACKDOG Engine
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Engine', bdStatusLabel],
              ['Session', 'Isolated'],
              ['Monitoring', blackdogStatus === 'connected' ? 'Active' : 'Pending'],
              ['Analysis', blackdogStatus === 'connected' ? 'Ready' : 'Pending'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[10px] font-mono text-muted-foreground/40">{k}</span>
                <span className={twMerge('text-[10px] font-mono', k === 'Engine' ? bdStatusColor : 'text-primary/70')}>{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/[0.04] text-[10px] font-mono text-muted-foreground/30 leading-relaxed">
            BLACKDOG is a private engine. Only its connection state is reported here.
          </div>
        </div>

        {/* Active session policies — honest, real */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-1">Sentrix Session Policies</div>
          <div className="text-[10px] font-mono text-muted-foreground/30 mb-3 leading-relaxed">
            These are protections Sentrix directly owns and enforces in this session. They do not require browser-engine access.
          </div>
          <div className="flex flex-col gap-0.5">
            {SENTRIX_POLICIES.map(p => (
              <div key={p.label} className="flex items-start gap-3 px-3 py-2.5 rounded hover:bg-white/[0.02] transition-colors">
                <ShieldCheck className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-foreground/70">{p.label}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/40 leading-relaxed">{p.description}</div>
                </div>
                <div className="w-8 h-4 rounded-full bg-primary/30 flex items-center justify-end pr-0.5 shrink-0 mt-0.5">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active settings that affect privacy */}
        <div className="p-4 rounded-lg border border-white/[0.05] bg-black/20">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">Active Session Settings</div>
          <div className="space-y-2">
            {[
              { label: 'Session Restore', value: settings.sessionRestore ? 'Enabled' : 'Disabled', ok: settings.sessionRestore },
              { label: 'Clear Data on Exit', value: settings.clearDataOnExit ? 'Active' : 'Off', ok: settings.clearDataOnExit },
            ].map(({ label, value, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground/40">{label}</span>
                <span className={twMerge('text-[11px] font-mono', ok ? 'text-primary/70' : 'text-muted-foreground/40')}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent danger items from history */}
        {dangerCount > 0 && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Danger events this session
            </div>
            <div className="flex flex-col gap-1">
              {history.filter(h => h.riskLevel === 'danger').slice(0, 5).map(h => (
                <div key={h.id} className="flex items-center gap-3 px-3 py-2 rounded border border-red-500/10 bg-red-500/[0.03]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 shrink-0" />
                  <span className="text-[11px] font-mono text-red-400/70 flex-1 truncate">{h.title}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/30 shrink-0">{format(h.visitedAt, 'HH:mm')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Burn session shortcut */}
        <div
          className="flex items-center justify-between px-4 py-3.5 rounded-xl border cursor-pointer transition-all group"
          style={{ background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(239,68,68,0.12)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.12)'; }}
          onClick={burnSession}
        >
          <div className="flex items-center gap-3">
            <Flame className="w-4 h-4 text-red-500/70" />
            <div>
              <div className="text-[13px] font-medium text-red-400/80">Burn Session</div>
              <div className="text-[10px] font-mono text-muted-foreground/40">Wipe all tabs, history, bookmarks, and session data immediately</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-red-500/50 uppercase tracking-wider">Run</span>
        </div>

      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-lg border border-white/[0.05] bg-black/20">
      <div className={twMerge('mb-2 text-muted-foreground/50', color)}>{icon}</div>
      <div className={twMerge('text-xl font-bold font-mono mb-1', color)}>{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">{label}</div>
    </div>
  );
}
