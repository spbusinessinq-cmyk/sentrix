import React from 'react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { Activity, ShieldCheck, Terminal, AlertTriangle, X, ChevronRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

export function BlackdogPanel() {
  const { blackdogPanelOpen, setBlackdogPanelOpen, logs, riskLevel } = useBrowserState();

  return (
    <AnimatePresence>
      {blackdogPanelOpen && (
        <motion.div 
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-[280px] sm:w-[320px] shrink-0 border-l border-border bg-card/60 backdrop-blur-xl flex flex-col h-full z-20 absolute right-0 top-0 bottom-0 md:relative shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(22,163,74,0.8)] animate-pulse" />
              <h2 className="text-xs font-bold tracking-widest text-primary uppercase">BLACKDOG Engine</h2>
            </div>
            <button 
              onClick={() => setBlackdogPanelOpen(false)}
              className="p-1 rounded-md hover:bg-white/10 text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Session Status */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Session Status</span>
              <span className="text-xs font-semibold text-primary flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Secure
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Trackers" value="0" color="text-primary" />
              <StatBox label="Scripts" value="0" color="text-amber-500" />
              <StatBox label="Redirects" value="0" color="text-foreground" />
              <StatBox 
                label="Risk Score" 
                value={riskLevel.toUpperCase()} 
                color={riskLevel === 'danger' ? 'text-red' : riskLevel === 'caution' ? 'text-[#F59E0B]' : 'text-primary'} 
              />
            </div>
          </div>

          {/* Live Event Log */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Terminal className="w-3 h-3" /> Live Telemetry
              </span>
              <Activity className="w-3 h-3 text-primary animate-pulse-slow" />
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4 font-mono text-[11px] flex flex-col gap-2">
              {logs.length === 0 ? (
                <div className="text-muted-foreground italic text-center mt-10 opacity-50">No events logged</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2 group">
                    <span className="text-muted-foreground/60 shrink-0 select-none">[{log.time}]</span>
                    <span className={twMerge(
                      "flex-1 leading-tight break-words",
                      log.type === 'warn' ? 'text-[#F59E0B]' : 
                      log.type === 'alert' ? 'text-red font-semibold' : 'text-foreground/80'
                    )}>
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Footer controls */}
          <div className="p-3 border-t border-white/5 bg-black/40">
            <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-mono tracking-widest uppercase rounded border border-white/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground">
              Export Logs <DownloadIcon className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatBox({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 flex flex-col justify-center">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
      <span className={twMerge("text-base font-bold font-mono", color)}>{value}</span>
    </div>
  );
}

// Simple internal icon definition if download is not imported
function DownloadIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}
