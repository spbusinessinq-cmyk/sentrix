import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { format } from 'date-fns';
import {
  RiskLevel,
  BlackdogData,
  PageType,
  analyzeUrl,
  classifyInput,
  getDomainTitle,
} from '@/lib/blackdog';

export type { RiskLevel, PageType };

export interface Tab {
  id: string;
  title: string;
  url: string;
  pageType: PageType;
  searchQuery: string;
  riskLevel: RiskLevel;
  blackdog: BlackdogData;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  visitedAt: Date;
  riskLevel: RiskLevel;
}

export interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'warn' | 'alert';
}

const SAFE_BLACKDOG: BlackdogData = {
  trackers: 0, scripts: 0, redirects: 0,
  findings: ['Internal Vero page — fully trusted'],
  certificate: 'Internal', hsts: true, fingerprinting: false, mixedContent: false,
};

function makeTab(overrides: Partial<Tab> = {}): Tab {
  const id = `tab-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    title: 'New Tab',
    url: 'vero://newtab',
    pageType: 'newtab',
    searchQuery: '',
    riskLevel: 'safe',
    blackdog: SAFE_BLACKDOG,
    ...overrides,
  };
}

interface BrowserState {
  // Tab state
  tabs: Tab[];
  activeTabId: string;
  activeTab: Tab;

  // Tab actions
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
  navigate: (input: string) => void;
  setAddressBarUrl: (url: string) => void;

  // Derived from active tab
  currentUrl: string;
  riskLevel: RiskLevel;
  searchQuery: string;
  pageType: PageType;

  // History
  history: HistoryEntry[];
  clearHistory: () => void;

  // Global logs
  logs: LogEntry[];
  addLog: (text: string, type?: 'info' | 'warn' | 'alert') => void;
  clearLogs: () => void;

  // Panel
  blackdogPanelOpen: boolean;
  setBlackdogPanelOpen: (v: boolean) => void;

  // Session
  burnSession: () => void;
}

const BrowserContext = createContext<BrowserState | undefined>(undefined);

const INITIAL_LOGS: LogEntry[] = [
  { id: '1', time: format(new Date(Date.now() - 60000), 'HH:mm:ss'), text: 'BLACKDOG Engine initialized — v4.1.2', type: 'info' },
  { id: '2', time: format(new Date(Date.now() - 45000), 'HH:mm:ss'), text: 'Connection encrypted (TLS 1.3)', type: 'info' },
  { id: '3', time: format(new Date(Date.now() - 30000), 'HH:mm:ss'), text: 'Blocked cross-site tracker: ads.analytics.net', type: 'warn' },
  { id: '4', time: format(new Date(Date.now() - 15000), 'HH:mm:ss'), text: 'Domain resolved clean — vero://newtab', type: 'info' },
];

export function BrowserProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([makeTab({ id: 'tab-1', title: 'New Tab' })]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [blackdogPanelOpen, setBlackdogPanelOpen] = useState(true);
  // Per-tab address bar input (not yet submitted)
  const [addressBarUrls, setAddressBarUrls] = useState<Record<string, string>>({ 'tab-1': 'vero://newtab' });

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  const addLog = useCallback((text: string, type: 'info' | 'warn' | 'alert' = 'info') => {
    setLogs(prev => [
      { id: Math.random().toString(36).slice(2), time: format(new Date(), 'HH:mm:ss'), text, type },
      ...prev,
    ].slice(0, 80));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([{ id: 'cleared', time: format(new Date(), 'HH:mm:ss'), text: 'Telemetry log cleared', type: 'info' }]);
  }, []);

  const addTab = useCallback(() => {
    const tab = makeTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
    setAddressBarUrls(prev => ({ ...prev, [tab.id]: 'vero://newtab' }));
    addLog('New secure tab opened', 'info');
  }, [addLog]);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length === 1) {
        const fresh = makeTab();
        setActiveTabId(fresh.id);
        setAddressBarUrls({ [fresh.id]: 'vero://newtab' });
        return [fresh];
      }
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        const newActive = next[Math.min(idx, next.length - 1)];
        setActiveTabId(newActive.id);
      }
      return next;
    });
    addLog(`Tab closed`, 'info');
  }, [activeTabId, addLog]);

  const navigate = useCallback((input: string) => {
    const { pageType, url, searchQuery } = classifyInput(input);
    const { riskLevel, blackdog } = analyzeUrl(url);

    // Derive a good title
    let title = 'New Tab';
    if (pageType === 'search') title = searchQuery ? `${searchQuery} — Search` : 'Search';
    else if (pageType === 'website') title = getDomainTitle(url);
    else if (pageType === 'history') title = 'History';
    else if (pageType === 'downloads') title = 'Downloads';
    else if (pageType === 'privacy') title = 'Privacy Report';
    else if (pageType === 'vault') title = 'Secure Vault';
    else if (pageType === 'settings') title = 'Settings';

    setTabs(prev => prev.map(t =>
      t.id === activeTabId ? { ...t, title, url, pageType, searchQuery, riskLevel, blackdog } : t
    ));
    setAddressBarUrls(prev => ({ ...prev, [activeTabId]: url }));

    // Add to history (not internal pages)
    if (pageType === 'website' || pageType === 'search') {
      setHistory(prev => [
        { id: Math.random().toString(36).slice(2), title, url, visitedAt: new Date(), riskLevel },
        ...prev,
      ].slice(0, 100));
    }

    // Log
    const logMsg = riskLevel === 'danger'
      ? `DANGER — Navigating to ${url}. BLACKDOG flagging threats.`
      : riskLevel === 'caution'
      ? `CAUTION — ${url}: ${blackdog.findings[0]}`
      : `Navigation: ${url} — ${blackdog.findings[0]}`;
    addLog(logMsg, riskLevel === 'danger' ? 'alert' : riskLevel === 'caution' ? 'warn' : 'info');
  }, [activeTabId, addLog]);

  const setAddressBarUrl = useCallback((url: string) => {
    setAddressBarUrls(prev => ({ ...prev, [activeTabId]: url }));
  }, [activeTabId]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    addLog('Browsing history cleared', 'info');
  }, [addLog]);

  const burnSession = useCallback(() => {
    const fresh = makeTab({ id: 'tab-1' });
    setTabs([fresh]);
    setActiveTabId('tab-1');
    setAddressBarUrls({ 'tab-1': 'vero://newtab' });
    setHistory([]);
    clearLogs();
    addLog('Session burned — all data sanitized. Environment clean.', 'info');
  }, [clearLogs, addLog]);

  const currentUrl = addressBarUrls[activeTabId] ?? activeTab.url;

  return (
    <BrowserContext.Provider value={{
      tabs, activeTabId, activeTab,
      addTab, closeTab, setActiveTabId, navigate, setAddressBarUrl,
      currentUrl,
      riskLevel: activeTab.riskLevel,
      searchQuery: activeTab.searchQuery,
      pageType: activeTab.pageType,
      history, clearHistory,
      logs, addLog, clearLogs,
      blackdogPanelOpen, setBlackdogPanelOpen,
      burnSession,
    }}>
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowserState(): BrowserState {
  const ctx = useContext(BrowserContext);
  if (!ctx) throw new Error('useBrowserState must be used within BrowserProvider');
  return ctx;
}
