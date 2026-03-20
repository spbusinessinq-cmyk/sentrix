import React, { useEffect } from 'react';
import { VeroTabBar } from '@/components/VeroTabBar';
import { AddressBar } from '@/components/AddressBar';
import { TacticalSidebar } from '@/components/TacticalSidebar';
import { BrowserContent } from '@/components/BrowserContent';
import { BlackdogPanel } from '@/components/BlackdogPanel';
import { useBrowserState } from '@/hooks/use-browser-state';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function Home() {
  const { blackdogPanelOpen, setBlackdogPanelOpen } = useBrowserState();

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

      <div className="flex flex-1 overflow-hidden relative">
        <TacticalSidebar />

        <main className="flex-1 overflow-hidden relative shadow-[-4px_0_24px_rgba(0,0,0,0.4)] z-0">
          <BrowserContent />
        </main>

        <BlackdogPanel />
      </div>
    </div>
  );
}
