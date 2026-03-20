import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  RiskLevel, BlackdogData, PageType,
  analyzeUrl, classifyInput, getDomainTitle,
} from '@/lib/blackdog';

export type { RiskLevel, PageType };

const SESSION_VERSION = 3;
const STORAGE_KEY = 'sentra-session-v3';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Tab {
  id: string;
  title: string;
  url: string;
  pageType: PageType;
  searchQuery: string;
  riskLevel: RiskLevel;
  blackdog: BlackdogData;
  navBack: string[];    // navigated past URLs
  navForward: string[]; // URLs after going back
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

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERNAL_BLACKDOG: BlackdogData = {
  trackers: 0, scripts: 0, redirects: 0,
  findings: ['Internal Sentra page — fully trusted'],
  certificate: 'Internal', hsts: true, fingerprinting: false, mixedContent: false,
};

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: `tab-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New Tab',
    url: 'sentra://newtab',
    pageType: 'newtab',
    searchQuery: '',
    riskLevel: 'safe',
    blackdog: INTERNAL_BLACKDOG,
    navBack: [],
    navForward: [],
    ...overrides,
  };
}

function makeInitialLogs(): LogEntry[] {
  const now = Date.now();
  return [
    { id: '1', time: format(new Date(now - 60000), 'HH:mm:ss'), text: 'BLACKDOG Engine initialized — v4.1.2', type: 'info' },
    { id: '2', time: format(new Date(now - 45000), 'HH:mm:ss'), text: 'Connection encrypted (TLS 1.3)', type: 'info' },
    { id: '3', time: format(new Date(now - 30000), 'HH:mm:ss'), text: 'Blocked cross-site tracker: ads.analytics.net', type: 'warn' },
    { id: '4', time: format(new Date(now - 15000), 'HH:mm:ss'), text: 'Domain resolved clean — sentra://newtab', type: 'info' },
  ];
}

// ─── LocalStorage persistence ─────────────────────────────────────────────────

interface PersistedTab {
  id: string; title: string; url: string; pageType: PageType;
  searchQuery: string; riskLevel: RiskLevel; blackdog: BlackdogData;
}

function serializeSession(tabs: Tab[], activeTabId: string, history: HistoryEntry[]): string {
  const persistedTabs: PersistedTab[] = tabs.map(t => ({
    id: t.id, title: t.title, url: t.url,
    pageType: t.pageType, searchQuery: t.searchQuery,
    riskLevel: t.riskLevel, blackdog: t.blackdog,
  }));
  return JSON.stringify({
    version: SESSION_VERSION,
    activeTabId,
    tabs: persistedTabs,
    history: history.map(h => ({ ...h, visitedAt: h.visitedAt.toISOString() })),
  });
}

function loadPersistedSession(): { tabs: Tab[]; activeTabId: string; history: HistoryEntry[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SESSION_VERSION || !Array.isArray(data.tabs) || data.tabs.length === 0) return null;

    const tabs: Tab[] = data.tabs.map((t: PersistedTab) => ({
      ...makeTab(),
      id: t.id, title: t.title, url: t.url ?? 'sentra://newtab',
      pageType: t.pageType ?? 'newtab', searchQuery: t.searchQuery ?? '',
      riskLevel: t.riskLevel ?? 'safe', blackdog: t.blackdog ?? INTERNAL_BLACKDOG,
    }));

    const history: HistoryEntry[] = (data.history ?? []).map((h: any) => ({
      ...h,
      visitedAt: new Date(h.visitedAt),
    })).filter((h: HistoryEntry) => !isNaN(h.visitedAt.getTime()));

    const activeTabId: string = tabs.find(t => t.id === data.activeTabId)
      ? data.activeTabId
      : tabs[0].id;

    return { tabs, activeTabId, history };
  } catch {
    return null;
  }
}

// ─── Context interface ────────────────────────────────────────────────────────

interface BrowserState {
  tabs: Tab[];
  activeTabId: string;
  activeTab: Tab;

  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
  navigate: (input: string) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  setAddressBarUrl: (url: string) => void;

  canGoBack: boolean;
  canGoForward: boolean;
  isNavigating: boolean;

  currentUrl: string;
  riskLevel: RiskLevel;
  searchQuery: string;
  pageType: PageType;

  history: HistoryEntry[];
  clearHistory: () => void;

  logs: LogEntry[];
  addLog: (text: string, type?: 'info' | 'warn' | 'alert') => void;
  clearLogs: () => void;

  blackdogPanelOpen: boolean;
  setBlackdogPanelOpen: (v: boolean) => void;

  burnSession: () => void;
}

const BrowserContext = createContext<BrowserState | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BrowserProvider({ children }: { children: ReactNode }) {
  const persisted = loadPersistedSession();

  const [tabs, setTabs] = useState<Tab[]>(persisted?.tabs ?? [makeTab({ id: 'tab-init' })]);
  const [activeTabId, setActiveTabIdRaw] = useState<string>(persisted?.activeTabId ?? 'tab-init');
  const [history, setHistory] = useState<HistoryEntry[]>(persisted?.history ?? []);
  const [logs, setLogs] = useState<LogEntry[]>(makeInitialLogs());
  const [blackdogPanelOpen, setBlackdogPanelOpen] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addressBarUrls, setAddressBarUrls] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (persisted?.tabs ?? [makeTab({ id: 'tab-init' })]).forEach(t => { map[t.id] = t.url; });
    return map;
  });

  // Safe active tab resolution
  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0] ?? makeTab({ id: 'tab-fallback' });

  // Persist state on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeSession(tabs, activeTabId, history));
    } catch { /* storage may be unavailable */ }
  }, [tabs, activeTabId, history]);

  // ─── Logging ─────────────────────────────────────────────────────────────

  const addLog = useCallback((text: string, type: 'info' | 'warn' | 'alert' = 'info') => {
    setLogs(prev => [
      { id: Math.random().toString(36).slice(2), time: format(new Date(), 'HH:mm:ss'), text, type },
      ...prev,
    ].slice(0, 100));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([{ id: 'cleared', time: format(new Date(), 'HH:mm:ss'), text: 'Telemetry log cleared', type: 'info' }]);
  }, []);

  // ─── Tab management ───────────────────────────────────────────────────────

  const setActiveTabId = useCallback((id: string) => {
    setActiveTabIdRaw(id);
  }, []);

  const addTab = useCallback(() => {
    const tab = makeTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabIdRaw(tab.id);
    setAddressBarUrls(prev => ({ ...prev, [tab.id]: 'sentra://newtab' }));
    addLog('New secure tab opened', 'info');
  }, [addLog]);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length === 1) {
        const fresh = makeTab();
        setActiveTabIdRaw(fresh.id);
        setAddressBarUrls({ [fresh.id]: 'sentra://newtab' });
        return [fresh];
      }
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        setActiveTabIdRaw(next[Math.min(idx, next.length - 1)].id);
      }
      return next;
    });
    addLog('Tab closed', 'info');
  }, [activeTabId, addLog]);

  // ─── Core navigate (shared between navigate / back / forward) ─────────────

  const _applyNavigation = useCallback((
    tabId: string,
    input: string,
    navBackOverride?: string[],
    navForwardOverride?: string[],
  ) => {
    const { pageType, url, searchQuery } = classifyInput(input);
    const { riskLevel, blackdog } = analyzeUrl(url);

    const title = (() => {
      if (pageType === 'search')    return searchQuery ? `${searchQuery} — Search` : 'Search';
      if (pageType === 'website')   return getDomainTitle(url);
      if (pageType === 'history')   return 'History';
      if (pageType === 'downloads') return 'Downloads';
      if (pageType === 'privacy')   return 'Privacy Report';
      if (pageType === 'vault')     return 'Secure Vault';
      if (pageType === 'settings')  return 'Settings';
      return 'New Tab';
    })();

    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      return {
        ...t, title, url, pageType, searchQuery, riskLevel, blackdog,
        navBack:    navBackOverride    ?? t.navBack,
        navForward: navForwardOverride ?? t.navForward,
      };
    }));
    setAddressBarUrls(prev => ({ ...prev, [tabId]: url }));

    // Add to history for browsable page types
    if (pageType === 'website' || pageType === 'search') {
      setHistory(prev => [
        { id: Math.random().toString(36).slice(2), title, url, visitedAt: new Date(), riskLevel },
        ...prev,
      ].slice(0, 200));
    }

    // Telemetry log
    const logMsg =
      riskLevel === 'danger'  ? `DANGER — ${url}: Threat active. BLACKDOG intercepting.` :
      riskLevel === 'caution' ? `CAUTION — ${url}: ${blackdog.findings[0]}` :
                                `Navigated: ${url}`;
    addLog(logMsg, riskLevel === 'danger' ? 'alert' : riskLevel === 'caution' ? 'warn' : 'info');

    // Loading state for website navigation
    if (pageType === 'website') {
      setIsNavigating(true);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => setIsNavigating(false), 480);
    } else {
      setIsNavigating(false);
    }

    return url;
  }, [addLog]);

  const navigate = useCallback((input: string) => {
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (!currentTab) return;

    const { url: nextUrl, pageType: nextPageType } = classifyInput(input);

    // Don't push current URL to back if it's the new tab page
    const shouldPushBack = currentTab.url !== 'sentra://newtab';
    const newBack = shouldPushBack ? [...currentTab.navBack, currentTab.url] : currentTab.navBack;

    _applyNavigation(activeTabId, input, newBack, []);
  }, [activeTabId, tabs, _applyNavigation]);

  const navigateBack = useCallback(() => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.navBack.length === 0) return;

    const prevUrl = tab.navBack[tab.navBack.length - 1];
    const newBack = tab.navBack.slice(0, -1);
    const newForward = [tab.url, ...tab.navForward];

    _applyNavigation(activeTabId, prevUrl, newBack, newForward);
  }, [activeTabId, tabs, _applyNavigation]);

  const navigateForward = useCallback(() => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.navForward.length === 0) return;

    const nextUrl = tab.navForward[0];
    const newBack = [...tab.navBack, tab.url];
    const newForward = tab.navForward.slice(1);

    _applyNavigation(activeTabId, nextUrl, newBack, newForward);
  }, [activeTabId, tabs, _applyNavigation]);

  const setAddressBarUrl = useCallback((url: string) => {
    setAddressBarUrls(prev => ({ ...prev, [activeTabId]: url }));
  }, [activeTabId]);

  // ─── History ──────────────────────────────────────────────────────────────

  const clearHistory = useCallback(() => {
    setHistory([]);
    addLog('Browsing history cleared', 'info');
  }, [addLog]);

  // ─── Session burn ─────────────────────────────────────────────────────────

  const burnSession = useCallback(() => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    setIsNavigating(false);
    const fresh = makeTab();
    setTabs([fresh]);
    setActiveTabIdRaw(fresh.id);
    setAddressBarUrls({ [fresh.id]: 'sentra://newtab' });
    setHistory([]);
    clearLogs();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    addLog('Session burned — all data sanitized. Environment clean.', 'info');
  }, [clearLogs, addLog]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const currentUrl = addressBarUrls[activeTabId] ?? activeTab.url;
  const canGoBack = (activeTab.navBack ?? []).length > 0;
  const canGoForward = (activeTab.navForward ?? []).length > 0;

  return (
    <BrowserContext.Provider value={{
      tabs, activeTabId, activeTab,
      addTab, closeTab, setActiveTabId, navigate, navigateBack, navigateForward, setAddressBarUrl,
      canGoBack, canGoForward, isNavigating,
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
