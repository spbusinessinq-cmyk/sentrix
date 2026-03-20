import React from 'react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { ShieldCheck, ShieldAlert, AlertTriangle, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_RESULTS = [
  { 
    id: 1, 
    title: 'Vero Documentation - Security Engine', 
    domain: 'docs.vero.browser', 
    url: 'https://docs.vero.browser/engine',
    snippet: 'Official documentation for Vero browser and the BLACKDOG security engine. Learn how to configure deep packet inspection and tracker blocking.', 
    risk: 'safe', 
    note: '0 trackers — verified internal domain' 
  },
  { 
    id: 2, 
    title: 'Unknown Analytics Repository', 
    domain: 'track.unknown-source.net', 
    url: 'https://track.unknown-source.net/v1',
    snippet: 'Third-party tracking script repository frequently embedded in unsecure forums. Proceed with caution.', 
    risk: 'caution', 
    note: '3 third-party scripts detected. Data harvesting likely.' 
  },
  { 
    id: 3, 
    title: 'Download Update - Flash_Player.exe', 
    domain: 'danger-zone.crypto-network.com', 
    url: 'http://danger-zone.crypto-network.com/payload',
    snippet: 'Known phishing domain and malware distribution network. Automated payloads detected on landing page.', 
    risk: 'danger', 
    note: 'Blocked 12 malicious requests. BLACKDOG strongly advises against entry.' 
  },
];

export function SearchResults() {
  const { searchQuery, setCurrentUrl, addLog, setRiskLevel } = useBrowserState();

  if (!searchQuery) return null;

  const handleResultClick = (url: string, risk: string) => {
    setCurrentUrl(url);
    setRiskLevel(risk as any);
    addLog(`Intercepted navigation to ${url}`, risk === 'danger' ? 'alert' : risk === 'caution' ? 'warn' : 'info');
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'safe') return 'text-primary border-primary/20 bg-primary/5';
    if (risk === 'caution') return 'text-[#F59E0B] border-amber/20 bg-amber/5';
    return 'text-red border-red/20 bg-red/5';
  };

  const getRiskIcon = (risk: string) => {
    if (risk === 'safe') return <ShieldCheck className="w-3.5 h-3.5" />;
    if (risk === 'caution') return <AlertTriangle className="w-3.5 h-3.5" />;
    return <ShieldAlert className="w-3.5 h-3.5" />;
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 flex flex-col gap-4">
      <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono border-b border-border pb-2 mb-2 flex items-center justify-between">
        <span>Deep Search Results for "{searchQuery}"</span>
        <span>Secure connection</span>
      </div>

      <div className="flex flex-col gap-4">
        {MOCK_RESULTS.map((result, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={result.id} 
            className="group p-5 rounded-xl border border-white/5 bg-card/40 backdrop-blur hover:bg-card/80 hover:border-white/10 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
            onClick={() => handleResultClick(result.url, result.risk)}
          >
            {/* Left Accent Bar based on risk */}
            <div className={`absolute left-0 top-0 w-1 h-full opacity-50 group-hover:opacity-100 transition-opacity ${
              result.risk === 'safe' ? 'bg-primary' : result.risk === 'caution' ? 'bg-[#F59E0B]' : 'bg-red'
            }`} />

            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                  {result.title}
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <LinkIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground font-mono">{result.url}</span>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 border ${getRiskColor(result.risk)}`}>
                {getRiskIcon(result.risk)}
                {result.risk}
              </div>
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed mb-3">
              {result.snippet}
            </p>

            <div className="flex items-center gap-2 pt-3 border-t border-white/5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary opacity-70" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                BLACKDOG: <span className={result.risk === 'safe' ? 'text-primary/80' : 'text-foreground/70'}>{result.note}</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
