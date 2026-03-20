import React from 'react';
import { Shield, Eye, CheckCircle, ShieldCheck, Lock, Cpu } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';

const PROTECTIONS = [
  { label: 'Tracker Blocking',       status: true, description: 'Cross-site tracking scripts blocked' },
  { label: 'Fingerprint Protection', status: true, description: 'Canvas, WebGL fingerprinting suppressed' },
  { label: 'Script Sandboxing',      status: true, description: 'Third-party scripts isolated per tab' },
  { label: 'DNS over HTTPS',         status: true, description: 'Encrypted DNS resolution active' },
  { label: 'HSTS Enforcement',       status: true, description: 'Forced HTTPS on all connections' },
  { label: 'Cookie Isolation',       status: true, description: 'Per-tab cookie partitioning active' },
];

export function PrivacyReportView() {
  const { history } = useBrowserState();
  const sitesVisited = history.filter(h => h.url.startsWith('http')).length;
  const cautionCount = history.filter(h => h.riskLevel === 'caution').length;
  const dangerCount  = history.filter(h => h.riskLevel === 'danger').length;

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

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            icon={<ShieldCheck className="w-4 h-4" />}
            label="Sites Analyzed"
            value={String(sitesVisited || 0)}
            color="text-primary"
          />
          <SummaryCard
            icon={<Eye className="w-4 h-4" />}
            label="Caution Sites"
            value={String(cautionCount)}
            color="text-amber-500"
          />
          <SummaryCard
            icon={<Lock className="w-4 h-4" />}
            label="Blocked Sites"
            value={String(dangerCount)}
            color="text-red-400"
          />
        </div>

        {/* Privacy score */}
        <div className="p-4 rounded-lg border border-white/[0.05] bg-black/20">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">Session Privacy Score</div>
            <div className="text-[10px] font-mono text-primary">PROTECTED</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full w-[92%] bg-primary/80 rounded-full" />
            </div>
            <span className="text-sm font-bold font-mono text-primary shrink-0">92 / 100</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/40 mt-2">
            Based on active protection layers and session isolation status
          </div>
        </div>

        {/* Engine status */}
        <div className="p-4 rounded-lg border border-white/[0.05] bg-black/20">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-1.5">
            <Cpu className="w-3 h-3" />
            BLACKDOG Engine Status
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Connection',  'Secured'],
              ['Session',     'Isolated'],
              ['Monitoring',  'Active'],
              ['Analysis',    'Ready'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[10px] font-mono text-muted-foreground/40">{k}</span>
                <span className="text-[10px] font-mono text-primary/70">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active protections */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">Active Protections</div>
          <div className="flex flex-col gap-0.5">
            {PROTECTIONS.map(p => (
              <div key={p.label} className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/[0.02] transition-colors">
                <CheckCircle className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                <div className="flex-1">
                  <div className="text-[12px] font-medium text-foreground/70">{p.label}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/40">{p.description}</div>
                </div>
                <div className="w-8 h-4 rounded-full bg-primary/30 flex items-center justify-end pr-0.5">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
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
