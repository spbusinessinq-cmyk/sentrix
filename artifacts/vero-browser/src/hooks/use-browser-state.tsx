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
import { EnrichedResult } from '@/lib/enrichment';

export type { RiskLevel, PageType };
export type BlackdogStatus = 'connecting' | 'connected' | 'unavailable';

const SESSION_VERSION = 5;
const STORAGE_KEY = 'sentrix-session-v5';

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

// ─── Collections ──────────────────────────────────────────────────────────────

export interface SavedItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  posture: string;
  sourceType: string;
  reasoning: string;
  savedAt: Date;
  collectionId?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: Date;
  itemCount: number;
}

const DEFAULT_COLLECTIONS: Collection[] = [
  { id: 'research',   name: 'Research',         description: 'Sources under investigation', color: '#3b82f6', createdAt: new Date(), itemCount: 0 },
  { id: 'watchlist',  name: 'Watchlist',         description: 'Domains to monitor',          color: '#f59e0b', createdAt: new Date(), itemCount: 0 },
  { id: 'sources',    name: 'Trusted Sources',   description: 'Verified reference sources',  color: '#22c55e', createdAt: new Date(), itemCount: 0 },
  { id: 'later',      name: 'Investigate Later', description: 'Queued for follow-up',       color: '#a78bfa', createdAt: new Date(), itemCount: 0 },
];

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
    title: 'New Search',
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
    { id: '4', time: format(new Date(now - 8000),  'HH:mm:ss'), text: 'Analysis ready — awaiting search interaction', type: 'info' },
  ];
}

// ─── Session persistence ──────────────────────────────────────────────────────

function serializeSession(
  tabs: Tab[], activeTabId: string, history: HistoryEntry[],
  bookmarks: BookmarkEntry[], downloads: DownloadEntry[],
  savedItems: SavedItem[], collections: Collection[],
): string {
  return JSON.stringify({
    version: SESSION_VERSION, activeTabId,
    tabs: tabs.map(t => ({
      id: t.id, title: t.title, url: t.url,
      pageType: t.pageType, searchQuery: t.searchQuery,
      riskLevel: t.riskLevel, blackdog: t.blackdog,
    })),
    history: history.map(h => ({ ...h, visitedAt: h.visitedAt.toISOString() })),
    bookmarks: bookmarks.map(b => ({ ...b, savedAt: b.savedAt.toISOString() })),
    downloads,
    savedItems: savedItems.map(s => ({ ...s, savedAt: s.savedAt.toISOString() })),
    collections: collections.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
  });
}

function loadPersistedSession(settings: SentrixSettings): {
  tabs: Tab[]; activeTabId: string; history: HistoryEntry[];
  bookmarks: BookmarkEntry[]; downloads: DownloadEntry[];
  savedItems: SavedItem[]; collections: Collection[];
} | null {
  if (!settings.sessionRestore) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SESSION_VERSION || !Array.isArray(data.tabs) || data.tabs.length === 0) return null;

    const tabs: Tab[] = data.tabs.map((t: any) => ({ ...makeTab(), ...t }));
    const history: HistoryEntry[] = (data.history ?? []).map((h: any) => ({ ...h, visitedAt: new Date(h.visitedAt) })).filter((h: HistoryEntry) => !isNaN(h.visitedAt.getTime()));
    const bookmarks: BookmarkEntry[] = (data.bookmarks ?? []).map((b: any) => ({ ...b, savedAt: new Date(b.savedAt) })).filter((b: BookmarkEntry) => !isNaN(b.savedAt.getTime()));
    const downloads: DownloadEntry[] = data.downloads ?? [];
    const savedItems: SavedItem[] = (data.savedItems ?? []).map((s: any) => ({ ...s, savedAt: new Date(s.savedAt) }));
    const collections: Collection[] = (data.collections ?? DEFAULT_COLLECTIONS).map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) }));

    const activeTabId = tabs.find(t => t.id === data.activeTabId) ? data.activeTabId : tabs[0].id;
    return { tabs, activeTabId, history, bookmarks, downloads, savedItems, collections };
  } catch { return null; }
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

  savedItems: SavedItem[];
  saveItem: (item: Omit<SavedItem, 'id' | 'savedAt'>) => void;
  unsaveItem: (id: string) => void;
  isSaved: (url: string) => boolean;
  addToCollection: (itemId: string, collectionId: string) => void;

  collections: Collection[];
  createCollection: (name: string, description?: string, color?: string) => Collection;
  deleteCollection: (id: string) => void;

  logs: LogEntry[];
  addLog: (text: string, type?: 'info' | 'warn' | 'alert') => void;
  clearLogs: () => void;

  blackdogPanelOpen: boolean;
  setBlackdogPanelOpen: (v: boolean) => void;
  blackdogStatus: BlackdogStatus;

  settings: SentrixSettings;
  updateSettings: (patch: Partial<SentrixSettings>) => void;

  burnSession: () => void;
  navigateOrOpen: (input: string) => void;
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
  const [savedItems, setSavedItems] = useState<SavedItem[]>(persisted?.savedItems ?? []);
  const [collections, setCollections] = useState<Collection[]>(persisted?.collections ?? DEFAULT_COLLECTIONS);
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

  useEffect(() => { applyCompactInterface(settings.compactInterface); }, [settings.compactInterface]);
  useEffect(() => { const timer = setTimeout(() => setBlackdogStatus('connected'), 900); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    if (!settings.clearDataOnExit) return;
    const handler = () => { try { localStorage.removeItem(STORAGE_KEY); } catch {} };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [settings.clearDataOnExit]);
  useEffect(() => {
    if (settings.clearDataOnExit) return;
    try { localStorage.setItem(STORAGE_KEY, serializeSession(tabs, activeTabId, history, bookmarks, downloads, savedItems, collections)); } catch {}
  }, [tabs, activeTabId, history, bookmarks, downloads, savedItems, collections, settings.clearDataOnExit]);

  const updateSettings = useCallback((patch: Partial<SentrixSettings>) => {
    setSettings(prev => { const next = { ...prev, ...patch }; saveSettings(next); return next; });
  }, []);

  const addLog = useCallback((text: string, type: 'info' | 'warn' | 'alert' = 'info') => {
    setLogs(prev => [{ id: Math.random().toString(36).slice(2), time: format(new Date(), 'HH:mm:ss'), text, type }, ...prev].slice(0, 100));
  }, []);
  const clearLogs = useCallback(() => {
    setLogs([{ id: 'cleared', time: format(new Date(), 'HH:mm:ss'), text: 'Session log cleared', type: 'info' }]);
  }, []);

  const setActiveTabId = useCallback((id: string) => setActiveTabIdRaw(id), []);

  const addTab = useCallback(() => {
    const tab = makeTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabIdRaw(tab.id);
    setAddressBarUrls(prev => ({ ...prev, [tab.id]: 'sentrix://newtab' }));
    addLog('New session tab opened', 'info');
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
  }, [activeTabId]);

  const _applyNavigation = useCallback((tabId: string, input: string, navBackOverride?: string[], navForwardOverride?: string[]) => {
    const { pageType, url, searchQuery } = classifyInput(input);
    const { riskLevel, blackdog } = analyzeUrl(url);

    const title = (() => {
      if (pageType === 'search')      return searchQuery ? `${searchQuery}` : 'Search';
      if (pageType === 'website')     return getDomainTitle(url);
      if (pageType === 'history')     return 'Recent';
      if (pageType === 'downloads')   return 'Downloads';
      if (pageType === 'privacy')     return 'Privacy';
      if (pageType === 'vault')       return 'Vault';
      if (pageType === 'settings')    return 'Settings';
      if (pageType === 'bookmarks')   return 'Bookmarks';
      if (pageType === 'collections') return 'Collections';
      return 'New Search';
    })();

    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      return { ...t, title, url, pageType, searchQuery, riskLevel, blackdog,
        navBack: navBackOverride ?? t.navBack, navForward: navForwardOverride ?? t.navForward };
    }));
    setAddressBarUrls(prev => ({ ...prev, [tabId]: url }));

    if (pageType === 'website' || pageType === 'search') {
      setHistory(prev => [{ id: Math.random().toString(36).slice(2), title, url, visitedAt: new Date(), riskLevel }, ...prev].slice(0, 200));
    }

    if (pageType === 'website') {
      const { isFile, filename, size } = isFileUrl(url);
      if (isFile) {
        const dl: DownloadEntry = {
          id: Math.random().toString(36).slice(2), name: filename, url,
          source: getDomainTitle(url), size, status: riskLevel === 'danger' ? 'blocked' : 'downloaded',
          risk: riskLevel, date: format(new Date(), 'MMM d, HH:mm'),
        };
        setDownloads(prev => [dl, ...prev].slice(0, 50));
      }
    }

    const logMsg = riskLevel === 'danger' ? `High-risk domain detected: ${getDomainTitle(url)}` :
                   riskLevel === 'caution' ? `Caution — ${getDomainTitle(url)}` :
                   pageType === 'search' ? `Search: ${searchQuery}` : `Navigate: ${url}`;
    addLog(logMsg, riskLevel === 'danger' ? 'alert' : riskLevel === 'caution' ? 'warn' : 'info');

    if (pageType === 'website') {
      setIsNavigating(true);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => setIsNavigating(false), 480);
    } else { setIsNavigating(false); }
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

  const clearHistory = useCallback(() => { setHistory([]); addLog('History cleared', 'info'); }, [addLog]);

  const addBookmark = useCallback((entry?: Partial<BookmarkEntry>) => {
    const url = entry?.url ?? activeTab.url;
    const title = entry?.title ?? activeTab.title;
    setBookmarks(prev => {
      if (prev.some(b => b.url === url)) return prev;
      const bm: BookmarkEntry = { id: Math.random().toString(36).slice(2), title, url, domain: getDomainTitle(url), riskLevel: activeTab.riskLevel, savedAt: new Date(), ...entry };
      addLog(`Bookmarked: ${getDomainTitle(url)}`, 'info');
      return [bm, ...prev].slice(0, 100);
    });
  }, [activeTab, addLog]);

  const removeBookmark = useCallback((id: string) => { setBookmarks(prev => prev.filter(b => b.id !== id)); }, []);
  const isBookmarked = useCallback((url: string) => bookmarks.some(b => b.url === url), [bookmarks]);
  const clearDownloads = useCallback(() => { setDownloads([]); addLog('Downloads cleared', 'info'); }, [addLog]);

  // ── Collections & Saved Items ──────────────────────────────────────────────

  const saveItem = useCallback((item: Omit<SavedItem, 'id' | 'savedAt'>) => {
    setSavedItems(prev => {
      if (prev.some(s => s.url === item.url)) return prev;
      const newItem: SavedItem = { ...item, id: Math.random().toString(36).slice(2), savedAt: new Date() };
      addLog(`Saved: ${item.domain}`, 'info');
      return [newItem, ...prev].slice(0, 200);
    });
  }, [addLog]);

  const unsaveItem = useCallback((id: string) => {
    setSavedItems(prev => prev.filter(s => s.id !== id));
  }, []);

  const isSaved = useCallback((url: string) => savedItems.some(s => s.url === url), [savedItems]);

  const addToCollection = useCallback((itemId: string, collectionId: string) => {
    setSavedItems(prev => prev.map(s => s.id === itemId ? { ...s, collectionId } : s));
    setCollections(prev => prev.map(c => {
      if (c.id !== collectionId) return c;
      return { ...c, itemCount: prev.find(p => p.id === collectionId)?.itemCount ?? 0 };
    }));
    addLog(`Added to collection`, 'info');
  }, [addLog]);

  const createCollection = useCallback((name: string, description = '', color = '#22c55e'): Collection => {
    const col: Collection = { id: Math.random().toString(36).slice(2), name, description, color, createdAt: new Date(), itemCount: 0 };
    setCollections(prev => [...prev, col]);
    addLog(`Collection created: ${name}`, 'info');
    return col;
  }, [addLog]);

  const deleteCollection = useCallback((id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
    setSavedItems(prev => prev.map(s => s.collectionId === id ? { ...s, collectionId: undefined } : s));
  }, []);

  const burnSession = useCallback(() => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    const fresh = makeTab();
    setTabs([fresh]); setActiveTabIdRaw(fresh.id);
    setAddressBarUrls({ [fresh.id]: 'sentrix://newtab' });
    setHistory([]); setBookmarks([]); setDownloads([]); setSavedItems([]);
    setCollections(DEFAULT_COLLECTIONS);
    clearLogs();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    addLog('Session burned — environment sanitized', 'info');
  }, [clearLogs, addLog]);

  // URL input → open externally; search/sentrix input → internal navigate
  const navigateOrOpen = useCallback((input: string) => {
    const { pageType, url, searchQuery } = classifyInput(input);
    if (pageType === 'website') {
      window.open(url, '_blank', 'noopener,noreferrer');
      // Log it and add to history
      setHistory(prev => [{
        id: Math.random().toString(36).slice(2),
        title: getDomainTitle(url),
        url,
        visitedAt: new Date(),
        riskLevel: 'unknown',
      }, ...prev].slice(0, 200));
      addLog(`Opened externally: ${getDomainTitle(url)}`, 'info');
    } else {
      navigate(input);
    }
  }, [navigate, addLog]);

  const currentUrl = addressBarUrls[activeTabId] ?? activeTab.url;
  const canGoBack = (activeTab.navBack ?? []).length > 0;
  const canGoForward = (activeTab.navForward ?? []).length > 0;

  // Compute real collection item counts
  const collectionsWithCounts = collections.map(c => ({
    ...c,
    itemCount: savedItems.filter(s => s.collectionId === c.id).length,
  }));

  return (
    <BrowserContext.Provider value={{
      tabs, activeTabId, activeTab,
      addTab, closeTab, setActiveTabId, navigate, navigateBack, navigateForward, setAddressBarUrl,
      canGoBack, canGoForward, isNavigating,
      currentUrl, riskLevel: activeTab.riskLevel, searchQuery: activeTab.searchQuery, pageType: activeTab.pageType,
      history, clearHistory,
      bookmarks, addBookmark, removeBookmark, isBookmarked,
      downloads, clearDownloads,
      savedItems, saveItem, unsaveItem, isSaved, addToCollection,
      collections: collectionsWithCounts, createCollection, deleteCollection,
      logs, addLog, clearLogs,
      blackdogPanelOpen, setBlackdogPanelOpen, blackdogStatus,
      settings, updateSettings,
      burnSession, navigateOrOpen,
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
