import React, { createContext, useContext, useState, ReactNode } from 'react';
import { format } from 'date-fns';

export type RiskLevel = "safe" | "caution" | "danger" | "unknown";

export interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'warn' | 'alert';
}

interface BrowserState {
  currentUrl: string;
  setCurrentUrl: (url: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  riskLevel: RiskLevel;
  setRiskLevel: (level: RiskLevel) => void;
  blackdogPanelOpen: boolean;
  setBlackdogPanelOpen: (open: boolean) => void;
  activeSidebarItem: string;
  setActiveSidebarItem: (item: string) => void;
  logs: LogEntry[];
  addLog: (text: string, type?: 'info' | 'warn' | 'alert') => void;
  clearLogs: () => void;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
}

const BrowserContext = createContext<BrowserState | undefined>(undefined);

export function BrowserProvider({ children }: { children: ReactNode }) {
  const [currentUrl, setCurrentUrl] = useState("vero://newtab");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("safe");
  const [blackdogPanelOpen, setBlackdogPanelOpen] = useState(true);
  const [activeSidebarItem, setActiveSidebarItem] = useState("home");
  const [activeTabId, setActiveTabId] = useState("tab-1");
  
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', time: format(new Date(Date.now() - 60000), 'HH:mm:ss'), text: 'BLACKDOG Engine initialized', type: 'info' },
    { id: '2', time: format(new Date(Date.now() - 45000), 'HH:mm:ss'), text: 'Connection encrypted (TLS 1.3)', type: 'info' },
    { id: '3', time: format(new Date(Date.now() - 30000), 'HH:mm:ss'), text: 'Blocked cross-site tracker: ads.analytics.net', type: 'warn' },
    { id: '4', time: format(new Date(Date.now() - 15000), 'HH:mm:ss'), text: 'Domain resolved clean', type: 'info' },
  ]);

  const addLog = (text: string, type: 'info' | 'warn' | 'alert' = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      time: format(new Date(), 'HH:mm:ss'),
      text,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Session burned. Environment sanitized.', 'info');
  };

  return (
    <BrowserContext.Provider value={{
      currentUrl, setCurrentUrl,
      searchQuery, setSearchQuery,
      riskLevel, setRiskLevel,
      blackdogPanelOpen, setBlackdogPanelOpen,
      activeSidebarItem, setActiveSidebarItem,
      logs, addLog, clearLogs,
      activeTabId, setActiveTabId
    }}>
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowserState() {
  const context = useContext(BrowserContext);
  if (context === undefined) {
    throw new Error('useBrowserState must be used within a BrowserProvider');
  }
  return context;
}
