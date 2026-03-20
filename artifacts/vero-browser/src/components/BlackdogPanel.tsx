import React from 'react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { ShieldCheck, Terminal, X, Lock, Globe, Cpu, AlertTriangle, Activity } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

const RISK_STYLES: Record<string, { dot: string; text: string; glow: string }> = {
  safe:    { dot: '#22c55e', text: 'hsl(142 72% 42%)', glow: 'rgba(22,163,74,0.45)' },
  caution: { dot: '#f59e0b', text: '#f59e0b',          glow: 'rgba(245,158,11,0.45)' },
  danger:  { dot: '#ef4444', text: '#ef4444',          glow: 'rgba(239,68,68,0.45)' },
  unknown: { dot: 'rgba(148,163,184,0.5)', text: 'rgba(148,163,184,0.6)', glow: 'transparent' },
};

export function BlackdogPanel() {
  const { blackdogPanelOpen, setBlackdogPanelOpen, logs, activeTab } = useBrowserState();
  const { riskLevel, blackdog } = activeTab;
  const rs = RISK_STYLES[riskLevel] ?? RISK_STYLES.safe;

  return (
    <AnimatePresence>
      {blackdogPanelOpen && (
        <motion.div
          initial={{ x: 280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 280, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 34 }}
          className="w-[272px] shrink-0 flex flex-col h-full z-20 absolute right-0 top-0 bottom-0 md:relative"
          style={{
            background: 'linear-gradient(180deg, rgba(6,7,10,0.97) 0%, rgba(4,5,8,0.99) 100%)',
            borderLeft: '1px solid rgba(255,255,255,0.055)',
            boxShadow: '-12px 0 40px rgba(0,0,0,0.55), inset 1px 0 0 rgba(255,255,255,0.025)',
          }}
        >
          {/* ── Header ── */}
          <div
            className="flex items-center justify-between px-4 py-[11px] shrink-0"
            style={{
              background: 'linear-gradient(180deg, rgba(22,163,74,0.07) 0%, rgba(0,0,0,0) 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.055)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                style={{
                  background: 'hsl(142 72% 38%)',
                  boxShadow: '0 0 6px rgba(22,163,74,0.9), 0 0 14px rgba(22,163,74,0.4)',
                  animation: 'pulse-slow 3s ease-in-out infinite',
                }}
              />
              <Activity className="w-3 h-3" style={{ color: 'hsl(142 72% 40%)', opacity: 0.9 }} />
              <span
                className="text-[10px] font-bold tracking-[0.2em] uppercase"
                style={{ color: 'hsl(142 72% 44%)', opacity: 0.92 }}
              >
                BLACKDOG
              </span>
              <span className="text-[9px] font-mono ml-0.5" style={{ color: 'rgba(148,163,184,0.3)' }}>
                v4.1.2
              </span>
            </div>
            <button
              onClick={() => setBlackdogPanelOpen(false)}
              className="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150"
              style={{ color: 'rgba(148,163,184,0.3)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(148,163,184,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.3)'; }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Engine Status ── */}
          <PanelSection label="Engine Status" right={
            <span className="flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider" style={{ color: 'hsl(142 72% 42%)' }}>
              <ShieldCheck className="w-3 h-3" /> ACTIVE
            </span>
          }>
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.055)' }}
            >
              <StatRow
                icon={<Globe className="w-3 h-3" />}
                label="Trackers Blocked"
                value={String(blackdog.trackers)}
                warn={blackdog.trackers > 0}
              />
              <StatRow
                icon={<Cpu className="w-3 h-3" />}
                label="Scripts Flagged"
                value={String(blackdog.scripts)}
                warn={blackdog.scripts > 3}
                divider
              />
              <StatRow
                icon={<AlertTriangle className="w-3 h-3" />}
                label="Redirects Stopped"
                value={String(blackdog.redirects)}
                warn={blackdog.redirects > 0}
                divider
              />
              <div
                className="flex items-center justify-between px-3 py-[9px]"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.25)' }}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.3)' }} />
                  <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>Page Risk</span>
                </div>
                <span
                  className="text-[11px] font-bold font-mono uppercase tracking-wider"
                  style={{ color: rs.text, textShadow: `0 0 8px ${rs.glow}` }}
                >
                  {riskLevel}
                </span>
              </div>
            </div>
          </PanelSection>

          {/* ── Page Analysis ── */}
          <PanelSection label="Page Analysis">
            <div className="flex flex-col gap-[6px]">
              <InfoLine label="Certificate"    value={blackdog.certificate}                          ok={!blackdog.certificate.includes('None') && !blackdog.certificate.includes('Invalid')} />
              <InfoLine label="HSTS"           value={blackdog.hsts ? 'Enabled' : 'Not found'}       ok={blackdog.hsts} />
              <InfoLine label="Mixed Content"  value={blackdog.mixedContent ? 'Detected' : 'None'}   ok={!blackdog.mixedContent} />
              <InfoLine label="Fingerprinting" value={blackdog.fingerprinting ? 'Detected' : 'None'} ok={!blackdog.fingerprinting} />
            </div>
            {blackdog.findings[0] && (
              <div
                className="mt-2.5 pt-2.5 text-[10px] font-mono leading-snug"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  color: riskLevel === 'danger' ? 'rgba(239,68,68,0.65)'
                       : riskLevel === 'caution' ? 'rgba(245,158,11,0.65)'
                       : 'rgba(148,163,184,0.38)',
                }}
              >
                {blackdog.findings[0]}
              </div>
            )}
          </PanelSection>

          {/* ── Vault ── */}
          <PanelSection label="Vault">
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.055)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <Lock className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.35)' }} />
              <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.45)' }}>
                Locked — authenticate to access
              </span>
            </div>
          </PanelSection>

          {/* ── Live Telemetry ── */}
          <div className="flex flex-col flex-1 min-h-0">
            <div
              className="px-4 py-[9px] flex items-center gap-1.5 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <Terminal className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.35)' }} />
              <span className="section-label">Live Telemetry</span>
            </div>

            <div
              className="flex-1 overflow-y-auto px-3.5 py-2.5 flex flex-col gap-0"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}
            >
              {logs.length === 0 ? (
                <div className="text-center mt-8" style={{ color: 'rgba(148,163,184,0.2)' }}>
                  — no events —
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-[4px]"
                    style={{
                      borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.025)' : 'none',
                    }}
                  >
                    <span
                      className="shrink-0 tabular-nums text-[9px] pt-[1px]"
                      style={{ color: 'rgba(148,163,184,0.2)', minWidth: 52 }}
                    >
                      {log.time}
                    </span>
                    <span
                      className="flex-1 leading-snug break-words"
                      style={{
                        color: log.type === 'alert' ? 'rgba(239,68,68,0.82)'
                             : log.type === 'warn'  ? 'rgba(245,158,11,0.72)'
                             : 'rgba(148,163,184,0.44)',
                        fontWeight: log.type === 'alert' ? 600 : 400,
                      }}
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            className="px-3.5 py-2.5 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}
          >
            <button
              className="w-full py-[7px] text-[9px] font-mono tracking-[0.18em] uppercase rounded-md transition-all duration-150"
              style={{
                color: 'rgba(148,163,184,0.35)',
                border: '1px solid rgba(255,255,255,0.055)',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'rgba(148,163,184,0.7)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(148,163,184,0.35)';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.055)';
              }}
            >
              Export Logs
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PanelSection({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="px-4 py-3 shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="section-label">{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function StatRow({ icon, label, value, warn, divider }: {
  icon: React.ReactNode; label: string; value: string; warn?: boolean; divider?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-[9px] transition-colors duration-100"
      style={{
        borderTop: divider ? '1px solid rgba(255,255,255,0.04)' : 'none',
        background: 'rgba(0,0,0,0.18)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.18)')}
    >
      <div className="flex items-center gap-2" style={{ color: 'rgba(148,163,184,0.3)' }}>
        {icon}
        <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.52)' }}>{label}</span>
      </div>
      <span
        className="text-[11px] font-bold font-mono tabular-nums"
        style={{ color: warn ? '#f59e0b' : 'hsl(142 72% 42%)' }}
      >
        {value}
      </span>
    </div>
  );
}

function InfoLine({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.38)' }}>{label}</span>
      <span
        className="text-[10px] font-mono"
        style={{ color: ok ? 'hsl(142 72% 40%)' : 'rgba(245,158,11,0.65)', opacity: 0.85 }}
      >
        {value}
      </span>
    </div>
  );
}
