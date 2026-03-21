import React, { useEffect, useState } from 'react';
import { VeroTabBar } from '@/components/VeroTabBar';
import { AddressBar } from '@/components/AddressBar';
import { TacticalSidebar } from '@/components/TacticalSidebar';
import { BrowserContent } from '@/components/BrowserContent';
import { BlackdogPanel } from '@/components/BlackdogPanel';
import { InvestigationControlBar } from '@/components/InvestigationControlBar';
import { useBrowserState } from '@/hooks/use-browser-state';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Home() {
  const { blackdogPanelOpen, setBlackdogPanelOpen } = useBrowserState();
  const [edgeHovered, setEdgeHovered] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setBlackdogPanelOpen(!blackdogPanelOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blackdogPanelOpen, setBlackdogPanelOpen]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      <VeroTabBar />
      <AddressBar />
      <InvestigationControlBar />

      <div className="flex flex-1 overflow-hidden relative">
        <TacticalSidebar />

        <main className="flex-1 overflow-hidden relative shadow-[-4px_0_24px_rgba(0,0,0,0.4)] z-0">
          <BrowserContent />
        </main>

        {/* ── Slim right-edge handle — visible only when panel is closed ── */}
        <AnimatePresence>
          {!blackdogPanelOpen && (
            <motion.button
              key="panel-edge-handle"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              onClick={() => setBlackdogPanelOpen(true)}
              onMouseEnter={() => setEdgeHovered(true)}
              onMouseLeave={() => setEdgeHovered(false)}
              title="Open System Panel (⌘B)"
              className="absolute right-0 top-0 bottom-0 z-30 flex flex-col items-center justify-center"
              style={{
                width: edgeHovered ? '20px' : '12px',
                background: edgeHovered
                  ? 'linear-gradient(90deg, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0.05) 100%)'
                  : 'linear-gradient(90deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0.008) 100%)',
                borderLeft: `1px solid ${edgeHovered ? 'rgba(56,189,248,0.30)' : 'rgba(255,255,255,0.055)'}`,
                boxShadow: edgeHovered ? '-4px 0 16px rgba(56,189,248,0.08)' : 'none',
                cursor: 'pointer',
                transition: 'width 180ms ease-out, background 180ms ease-out, border-color 180ms ease-out, box-shadow 180ms ease-out',
              }}
            >
              <ChevronLeft
                className="w-2.5 h-2.5 transition-all duration-180"
                style={{
                  color: edgeHovered ? 'rgba(56,189,248,0.70)' : 'rgba(148,163,184,0.25)',
                }}
              />
            </motion.button>
          )}
        </AnimatePresence>

        <BlackdogPanel />
      </div>
    </div>
  );
}
