import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  RiskLevel, BlackdogData, PageType,
  analyzeUrl, classifyInput, getDomainTitle,
} from '@/lib/blackdog';
import {
  SentrixSettings, DEFAULT_SETTINGS,
  loadSettings, saveSettings, applyCompactInterface,
} from '@/lib/settings';

export type { RiskLevel, PageType };
export type BlackdogStatus = 'connecting' | 'connected' | 'unavailable';

const SESSION_VERSION = 4;
const STORAGE_KEY = 'sentrix-session-v4';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Tab {
  id: string;
  title: string;
  url: string;
  pageType: PageType;
  searchQuery: string;
  riskLevel: RiskLevel;
  blackdog: BlackdogData;
  navBack: string[];
  navForward: string[];
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  visitedAt: Date;
  riskLevel: RiskLevel;
}

export interface BookmarkEntry {
  id: string;
  title: string;
  url: string;
  domain: string;
  riskLevel: RiskLevel;
  savedAt: Date;
}

export interface DownloadEntry {
  id: string;
  name: string;
  url: string;
  source: string;
  size: string;
  status: 'downloaded' | 'blocked' | 'queued';
  risk: RiskLevel;
  date: string;
}

export interface LogEntry {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'warn' | 'alert';
}

// ─── File extension detection ──────────────────────────────────────────────────

const FILE_EXTENSIONS = /\.(pdf|zip|dmg|exe|msi|pkg|tar|gz|rar|7z|apk|deb|rpm|csv|xlsx|docx|pptx|mp4|mp3)(\?.*)?$/i;

function isFileUrl(url: string): { isFile: boolean; filename: string; size: string } {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const match = path.match(FILE_EXTENSIONS);
    if (!match) return { isFile: false, filename: '', size: '' };
    const parts = path.split('/');
    const filename = parts[parts.length - 1] || path;
    const ext = match[1].toLowerCase();
    const sizeMock: Record<string, string> = {
      pdf: '1.2 MB', zip: '4.8 MB', dmg: '92 MB', exe: '18 MB',
      msi: '14 MB', mp4: '88 MB', mp3: '8 MB', default: '< 1 MB',
    };
    return { isFile: true, filename, size: sizeMock[ext] ?? sizeMock.default };
  } catch {
    return { isFile: false, filename: '', size: '' };
  }
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const INTERNAL_BLACKDOG: BlackdogData = {
  certificate: 'Internal',
  hsts: true, fingerprinting: false, mixedContent: false,
  findings: ['Internal Sentrix page — system trusted'],
};

function makeTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: `tab-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New Tab',
    url: 'sentrix://newtab',
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
    { id: '1', time: format(new Date(now - 60000), 'HH:mm:ss'), text: 'BLACKDOG Engine connected — v4.1.2', type: 'info' },
    { id: '2', time: format(new Date(now - 45000), 'HH:mm:ss'), text: 'Session encryption active (TLS 1.3)', type: 'info' },
    { id: '3', time: format(new Date(now - 20000), 'HH:mm:ss'), text: 'Protection active — monitoring enabled', type: 'info' },
    { id: '4', time: format(new Date(now - 8000),  'HH:mm:ss'), text: 'Analysis ready — awaiting page interaction', type: 'info' },
  ];
}

// ─── Session persistence ──────────────────────────────────────────────────────

interface PersistedTab {
  id: string; title: string; url: string; pageType: PageType;
  searchQuery: string; riskLevel: RiskLevel; blackdog: BlackdogData;
}

function serializeSession(
  tabs: Tab[], activeTabId: string, history: HistoryEntry[],
  bookmarks: BookmarkEntry[], downloads: DownloadEntry[],
): string {
  return JSON.stringify({
    version: SESSION_VERSION,
    activeTabId,
    tabs: tabs.map(t => ({
      id: t.id, title: t.title, url: t.url,
      pageType: t.pageType, searchQuery: t.searchQuery,
      riskLevel: t.riskLevel, blackdog: t.blackdog,
    })),
    history: history.map(h => ({ ...h, visitedAt: h.visitedAt.toISOString() })),
    bookmarks: bookmarks.map(b => ({ ...b, savedAt: b.savedAt.toISOString() })),
    downloads,
  });
}

function loadPersistedSession(settings: SentrixSettings): {
  tabs: Tab[]; activeTabId: string; history: HistoryEntry[];
  bookmarks: BookmarkEntry[]; downloads: DownloadEntry[];
} | null {
  if (!settings.sessionRestore) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SESSION_VERSION || !Array.isArray(data.tabs) || data.tabs.length === 0) return null;

    const tabs: Tab[] = data.tabs.map((t: PersistedTab) => ({
      ...makeTab(),
      id: t.id, title: t.title, url: t.url ?? 'sentrix://newtab',
      pageType: t.pageType ?? 'newtab', searchQuery: t.searchQuery ?? '',
      riskLevel: t.riskLevel ?? 'safe', blackdog: t.blackdog ?? INTERNAL_BLACKDOG,
    }));

    const history: HistoryEntry[] = (data.history ?? [])
      .map((h: any) => ({ ...h, visitedAt: new Date(h.visitedAt) }))
      .filter((h: HistoryEntry) => !isNaN(h.visitedAt.getTime()));

    const bookmarks: BookmarkEntry[] = (data.bookmarks ?? [])
      .map((b: any) => ({ ...b, savedAt: new Date(b.savedAt) }))
      .filter((b: BookmarkEntry) => !isNaN(b.savedAt.getTime()));

    const downloads: DownloadEntry[] = data.downloads ?? [];

    const activeTabId = tabs.find(t => t.id === data.activeTabId)
      ? data.activeTabId : tabs[0].id;

    return { tabs, activeTabId, history, bookmarks, downloads };
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

  bookmarks: BookmarkEntry[];
  addBookmark: (entry?: Partial<BookmarkEntry>) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (url: string) => boolean;

  downloads: DownloadEntry[];
  clearDownloads: () => void;

  logs: LogEntry[];
  addLog: (text: string, type?: 'info' | 'warn' | 'alert') => void;
  clearLogs: () => void;

  blackdogPanelOpen: boolean;
  setBlackdogPanelOpen: (v: boolean) => void;
  blackdogStatus: BlackdogStatus;

  settings: SentrixSettings;
  updateSettings: (patch: Partial<SentrixSettings>) => void;

  burnSession: () => void;
}

const BrowserContext = createContext<BrowserState | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BrowserProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SentrixSettings>(() => loadSettings());
  const persisted = loadPersistedSession(settings);

  const [tabs, setTabs] = useState<Tab[]>(persisted?.tabs ?? [makeTab({ id: 'tab-init' })]);
  const [activeTabId, setActiveTabIdRaw] = useState<string>(persisted?.activeTabId ?? 'tab-init');
  const [history, setHistory] = useState<HistoryEntry[]>(persisted?.history ?? []);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(persisted?.bookmarks ?? []);
  const [downloads, setDownloads] = useState<DownloadEntry[]>(persisted?.downloads ?? []);
  const [logs, setLogs] = useState<LogEntry[]>(makeInitialLogs());
  const [blackdogPanelOpen, setBlackdogPanelOpen] = useState(settings.blackdogPanelOpenByDefault);
  const [isNavigating, setIsNavigating] = useState(false);
  const [blackdogStatus, setBlackdogStatus] = useState<BlackdogStatus>('connecting');
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addressBarUrls, setAddressBarUrls] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (persisted?.tabs ?? [makeTab({ id: 'tab-init' })]).forEach(t => { map[t.id] = t.url; });
    return map;
  });

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0] ?? makeTab({ id: 'tab-fallback' });

  // Apply compact interface on settings change
  useEffect(() => {
    applyCompactInterface(settings.compactInterface);
  }, [settings.compactInterface]);

  // BLACKDOG connection simulation
  useEffect(() => {
    const timer = setTimeout(() => setBlackdogStatus('connected'), 900);
    return () => clearTimeout(timer);
  }, []);

  // Clear data on exit if setting enabled
  useEffect(() => {
    if (!settings.clearDataOnExit) return;
    const handler = () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [settings.clearDataOnExit]);

  // Persist to localStorage (respects clearDataOnExit — only persists if not set)
  useEffect(() => {
    if (settings.clearDataOnExit) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeSession(tabs, activeTabId, history, bookmarks, downloads));
    } catch {}
  }, [tabs, activeTabId, history, bookmarks, downloads, settings.clearDataOnExit]);

  // ─── Settings ─────────────────────────────────────────────────────────────

  const updateSettings = useCallback((patch: Partial<SentrixSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // ─── Logging ──────────────────────────────────────────────────────────────

  const addLog = useCallback((text: string, type: 'info' | 'warn' | 'alert' = 'info') => {
    setLogs(prev => [
      { id: Math.random().toString(36).slice(2), time: format(new Date(), 'HH:mm:ss'), text, type },
      ...prev,
    ].slice(0, 100));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([{ id: 'cleared', time: format(new Date(), 'HH:mm:ss'), text: 'Session log cleared', type: 'info' }]);
  }, []);

  // ─── Tab management ───────────────────────────────────────────────────────

  const setActiveTabId = useCallback((id: string) => setActiveTabIdRaw(id), []);

  const addTab = useCallback(() => {
    const tab = makeTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabIdRaw(tab.id);
    setAddressBarUrls(prev => ({ ...prev, [tab.id]: 'sentrix://newtab' }));
    addLog('New secure tab opened', 'info');
  }, [addLog]);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length === 1) {
        const fresh = makeTab();
        setActiveTabIdRaw(fresh.id);
        setAddressBarUrls({ [fresh.id]: 'sentrix://newtab' });
        return [fresh];
      }
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      if (activeTabId === id) setActiveTabIdRaw(next[Math.min(idx, next.length - 1)].id);
      return next;
    });
    addLog('Tab closed', 'info');
  }, [activeTabId, addLog]);

  // ─── Core navigation ──────────────────────────────────────────────────────

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
      if (pageType === 'bookmarks') return 'Bookmarks';
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

    // Add to history
    if (pageType === 'website' || pageType === 'search') {
      setHistory(prev => [
        { id: Math.random().toString(36).slice(2), title, url, visitedAt: new Date(), riskLevel },
        ...prev,
      ].slice(0, 200));
    }

    // Auto-track file downloads
    if (pageType === 'website') {
      const { isFile, filename, size } = isFileUrl(url);
      if (isFile) {
        const dl: DownloadEntry = {
          id: Math.random().toString(36).slice(2),
          name: filename,
          url,
          source: getDomainTitle(url),
          size,
          status: riskLevel === 'danger' ? 'blocked' : 'downloaded',
          risk: riskLevel,
          date: format(new Date(), 'MMM d, HH:mm'),
        };
        setDownloads(prev => [dl, ...prev].slice(0, 50));
        addLog(`${riskLevel === 'danger' ? 'Download blocked' : 'Download tracked'}: ${filename}`, riskLevel === 'danger' ? 'alert' : 'info');
      }
    }

    const logMsg =
      riskLevel === 'danger'  ? `High-risk domain detected: ${getDomainTitle(url)}` :
      riskLevel === 'caution' ? `Caution — ${getDomainTitle(url)}: ${blackdog.findings[0]}` :
                                `Navigated: ${url}`;
    addLog(logMsg, riskLevel === 'danger' ? 'alert' : riskLevel === 'caution' ? 'warn' : 'info');

    if (pageType === 'website') {
      setIsNavigating(true);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => setIsNavigating(false), 480);
    } else {
      setIsNavigating(false);
    }
  }, [addLog]);

  const navigate = useCallback((input: string) => {
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (!currentTab) return;
    const shouldPushBack = currentTab.url !== 'sentrix://newtab';
    const newBack = shouldPushBack ? [...currentTab.navBack, currentTab.url] : currentTab.navBack;
    _applyNavigation(activeTabId, input, newBack, []);
  }, [activeTabId, tabs, _applyNavigation]);

  const navigateBack = useCallback(() => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.navBack.length === 0) return;
    const prevUrl = tab.navBack[tab.navBack.length - 1];
    _applyNavigation(activeTabId, prevUrl, tab.navBack.slice(0, -1), [tab.url, ...tab.navForward]);
  }, [activeTabId, tabs, _applyNavigation]);

  const navigateForward = useCallback(() => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || tab.navForward.length === 0) return;
    const nextUrl = tab.navForward[0];
    _applyNavigation(activeTabId, nextUrl, [...tab.navBack, tab.url], tab.navForward.slice(1));
  }, [activeTabId, tabs, _applyNavigation]);

  const setAddressBarUrl = useCallback((url: string) => {
    setAddressBarUrls(prev => ({ ...prev, [activeTabId]: url }));
  }, [activeTabId]);

  // ─── History ──────────────────────────────────────────────────────────────

  const clearHistory = useCallback(() => {
    setHistory([]);
    addLog('Browsing history cleared', 'info');
  }, [addLog]);

  // ─── Bookmarks ────────────────────────────────────────────────────────────

  const addBookmark = useCallback((entry?: Partial<BookmarkEntry>) => {
    const url = entry?.url ?? activeTab.url;
    const title = entry?.title ?? activeTab.title;
    setBookmarks(prev => {
      if (prev.some(b => b.url === url)) return prev;
      const bm: BookmarkEntry = {
        id: Math.random().toString(36).slice(2),
        title,
        url,
        domain: getDomainTitle(url),
        riskLevel: activeTab.riskLevel,
        savedAt: new Date(),
        ...entry,
      };
      addLog(`Bookmarked: ${getDomainTitle(url)}`, 'info');
      return [bm, ...prev].slice(0, 100);
    });
  }, [activeTab, addLog]);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    addLog('Bookmark removed', 'info');
  }, [addLog]);

  const isBookmarked = useCallback((url: string) => {
    return bookmarks.some(b => b.url === url);
  }, [bookmarks]);

  // ─── Downloads ────────────────────────────────────────────────────────────

  const clearDownloads = useCallback(() => {
    setDownloads([]);
    addLog('Downloads list cleared', 'info');
  }, [addLog]);

  // ─── Burn session ─────────────────────────────────────────────────────────

  const burnSession = useCallback(() => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    setIsNavigating(false);
    const fresh = makeTab();
    setTabs([fresh]);
    setActiveTabIdRaw(fresh.id);
    setAddressBarUrls({ [fresh.id]: 'sentrix://newtab' });
    setHistory([]);
    setBookmarks([]);
    setDownloads([]);
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
      bookmarks, addBookmark, removeBookmark, isBookmarked,
      downloads, clearDownloads,
      logs, addLog, clearLogs,
      blackdogPanelOpen, setBlackdogPanelOpen, blackdogStatus,
      settings, updateSettings,
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
