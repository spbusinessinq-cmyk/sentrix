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

// ─── Investigation ─────────────────────────────────────────────────────────────

export interface Investigation {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  querySeed: string;
  savedItemIds: string[];
  analysisIds: string[];
  notes: string;
}

// ─── Sage Analysis ──────────────────────────────────────────────────────────────

export interface SageAnalysis {
  id: string;
  query: string;
  fullText: string;
  whatMatters: string;
  whatToQuestion: string;
  sources: string;
  savedAt: Date;
}

const INVESTIGATIONS_KEY = 'sentrix-investigations-v1';
const ANALYSES_KEY = 'sentrix-analyses-v1';
const VAULT_PASSCODE_KEY = 'sentrix-vault-passcode-v1';
const VAULT_DATA_KEY = 'sentrix-vault-data-v1';

// ─── Vault helpers ─────────────────────────────────────────────────────────────

export interface VaultItem {
  id: string;
  type: 'analysis' | 'source';
  title: string;
  summary: string;
  movedAt: Date;
  originalId: string;
}

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + 'sentrix-salt-v1'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function loadVaultPasscodeHash(): string | null {
  try { return localStorage.getItem(VAULT_PASSCODE_KEY) ?? null; } catch { return null; }
}

function loadVaultItems(): VaultItem[] {
  try {
    const raw = localStorage.getItem(VAULT_DATA_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return (Array.isArray(data) ? data : []).map((v: any) => ({ ...v, movedAt: new Date(v.movedAt) }));
  } catch { return []; }
}

function persistVaultItems(items: VaultItem[]): void {
  try { localStorage.setItem(VAULT_DATA_KEY, JSON.stringify(items.map(v => ({ ...v, movedAt: v.movedAt.toISOString() })))); } catch {}
}

function loadInvestigations(): Investigation[] {
  try {
    const raw = localStorage.getItem(INVESTIGATIONS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((inv: any) => ({
        ...inv,
        createdAt: new Date(inv.createdAt),
        updatedAt: new Date(inv.updatedAt),
        analysisIds: inv.analysisIds ?? [],
      }))
      .filter((inv: any) => inv.id && inv.name);
  } catch { return []; }
}

function persistInvestigations(invs: Investigation[]): void {
  try {
    localStorage.setItem(INVESTIGATIONS_KEY, JSON.stringify(
      invs.map(inv => ({ ...inv, createdAt: inv.createdAt.toISOString(), updatedAt: inv.updatedAt.toISOString() }))
    ));
  } catch {}
}

function loadAnalyses(): SageAnalysis[] {
  try {
    const raw = localStorage.getItem(ANALYSES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map((a: any) => ({ ...a, savedAt: new Date(a.savedAt) }));
  } catch { return []; }
}

function persistAnalyses(analyses: SageAnalysis[]): void {
  try {
    localStorage.setItem(ANALYSES_KEY, JSON.stringify(
      analyses.map(a => ({ ...a, savedAt: a.savedAt.toISOString() }))
    ));
  } catch {}
}

function makeInvestigation(name: string, querySeed = ''): Investigation {
  return {
    id: `inv-${Math.random().toString(36).slice(2, 10)}`,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
    querySeed,
    savedItemIds: [],
    analysisIds: [],
    notes: '',
  };
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
  saveItemToCollection: (item: Omit<SavedItem, 'id' | 'savedAt'>, collectionId: string) => void;

  collections: Collection[];
  createCollection: (name: string, description?: string, color?: string) => Collection;
  deleteCollection: (id: string) => void;

  investigations: Investigation[];
  activeInvestigationId: string | null;
  investigationMode: boolean;
  toggleInvestigationMode: (querySeed?: string) => void;
  startInvestigation: (name: string, querySeed?: string) => Investigation;
  setActiveInvestigation: (id: string) => void;
  renameInvestigation: (id: string, name: string) => void;
  updateInvestigationNotes: (id: string, notes: string) => void;
  clearInvestigationItems: (id: string) => void;
  deleteInvestigation: (id: string) => void;
  attachToInvestigation: (savedItemId: string) => void;
  detachFromInvestigation: (invId: string, savedItemId: string) => void;
  exportInvestigation: (id: string, fmt: 'text' | 'json') => void;

  sageAnalyses: SageAnalysis[];
  saveSageAnalysis: (item: Omit<SageAnalysis, 'id' | 'savedAt'>) => string;

  logs: LogEntry[];
  addLog: (text: string, type?: 'info' | 'warn' | 'alert') => void;
  clearLogs: () => void;

  blackdogPanelOpen: boolean;
  setBlackdogPanelOpen: (v: boolean) => void;
  blackdogStatus: BlackdogStatus;

  savedIntelPanelOpen: boolean;
  setSavedIntelPanelOpen: (v: boolean) => void;

  vaultItems: VaultItem[];
  vaultUnlocked: boolean;
  hasVaultPasscode: boolean;
  setVaultUnlocked: (v: boolean) => void;
  createVaultPasscode: (pin: string) => Promise<void>;
  verifyVaultPasscode: (pin: string) => Promise<boolean>;
  moveToVault: (type: 'analysis' | 'source', originalId: string, title: string, summary: string) => void;
  removeFromVault: (id: string) => void;

  settings: SentrixSettings;
  updateSettings: (patch: Partial<SentrixSettings>) => void;

  burnSession: () => void;
  navigateOrOpen: (input: string) => void;

  /** Transient flag — when true, SearchResultsView auto-opens Sage on mount */
  sageMode: boolean;
  setSageMode: (v: boolean) => void;
  /** Navigate to search results with Sage pre-opened */
  navigateToSage: (query: string) => void;
}

const BrowserContext = createContext<BrowserState | undefined>(undefined);

// ─── File download helper ─────────────────────────────────────────────────────

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

  const [investigations, setInvestigations] = useState<Investigation[]>(() => loadInvestigations());
  const [investigationMode, setInvestigationMode] = useState(false);
  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>(null);
  const [sageAnalyses, setSageAnalyses] = useState<SageAnalysis[]>(() => loadAnalyses());
  const [sageMode, setSageMode] = useState(false);
  const investigationModeRef = useRef(false);
  const activeInvestigationIdRef = useRef<string | null>(null);

  const [savedIntelPanelOpen, setSavedIntelPanelOpen] = useState(false);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>(() => loadVaultItems());
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPasscodeHashState, setVaultPasscodeHashState] = useState<string | null>(() => loadVaultPasscodeHash());

  useEffect(() => { persistVaultItems(vaultItems); }, [vaultItems]);

  const createVaultPasscode = useCallback(async (pin: string) => {
    const hash = await hashPin(pin);
    try { localStorage.setItem(VAULT_PASSCODE_KEY, hash); } catch {}
    setVaultPasscodeHashState(hash);
    setVaultUnlocked(true);
  }, []);

  const verifyVaultPasscode = useCallback(async (pin: string): Promise<boolean> => {
    const stored = loadVaultPasscodeHash();
    if (!stored) return false;
    const hash = await hashPin(pin);
    const ok = hash === stored;
    if (ok) setVaultUnlocked(true);
    return ok;
  }, []);

  const moveToVault = useCallback((type: 'analysis' | 'source', originalId: string, title: string, summary: string) => {
    setVaultItems(prev => {
      if (prev.some(v => v.originalId === originalId && v.type === type)) return prev;
      return [...prev, {
        id: `vault-${Math.random().toString(36).slice(2, 10)}`,
        type, title, summary, movedAt: new Date(), originalId,
      }];
    });
  }, []);

  const removeFromVault = useCallback((id: string) => {
    setVaultItems(prev => prev.filter(v => v.id !== id));
  }, []);

  const [addressBarUrls, setAddressBarUrls] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (persisted?.tabs ?? [makeTab({ id: 'tab-init' })]).forEach(t => { map[t.id] = t.url; });
    return map;
  });

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0] ?? makeTab({ id: 'tab-fallback' });

  useEffect(() => { applyCompactInterface(settings.compactInterface); }, [settings.compactInterface]);
  useEffect(() => { const timer = setTimeout(() => setBlackdogStatus('connected'), 900); return () => clearTimeout(timer); }, []);
  useEffect(() => { investigationModeRef.current = investigationMode; }, [investigationMode]);
  useEffect(() => { activeInvestigationIdRef.current = activeInvestigationId; }, [activeInvestigationId]);
  useEffect(() => { persistInvestigations(investigations); }, [investigations]);
  useEffect(() => { persistAnalyses(sageAnalyses); }, [sageAnalyses]);
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
      if (pageType === 'settings')      return 'Settings';
      if (pageType === 'bookmarks')     return 'Bookmarks';
      if (pageType === 'collections')   return 'Collections';
      if (pageType === 'investigations') return 'Investigations';
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
      const newId = Math.random().toString(36).slice(2);
      const newItem: SavedItem = { ...item, id: newId, savedAt: new Date() };
      addLog(`Saved: ${item.domain}`, 'info');
      if (investigationModeRef.current && activeInvestigationIdRef.current) {
        const invId = activeInvestigationIdRef.current;
        setInvestigations(invs => invs.map(inv =>
          inv.id === invId
            ? { ...inv, savedItemIds: [...inv.savedItemIds, newId], updatedAt: new Date() }
            : inv
        ));
      }
      return [newItem, ...prev].slice(0, 200);
    });
  }, [addLog]);

  const unsaveItem = useCallback((id: string) => {
    setSavedItems(prev => prev.filter(s => s.id !== id));
  }, []);

  const isSaved = useCallback((url: string) => savedItems.some(s => s.url === url), [savedItems]);

  const addToCollection = useCallback((itemId: string, collectionId: string) => {
    setSavedItems(prev => prev.map(s => s.id === itemId ? { ...s, collectionId } : s));
    addLog(`Added to collection`, 'info');
  }, [addLog]);

  const saveItemToCollection = useCallback((item: Omit<SavedItem, 'id' | 'savedAt'>, collectionId: string) => {
    setSavedItems(prev => {
      const existing = prev.find(s => s.url === item.url);
      if (existing) {
        return prev.map(s => s.id === existing.id ? { ...s, collectionId } : s);
      }
      const newId = Math.random().toString(36).slice(2);
      const newItem: SavedItem = { ...item, id: newId, savedAt: new Date(), collectionId };
      addLog(`Saved to collection: ${item.domain}`, 'info');
      if (investigationModeRef.current && activeInvestigationIdRef.current) {
        const invId = activeInvestigationIdRef.current;
        setInvestigations(invs => invs.map(inv =>
          inv.id === invId
            ? { ...inv, savedItemIds: [...inv.savedItemIds, newId], updatedAt: new Date() }
            : inv
        ));
      }
      return [newItem, ...prev].slice(0, 200);
    });
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

  // ── Investigation Mode ─────────────────────────────────────────────────────

  const startInvestigation = useCallback((name: string, querySeed = ''): Investigation => {
    const inv = makeInvestigation(name, querySeed);
    setInvestigations(prev => [inv, ...prev]);
    setActiveInvestigationId(inv.id);
    activeInvestigationIdRef.current = inv.id;
    addLog(`Investigation started: ${name}`, 'info');
    return inv;
  }, [addLog]);

  const toggleInvestigationMode = useCallback((querySeed = '') => {
    setInvestigationMode(prev => {
      const next = !prev;
      investigationModeRef.current = next;
      if (next && !activeInvestigationIdRef.current) {
        const name = querySeed
          ? `${querySeed.slice(0, 40)}`
          : `Investigation ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
        const inv = makeInvestigation(name, querySeed);
        setInvestigations(p => [inv, ...p]);
        setActiveInvestigationId(inv.id);
        activeInvestigationIdRef.current = inv.id;
        addLog(`Investigation started: ${name}`, 'info');
      }
      if (!next) addLog('Investigation Mode disabled', 'info');
      return next;
    });
  }, [addLog]);

  const setActiveInvestigation = useCallback((id: string) => {
    setActiveInvestigationId(id);
    activeInvestigationIdRef.current = id;
  }, []);

  const renameInvestigation = useCallback((id: string, name: string) => {
    setInvestigations(prev => prev.map(inv =>
      inv.id === id ? { ...inv, name, updatedAt: new Date() } : inv
    ));
  }, []);

  const updateInvestigationNotes = useCallback((id: string, notes: string) => {
    setInvestigations(prev => prev.map(inv =>
      inv.id === id ? { ...inv, notes, updatedAt: new Date() } : inv
    ));
  }, []);

  const clearInvestigationItems = useCallback((id: string) => {
    setInvestigations(prev => prev.map(inv =>
      inv.id === id ? { ...inv, savedItemIds: [], updatedAt: new Date() } : inv
    ));
    addLog('Investigation items cleared', 'info');
  }, [addLog]);

  const deleteInvestigation = useCallback((id: string) => {
    setInvestigations(prev => prev.filter(inv => inv.id !== id));
    setActiveInvestigationId(prev => {
      if (prev === id) { activeInvestigationIdRef.current = null; return null; }
      return prev;
    });
    addLog('Investigation deleted', 'info');
  }, [addLog]);

  const attachToInvestigation = useCallback((savedItemId: string) => {
    if (!activeInvestigationIdRef.current) return;
    const invId = activeInvestigationIdRef.current;
    setInvestigations(prev => prev.map(inv =>
      inv.id === invId && !inv.savedItemIds.includes(savedItemId)
        ? { ...inv, savedItemIds: [...inv.savedItemIds, savedItemId], updatedAt: new Date() }
        : inv
    ));
    addLog('Item attached to investigation', 'info');
  }, [addLog]);

  const detachFromInvestigation = useCallback((invId: string, savedItemId: string) => {
    setInvestigations(prev => prev.map(inv =>
      inv.id === invId
        ? { ...inv, savedItemIds: inv.savedItemIds.filter(id => id !== savedItemId), updatedAt: new Date() }
        : inv
    ));
    addLog('Item removed from investigation', 'info');
  }, [addLog]);

  const saveSageAnalysis = useCallback((item: Omit<SageAnalysis, 'id' | 'savedAt'>): string => {
    const newId = `analysis-${Math.random().toString(36).slice(2, 10)}`;
    const newAnalysis: SageAnalysis = { ...item, id: newId, savedAt: new Date() };
    setSageAnalyses(prev => [newAnalysis, ...prev].slice(0, 200));
    addLog(`Analysis saved: "${item.query.slice(0, 40)}"`, 'info');
    if (investigationModeRef.current && activeInvestigationIdRef.current) {
      const invId = activeInvestigationIdRef.current;
      setInvestigations(invs => invs.map(inv =>
        inv.id === invId
          ? { ...inv, analysisIds: [...(inv.analysisIds ?? []), newId], updatedAt: new Date() }
          : inv
      ));
    }
    return newId;
  }, [addLog]);

  const exportInvestigation = useCallback((id: string, fmt: 'text' | 'json') => {
    const inv = investigations.find(i => i.id === id);
    if (!inv) return;
    const invItems = savedItems.filter(s => inv.savedItemIds.includes(s.id));
    const ts = new Date().toISOString();
    if (fmt === 'json') {
      const payload = {
        investigation: {
          id: inv.id, name: inv.name, querySeed: inv.querySeed,
          createdAt: inv.createdAt, updatedAt: inv.updatedAt, notes: inv.notes,
        },
        sources: invItems.map(s => ({
          title: s.title, url: s.url, domain: s.domain,
          posture: s.posture, sourceType: s.sourceType,
          reasoning: s.reasoning, savedAt: s.savedAt,
        })),
        exportedAt: ts,
      };
      downloadText(`${inv.name}.json`, JSON.stringify(payload, null, 2), 'application/json');
    } else {
      const lines = [
        `SENTRIX INVESTIGATION EXPORT`,
        `===============================`,
        `Name:       ${inv.name}`,
        `Started:    ${inv.createdAt.toLocaleString()}`,
        `Exported:   ${new Date(ts).toLocaleString()}`,
        `Query seed: ${inv.querySeed || '(none)'}`,
        ``,
        `NOTES`,
        `-----`,
        inv.notes || '(none)',
        ``,
        `SOURCES (${invItems.length})`,
        `-------`,
        ...invItems.map((s, i) =>
          [`[${i + 1}] ${s.title}`, `    URL:     ${s.url}`, `    Domain:  ${s.domain}`,
           `    Posture: ${s.posture.toUpperCase()}`, `    Type:    ${s.sourceType}`,
           `    Reason:  ${s.reasoning}`, ``].join('\n')
        ),
      ];
      downloadText(`${inv.name}.txt`, lines.join('\n'), 'text/plain');
    }
  }, [investigations, savedItems]);

  const burnSession = useCallback(() => {
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    const fresh = makeTab();
    setTabs([fresh]); setActiveTabIdRaw(fresh.id);
    setAddressBarUrls({ [fresh.id]: 'sentrix://newtab' });
    setHistory([]); setBookmarks([]); setDownloads([]); setSavedItems([]);
    setCollections(DEFAULT_COLLECTIONS);
    setInvestigations([]);
    setSageAnalyses([]);
    setInvestigationMode(false);
    setActiveInvestigationId(null);
    investigationModeRef.current = false;
    activeInvestigationIdRef.current = null;
    clearLogs();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(INVESTIGATIONS_KEY);
      localStorage.removeItem(ANALYSES_KEY);
    } catch {}
    addLog('Session burned — environment sanitized', 'info');
  }, [clearLogs, addLog]);

  // Navigate to search with Sage pre-opened
  const navigateToSage = useCallback((query: string) => {
    setSageMode(true);
    navigate(query);
  }, [navigate]);

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
        riskLevel: 'unknown' as RiskLevel,
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
      savedItems, saveItem, unsaveItem, isSaved, addToCollection, saveItemToCollection,
      collections: collectionsWithCounts, createCollection, deleteCollection,
      investigations, activeInvestigationId, investigationMode,
      toggleInvestigationMode, startInvestigation, setActiveInvestigation,
      renameInvestigation, updateInvestigationNotes, clearInvestigationItems,
      deleteInvestigation, attachToInvestigation, detachFromInvestigation, exportInvestigation,
      sageAnalyses, saveSageAnalysis,
      logs, addLog, clearLogs,
      blackdogPanelOpen, setBlackdogPanelOpen, blackdogStatus,
      savedIntelPanelOpen, setSavedIntelPanelOpen,
      vaultItems, vaultUnlocked, hasVaultPasscode: !!vaultPasscodeHashState,
      setVaultUnlocked, createVaultPasscode, verifyVaultPasscode,
      moveToVault, removeFromVault,
      settings, updateSettings,
      burnSession, navigateOrOpen,
      sageMode, setSageMode, navigateToSage,
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
