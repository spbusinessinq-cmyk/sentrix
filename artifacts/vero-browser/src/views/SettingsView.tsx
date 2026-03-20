import React, { useState } from 'react';
import { Settings, Shield, Eye, Globe } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface Toggle {
  label: string;
  description: string;
  default: boolean;
}

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
  toggles: Toggle[];
}

const SECTIONS: SettingsSection[] = [
  {
    id: 'blackdog',
    label: 'BLACKDOG Engine',
    icon: Shield,
    toggles: [
      { label: 'Enhanced Threat Scanning', description: 'Deep analysis of all page scripts and network requests', default: true },
      { label: 'Real-time URL Analysis', description: 'Classify URLs before navigation using threat intelligence', default: true },
      { label: 'Script Interception', description: 'Block known malicious and tracking JavaScript payloads', default: true },
      { label: 'Redirect Chain Detection', description: 'Identify and block multi-step redirect attacks', default: true },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy Controls',
    icon: Eye,
    toggles: [
      { label: 'Canvas Fingerprint Block', description: 'Prevent sites from reading your canvas fingerprint', default: true },
      { label: 'WebRTC Leak Prevention', description: 'Mask local IP from WebRTC-based detection', default: true },
      { label: 'Third-party Cookie Block', description: 'Block all cross-site tracking cookies', default: true },
      { label: 'Clear Data on Exit', description: 'Wipe session data automatically on close', default: false },
    ],
  },
  {
    id: 'general',
    label: 'General',
    icon: Globe,
    toggles: [
      { label: 'Auto-update BLACKDOG Engine', description: 'Keep threat signatures and engine up to date', default: true },
      { label: 'Hardware Acceleration', description: 'Use GPU for page rendering and compositing', default: true },
      { label: 'Developer Mode', description: 'Enable advanced diagnostic tools and extended telemetry', default: false },
      { label: 'Compact Interface', description: 'Reduce spacing and padding throughout the interface', default: false },
    ],
  },
];

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={twMerge(
        'relative w-9 h-5 rounded-full border transition-all shrink-0',
        on ? 'bg-primary/20 border-primary/40' : 'bg-white/[0.04] border-white/[0.08]'
      )}
    >
      <div className={twMerge(
        'absolute top-0.5 w-4 h-4 rounded-full transition-all',
        on ? 'left-[calc(100%-18px)] bg-primary' : 'left-0.5 bg-white/20'
      )} />
    </button>
  );
}

export function SettingsView() {
  const [values, setValues] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    SECTIONS.forEach(s => s.toggles.forEach(t => { init[`${s.id}-${t.label}`] = t.default; }));
    return init;
  });
  const [activeSection, setActiveSection] = useState('blackdog');

  const section = SECTIONS.find(s => s.id === activeSection) ?? SECTIONS[0];

  return (
    <div className="h-full overflow-hidden flex bg-background">
      {/* Sidebar nav */}
      <div className="w-48 border-r border-white/[0.05] bg-black/20 flex flex-col py-4 shrink-0">
        <div className="px-4 pb-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
          sentrix://settings
        </div>
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={twMerge(
                'relative flex items-center gap-2.5 px-4 py-2.5 text-left transition-all',
                active ? 'bg-primary/[0.07] text-foreground/90' : 'text-muted-foreground/50 hover:bg-white/[0.03] hover:text-muted-foreground/80'
              )}
            >
              {active && <div className="absolute left-0 w-0.5 h-5 bg-primary rounded-r-full" />}
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <span className="text-[12px] font-medium">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-lg">
          <div className="flex items-center gap-2 mb-6">
            <section.icon className="w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold text-foreground/80">{section.label}</h2>
          </div>

          <div className="flex flex-col gap-0.5">
            {section.toggles.map(t => {
              const key = `${section.id}-${t.label}`;
              return (
                <div key={t.label} className="flex items-center justify-between py-3.5 border-b border-white/[0.04]">
                  <div className="flex-1 pr-6">
                    <div className="text-[13px] font-medium text-foreground/80 mb-0.5">{t.label}</div>
                    <div className="text-[11px] font-mono text-muted-foreground/40">{t.description}</div>
                  </div>
                  <ToggleSwitch on={values[key] ?? t.default} onChange={v => setValues(prev => ({ ...prev, [key]: v }))} />
                </div>
              );
            })}
          </div>

          {activeSection === 'blackdog' && (
            <div className="mt-6 p-4 rounded-lg border border-white/[0.05] bg-black/20">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">Engine Info</div>
              <div className="space-y-2">
                {[
                  ['Engine Version',      'BLACKDOG v4.1.2'],
                  ['Signature Database',  '2026-03-20 04:00 UTC'],
                  ['Threat Intelligence', 'Sentrix Security Feed'],
                  ['Engine Status',       'Operational'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground/40">{k}</span>
                    <span className="text-[11px] font-mono text-foreground/60">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'general' && (
            <div className="mt-6 p-4 rounded-lg border border-white/[0.05] bg-black/20">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">Build Info</div>
              <div className="space-y-2">
                {[
                  ['Product', 'Sentrix Browser'],
                  ['Version', '1.0.0-beta'],
                  ['Build',   'sentrix-2026.03.20'],
                  ['Engine',  'BLACKDOG v4.1.2'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground/40">{k}</span>
                    <span className="text-[11px] font-mono text-foreground/60">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
