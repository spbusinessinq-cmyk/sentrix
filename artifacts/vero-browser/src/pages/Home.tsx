import React, { useEffect } from 'react';
import { VeroTabBar } from '@/components/VeroTabBar';
import { AddressBar } from '@/components/AddressBar';
import { TacticalSidebar } from '@/components/TacticalSidebar';
import { BrowserContent } from '@/components/BrowserContent';
import { BlackdogPanel } from '@/components/BlackdogPanel';
import { useBrowserState } from '@/hooks/use-browser-state';
import { Activity } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function Home() {
  const { blackdogPanelOpen, setBlackdogPanelOpen } = useBrowserState();

  // Handle subtle keyboard shortcuts for the prototype
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B to toggle Blackdog panel
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
          
          {/* Panel Toggle button (visible when panel is closed) */}
          {!blackdogPanelOpen && (
            <button 
              onClick={() => setBlackdogPanelOpen(true)}
              className="absolute top-4 right-4 z-50 p-2.5 rounded-lg bg-card/80 border border-white/10 backdrop-blur-md text-primary shadow-lg hover:bg-card transition-all"
              title="Open BLACKDOG Engine (Cmd+B)"
            >
              <Activity className="w-5 h-5 animate-pulse-slow" />
            </button>
          )}
        </main>

        <BlackdogPanel />
      </div>
    </div>
  );
}
