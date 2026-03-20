import React, { useState } from 'react';
import { Settings, Shield, Palette, Info, AlertTriangle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useBrowserState } from '@/hooks/use-browser-state';
import { SentrixSettings } from '@/lib/settings';

interface SettingItem {
  key: keyof SentrixSettings;
  label: string;
  description: string;
  warn?: boolean;
}

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
  items: SettingItem[];
  info?: string;
}

const SECTIONS: Section[] = [
  {
    id: 'session',
    label: 'Session',
    icon: Shield,
    info: 'These settings control how Sentrix manages your browsing session and data.',
    items: [
      {
        key: 'sessionRestore',
        label: 'Restore session on launch',
        description: 'Re-open tabs and history from your previous session when Sentrix starts',
      },
      {
        key: 'clearDataOnExit',
        label: 'Clear data on exit',
        description: 'Automatically wipe all saved session data (tabs, history, bookmarks) when the app closes',
        warn: true,
      },
      {
        key: 'blackdogPanelOpenByDefault',
        label: 'Show security panel by default',
        description: 'Open the BLACKDOG security panel automatically on each session start',
      },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    info: 'Interface density and display preferences.',
    items: [
      {
        key: 'compactInterface',
        label: 'Compact interface',
        description: 'Reduce spacing and padding throughout the browser interface',
      },
      {
        key: 'developerMode',
        label: 'Developer mode',
        description: 'Show extended session diagnostics and debug information in the status bar',
      },
    ],
  },
];

function ToggleSwitch({ on, onChange, warn }: { on: boolean; onChange: (v: boolean) => void; warn?: boolean }) {
  const activeColor = warn && on ? 'bg-amber-500/20 border-amber-500/40' : 'bg-primary/20 border-primary/40';
  const knobColor = warn && on ? 'bg-amber-500' : 'bg-primary';
  return (
    <button
      onClick={() => onChange(!on)}
      className={twMerge(
        'relative w-9 h-5 rounded-full border transition-all shrink-0',
        on ? activeColor : 'bg-white/[0.04] border-white/[0.08]'
      )}
    >
      <div className={twMerge(
        'absolute top-0.5 w-4 h-4 rounded-full transition-all',
        on ? `left-[calc(100%-18px)] ${knobColor}` : 'left-0.5 bg-white/20'
      )} />
    </button>
  );
}

export function SettingsView() {
  const { settings, updateSettings, blackdogStatus } = useBrowserState();
  const [activeSection, setActiveSection] = useState('session');
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
        <button
          onClick={() => setActiveSection('about')}
          className={twMerge(
            'relative flex items-center gap-2.5 px-4 py-2.5 text-left transition-all mt-auto',
            activeSection === 'about' ? 'bg-primary/[0.07] text-foreground/90' : 'text-muted-foreground/50 hover:bg-white/[0.03] hover:text-muted-foreground/80'
          )}
        >
          {activeSection === 'about' && <div className="absolute left-0 w-0.5 h-5 bg-primary rounded-r-full" />}
          <Info className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
          <span className="text-[12px] font-medium">About</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-lg">
          {activeSection === 'about' ? (
            <AboutSection blackdogStatus={blackdogStatus} />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <section.icon className="w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
                <h2 className="text-sm font-semibold text-foreground/80">{section.label}</h2>
              </div>

              {section.info && (
                <p className="text-[11px] font-mono text-muted-foreground/40 mb-5 leading-relaxed">{section.info}</p>
              )}

              <div className="flex flex-col gap-0.5">
                {section.items.map(item => (
                  <div key={item.key} className="flex items-center justify-between py-3.5 border-b border-white/[0.04]">
                    <div className="flex-1 pr-6">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-[13px] font-medium text-foreground/80">{item.label}</div>
                        {item.warn && settings[item.key] && (
                          <AlertTriangle className="w-3 h-3 text-amber-500/70" />
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground/40">{item.description}</div>
                    </div>
                    <ToggleSwitch
                      on={!!settings[item.key]}
                      warn={item.warn}
                      onChange={v => updateSettings({ [item.key]: v })}
                    />
                  </div>
                ))}
              </div>

              {activeSection === 'session' && settings.clearDataOnExit && (
                <div className="mt-4 px-3 py-2.5 rounded border border-amber-500/15 bg-amber-500/[0.05]">
                  <div className="text-[10px] font-mono text-amber-500/70 leading-relaxed">
                    Clear Data on Exit is active. All tabs, history, and bookmarks will be erased when Sentrix closes. This cannot be undone.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AboutSection({ blackdogStatus }: { blackdogStatus: string }) {
  const statusColor =
    blackdogStatus === 'connected' ? 'text-primary/70' :
    blackdogStatus === 'unavailable' ? 'text-red-500/70' :
    'text-amber-500/70';
  const statusLabel =
    blackdogStatus === 'connected' ? 'Operational' :
    blackdogStatus === 'unavailable' ? 'Unavailable' : 'Connecting…';

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Info className="w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-foreground/80">About Sentrix</h2>
      </div>

      <div className="p-4 rounded-lg border border-white/[0.05] bg-black/20 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">Build Info</div>
        <div className="space-y-2">
          {[
            ['Product', 'Sentrix Browser'],
            ['Version', '1.0.0-beta'],
            ['Build',   'sentrix-2026.03.20'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground/40">{k}</span>
              <span className="text-[11px] font-mono text-foreground/60">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-lg border border-white/[0.05] bg-black/20 mb-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">BLACKDOG Engine</div>
        <div className="space-y-2">
          {[
            ['Engine', 'BLACKDOG v4.1.2'],
            ['Status', statusLabel],
            ['Threat Feed', 'Sentrix Security Feed'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground/40">{k}</span>
              <span className={twMerge('text-[11px] font-mono', k === 'Status' ? statusColor : 'text-foreground/60')}>{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/[0.04] text-[10px] font-mono text-muted-foreground/30 leading-relaxed">
          BLACKDOG is a private security engine. Its connection status is reported here only. No engine controls are exposed to protect operational integrity.
        </div>
      </div>

      <div className="p-4 rounded-lg border border-white/[0.05] bg-black/20">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">Architecture Note</div>
        <div className="text-[11px] font-mono text-muted-foreground/40 leading-relaxed space-y-2">
          <p>Sentrix is a browser shell product. URL classification and risk scoring are heuristic client-side operations, not deep browser-engine interception.</p>
          <p>Session state is isolated per tab within Sentrix. External page constraints (X-Frame-Options, CORS, CSP) apply normally — Sentrix cannot override browser security policies.</p>
          <p>Settings labeled with Sentrix-controlled effects are fully operational. Settings that would require native browser engine access are not included in this release.</p>
        </div>
      </div>
    </div>
  );
}
