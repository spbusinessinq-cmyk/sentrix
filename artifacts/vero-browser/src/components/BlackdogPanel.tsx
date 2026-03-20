import React from 'react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { ShieldCheck, Terminal, X, Lock, Globe, Cpu, AlertTriangle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

export function BlackdogPanel() {
  const { blackdogPanelOpen, setBlackdogPanelOpen, logs, activeTab } = useBrowserState();
  const { riskLevel, blackdog } = activeTab;

  const riskColor =
    riskLevel === 'danger' ? 'text-red-500' :
    riskLevel === 'caution' ? 'text-amber-500' :
    riskLevel === 'unknown' ? 'text-muted-foreground' :
    'text-primary';

  return (
    <AnimatePresence>
      {blackdogPanelOpen && (
        <motion.div
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-[272px] shrink-0 border-l border-white/[0.05] bg-black/40 backdrop-blur-xl flex flex-col h-full z-20 absolute right-0 top-0 bottom-0 md:relative shadow-[-8px_0_24px_rgba(0,0,0,0.4)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-black/20 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(22,163,74,0.7)] animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase">BLACKDOG</span>
              <span className="text-[9px] font-mono text-muted-foreground/40 ml-1">v4.1.2</span>
            </div>
            <button onClick={() => setBlackdogPanelOpen(false)} className="p-1 rounded hover:bg-white/[0.06] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Engine Status */}
          <div className="px-4 py-3 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">Engine Status</span>
              <span className="text-[9px] font-mono text-primary flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> ACTIVE
              </span>
            </div>

            <div className="flex flex-col gap-px rounded border border-white/[0.05] overflow-hidden">
              <StatRow icon={<Globe className="w-3 h-3" />} label="Trackers Blocked" value={String(blackdog.trackers)} valueColor={blackdog.trackers > 0 ? 'text-amber-500' : 'text-primary'} />
              <StatRow icon={<Cpu className="w-3 h-3" />} label="Scripts Flagged" value={String(blackdog.scripts)} valueColor={blackdog.scripts > 3 ? 'text-amber-500' : 'text-foreground/60'} />
              <StatRow icon={<AlertTriangle className="w-3 h-3" />} label="Redirects Stopped" value={String(blackdog.redirects)} valueColor={blackdog.redirects > 0 ? 'text-amber-500' : 'text-foreground/60'} />
              <StatRow icon={<ShieldCheck className="w-3 h-3" />} label="Page Risk" value={riskLevel.toUpperCase()} valueColor={riskColor} />
            </div>
          </div>

          {/* Page Analysis */}
          <div className="px-4 py-3 border-b border-white/[0.05] shrink-0">
            <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-2">Page Analysis</div>
            <div className="flex flex-col gap-1.5">
              <InfoLine label="Certificate" value={blackdog.certificate} ok={blackdog.certificate !== 'None — HTTP only' && blackdog.certificate !== 'Invalid / Self-signed'} />
              <InfoLine label="HSTS" value={blackdog.hsts ? 'Enabled' : 'Not found'} ok={blackdog.hsts} />
              <InfoLine label="Mixed Content" value={blackdog.mixedContent ? 'Detected' : 'None'} ok={!blackdog.mixedContent} />
              <InfoLine label="Fingerprinting" value={blackdog.fingerprinting ? 'Detected' : 'Not detected'} ok={!blackdog.fingerprinting} />
              {blackdog.findings[0] && (
                <div className="pt-1.5 border-t border-white/[0.04] mt-1">
                  <div className={twMerge('text-[10px] font-mono leading-snug',
                    riskLevel === 'danger' ? 'text-red-500/70' :
                    riskLevel === 'caution' ? 'text-amber-500/70' :
                    'text-foreground/40'
                  )}>
                    {blackdog.findings[0]}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vault */}
          <div className="px-4 py-3 border-b border-white/[0.05] shrink-0">
            <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-2">Vault</div>
            <div className="flex items-center gap-2 px-3 py-2 rounded border border-white/[0.05] bg-black/20">
              <Lock className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground/50">Locked — authenticate to access</span>
            </div>
          </div>

          {/* Live Telemetry */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-2.5 flex items-center gap-1.5 border-b border-white/[0.05] shrink-0">
              <Terminal className="w-3 h-3 text-muted-foreground/40" />
              <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50">Live Telemetry</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[10px] flex flex-col gap-2">
              {logs.length === 0 ? (
                <div className="text-muted-foreground/20 text-center mt-8">— no events —</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-muted-foreground/25 shrink-0 tabular-nums">{log.time}</span>
                    <span className={twMerge('flex-1 leading-snug break-words',
                      log.type === 'warn' ? 'text-amber-500/70' :
                      log.type === 'alert' ? 'text-red-500/80 font-semibold' :
                      'text-foreground/45'
                    )}>
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-3 py-2.5 border-t border-white/[0.05] shrink-0 bg-black/20">
            <button className="w-full py-1.5 text-[10px] font-mono tracking-widest uppercase text-muted-foreground/40 hover:text-muted-foreground/70 border border-white/[0.05] rounded hover:bg-white/[0.03] transition-all">
              Export Logs
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatRow({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-black/20 hover:bg-black/40 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground/35">
        {icon}
        <span className="text-[10px] font-mono text-muted-foreground/55">{label}</span>
      </div>
      <span className={twMerge('text-[11px] font-bold font-mono tabular-nums', valueColor)}>{value}</span>
    </div>
  );
}

function InfoLine({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono text-muted-foreground/40">{label}</span>
      <span className={twMerge('text-[10px] font-mono', ok ? 'text-primary/65' : 'text-amber-500/65')}>{value}</span>
    </div>
  );
}
