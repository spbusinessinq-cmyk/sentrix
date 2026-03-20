import React from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Lock, ShieldAlert, Bookmark, ShieldCheck, Eye } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';

export function AddressBar() {
  const { currentUrl, setCurrentUrl, riskLevel, addLog } = useBrowserState();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = e.currentTarget.value;
      if (!val.includes('://') && !val.includes(' ')) {
        setCurrentUrl(`https://${val}`);
      } else {
        setCurrentUrl(val);
      }
      addLog(`Navigating to ${val}`, 'info');
    }
  };

  const renderRiskBadge = () => {
    switch (riskLevel) {
      case 'danger':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-red/10 text-red border border-red/20">
            <ShieldAlert className="w-3 h-3" /> Danger
          </div>
        );
      case 'caution':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber/10 text-[#F59E0B] border border-amber/20">
            <ShieldAlert className="w-3 h-3" /> Caution
          </div>
        );
      case 'safe':
      default:
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck className="w-3 h-3" /> Safe
          </div>
        );
    }
  };

  return (
    <div className="flex items-center h-12 bg-card/40 backdrop-blur-md border-b border-border px-3 gap-3 relative z-10">
      
      {/* Nav Controls */}
      <div className="flex items-center gap-1">
        <button className="p-1.5 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-md text-white/20 cursor-not-allowed">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Input */}
      <div className="flex-1 flex items-center h-8 bg-black/40 border border-white/10 rounded-lg px-3 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all shadow-inner group">
        <Lock className="w-3.5 h-3.5 text-primary/70 mr-2" />
        <input 
          type="text" 
          value={currentUrl}
          onChange={(e) => setCurrentUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-[13px] font-mono text-foreground placeholder:text-muted-foreground"
          placeholder="Search or enter address"
          spellCheck={false}
        />
        <div className="ml-2 flex items-center opacity-80 group-hover:opacity-100 transition-opacity">
          {renderRiskBadge()}
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-1 pl-1 border-l border-white/5">
        <button className="p-1.5 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors" title="Bookmark">
          <Bookmark className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-md text-primary hover:bg-white/10 transition-colors" title="Secure Mode Active">
          <ShieldCheck className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors" title="Inspect">
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
