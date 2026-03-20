import React from 'react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { ShieldCheck, X, Lock, Activity, Wifi, Eye, CheckCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

const RISK_STYLES: Record<string, { dot: string; text: string; glow: string }> = {
  safe:    { dot: '#22c55e', text: 'hsl(142 72% 42%)', glow: 'rgba(22,163,74,0.45)' },
  caution: { dot: '#f59e0b', text: '#f59e0b',          glow: 'rgba(245,158,11,0.45)' },
  danger:  { dot: '#ef4444', text: '#ef4444',          glow: 'rgba(239,68,68,0.45)' },
  unknown: { dot: 'rgba(148,163,184,0.5)', text: 'rgba(148,163,184,0.6)', glow: 'transparent' },
};

export function BlackdogPanel() {
  const { blackdogPanelOpen, setBlackdogPanelOpen, activeTab, blackdogStatus } = useBrowserState();
  const { riskLevel, blackdog } = activeTab;
  const rs = RISK_STYLES[riskLevel] ?? RISK_STYLES.safe;
  const isConnected = blackdogStatus === 'connected';

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
                  background: isConnected ? 'hsl(142 72% 38%)' : 'rgba(245,158,11,0.7)',
                  boxShadow: isConnected
                    ? '0 0 6px rgba(22,163,74,0.9), 0 0 14px rgba(22,163,74,0.4)'
                    : '0 0 6px rgba(245,158,11,0.7)',
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

          {/* ── Connection Status ── */}
          <PanelSection label="Engine Status" right={
            <span
              className="flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider"
              style={{ color: isConnected ? 'hsl(142 72% 42%)' : 'rgba(245,158,11,0.8)' }}
            >
              <ShieldCheck className="w-3 h-3" />
              {isConnected ? 'ACTIVE' : 'CONNECTING'}
            </span>
          }>
            <AnimatePresence mode="wait">
              {isConnected ? (
                <motion.div
                  key="connected"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg overflow-hidden flex flex-col"
                  style={{ border: '1px solid rgba(255,255,255,0.055)' }}
                >
                  <StatusRow icon={<Wifi className="w-3 h-3" />}   label="Engine"    value="CONNECTED"        ok />
                  <StatusRow icon={<ShieldCheck className="w-3 h-3" />} label="Session" value="Protected"    ok divider />
                  <StatusRow icon={<Eye className="w-3 h-3" />}    label="Monitoring" value="Active"          ok divider />
                  <StatusRow icon={<CheckCircle className="w-3 h-3" />} label="Analysis" value="Ready"       ok divider />
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
                </motion.div>
              ) : (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg px-3 py-3 flex items-center gap-2.5"
                  style={{
                    border: '1px solid rgba(245,158,11,0.15)',
                    background: 'rgba(245,158,11,0.04)',
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: 'rgba(245,158,11,0.7)',
                      animation: 'pulse 1s ease-in-out infinite',
                    }}
                  />
                  <span className="text-[10px] font-mono" style={{ color: 'rgba(245,158,11,0.65)' }}>
                    Establishing connection...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </PanelSection>

          {/* ── Page Analysis ── */}
          <PanelSection label="Page Analysis">
            <div className="flex flex-col gap-[6px]">
              <InfoLine label="Certificate"    value={blackdog.certificate}                           ok={!blackdog.certificate.includes('None') && !blackdog.certificate.includes('Invalid')} />
              <InfoLine label="HSTS"           value={blackdog.hsts ? 'Enabled' : 'Not found'}        ok={blackdog.hsts} />
              <InfoLine label="Mixed Content"  value={blackdog.mixedContent ? 'Detected' : 'None'}    ok={!blackdog.mixedContent} />
              <InfoLine label="Fingerprinting" value={blackdog.fingerprinting ? 'Detected' : 'None'}  ok={!blackdog.fingerprinting} />
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

          {/* ── System Messages ── */}
          <div className="flex flex-col flex-1 min-h-0">
            <div
              className="px-4 py-[9px] flex items-center gap-1.5 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <ShieldCheck className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.35)' }} />
              <span className="section-label">System State</span>
            </div>

            <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2">
              {[
                { label: 'BLACKDOG Engine online', detail: 'v4.1.2 — operational', ok: true },
                { label: 'Risk classification active', detail: 'URL heuristics running per request', ok: true },
                { label: 'Tab isolation active', detail: 'Per-tab navigation and session state', ok: true },
                { label: 'High-risk blocking enabled', detail: 'Danger-rated domains intercepted', ok: true },
              ].map((msg, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5"
                  style={{
                    paddingBottom: '8px',
                    borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.025)' : 'none',
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                    style={{
                      background: msg.ok ? 'hsl(142 72% 38%)' : 'rgba(245,158,11,0.7)',
                      boxShadow: msg.ok ? '0 0 4px rgba(22,163,74,0.5)' : 'none',
                    }}
                  />
                  <div>
                    <div className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.65)', lineHeight: 1.4 }}>
                      {msg.label}
                    </div>
                    <div className="text-[9px] font-mono" style={{ color: 'rgba(148,163,184,0.28)', lineHeight: 1.4 }}>
                      {msg.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            className="px-3.5 py-2.5 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}
          >
            <div className="text-[9px] font-mono text-center" style={{ color: 'rgba(148,163,184,0.25)' }}>
              BLACKDOG — private security engine
            </div>
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

function StatusRow({ icon, label, value, ok, divider }: {
  icon: React.ReactNode; label: string; value: string; ok?: boolean; divider?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-[9px]"
      style={{
        borderTop: divider ? '1px solid rgba(255,255,255,0.04)' : 'none',
        background: 'rgba(0,0,0,0.18)',
      }}
    >
      <div className="flex items-center gap-2" style={{ color: 'rgba(148,163,184,0.3)' }}>
        {icon}
        <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.52)' }}>{label}</span>
      </div>
      <span
        className="text-[10px] font-semibold font-mono"
        style={{ color: ok ? 'hsl(142 72% 42%)' : 'rgba(245,158,11,0.7)' }}
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
