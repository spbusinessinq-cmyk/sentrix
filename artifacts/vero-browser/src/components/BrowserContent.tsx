import React, { useState } from 'react';
import { Shield, Flame, Link as LinkIcon, FileText, Search, ShieldAlert } from 'lucide-react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { SearchResults } from './SearchResults';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export function BrowserContent() {
  const { searchQuery, setSearchQuery, clearLogs, setCurrentUrl, addLog, setRiskLevel } = useBrowserState();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    if (localSearch) {
      addLog(`Initiated deep search query: ${localSearch}`, 'info');
      setCurrentUrl(`vero://search?q=${encodeURIComponent(localSearch)}`);
    }
  };

  const handleBurnSession = () => {
    clearLogs();
    setSearchQuery("");
    setLocalSearch("");
    setCurrentUrl("vero://newtab");
    setRiskLevel("safe");
    toast({
      title: "Session Burned",
      description: "All tracking data, local storage, and history sanitized.",
      variant: "default",
      className: "border-primary bg-primary/10 text-primary-foreground",
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto px-4 py-12 md:py-24 flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-card/30 via-background to-background">
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-12 text-center relative w-full max-w-4xl"
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary opacity-20 blur-[50px] rounded-full animate-pulse-slow w-32 h-32 mx-auto" />
          <Shield className="w-24 h-24 text-primary relative z-10 drop-shadow-[0_0_15px_rgba(22,163,74,0.4)]" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3">
          Browse clearly. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Stay protected.</span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base font-mono uppercase tracking-widest mb-10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_currentColor]" />
          Protected by BLACKDOG Engine
        </p>

        {/* Big Search Bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl relative group">
          <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-colors" />
          <div className="relative flex items-center bg-black/60 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
            <div className="pl-6 pr-3 py-4 text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search className="w-6 h-6" />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search the web securely or enter a URL"
              className="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-muted-foreground/50 py-5 pr-6"
              spellCheck={false}
            />
            {localSearch && (
              <button type="submit" className="mr-3 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-sm font-semibold transition-colors">
                Intercept
              </button>
            )}
          </div>
        </form>
      </motion.div>

      {/* Conditional Rendering: Quick Actions vs Search Results */}
      {!searchQuery ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl"
        >
          {/* Quick Action Cards */}
          <ActionCard 
            icon={<Shield className="w-5 h-5 text-primary" />}
            title="New Secure Tab"
            description="Launch isolated instance"
            onClick={() => {
              setSearchQuery("");
              setLocalSearch("");
              setCurrentUrl("vero://newtab");
            }}
          />
          <ActionCard 
            icon={<Flame className="w-5 h-5 text-red" />}
            title="Burn Session"
            description="Sanitize all local data"
            onClick={handleBurnSession}
            danger
          />
          <ActionCard 
            icon={<LinkIcon className="w-5 h-5 text-blue-400" />}
            title="Link Check"
            description="Pre-flight URL analysis"
            onClick={() => {
              toast({ title: "Link Inspector Ready", description: "Paste a URL into the search bar to analyze." })
            }}
          />
          <ActionCard 
            icon={<FileText className="w-5 h-5 text-purple-400" />}
            title="Privacy Report"
            description="View blocked trackers"
            onClick={() => {
              toast({ title: "Report Generated", description: "24 trackers blocked in the last 7 days." })
            }}
          />
        </motion.div>
      ) : (
        <SearchResults />
      )}

    </div>
  );
}

function ActionCard({ icon, title, description, onClick, danger = false }: any) {
  return (
    <button 
      onClick={onClick}
      className={twMerge(
        "flex flex-col items-start p-5 rounded-xl border border-white/5 bg-card/30 backdrop-blur hover:bg-card/60 transition-all text-left group",
        danger ? "hover:border-red/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "hover:border-primary/30 hover:shadow-[0_0_20px_rgba(22,163,74,0.1)]"
      )}
    >
      <div className="mb-3 p-2 rounded-lg bg-black/40 border border-white/5 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground font-mono">{description}</p>
    </button>
  );
}
