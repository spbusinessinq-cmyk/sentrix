# Sentrix

A dark tactical **Signal & Truth Filter** system. Product identity: "Analyze before you believe." Primary function: analyze claims, headlines, URLs and return structured intelligence. Powered by BLACKDOG private security engine and Sage (Gemini 2.5 Flash AI).

## Sage Output Format

**Core (all inputs):** ANSWER → SIGNAL → AGREEMENT → RISK → WHAT MATTERS → WHAT TO QUESTION → SOURCES

**Article/URL mode extension:** + ARTICLE → SUMMARY → CORE CLAIMS → VERDICT → WHAT HOLDS UP → WHAT DOES NOT HOLD UP → WHAT TO VERIFY NEXT

## Input Type Detection

Sage backend auto-detects input type on every query:
- `url` — starts with `https?://`, triggers article fetch + article mode output
- `article` — text > 300 chars, uses article mode output
- `question` — default for short queries

URL inputs trigger a server-side article fetch (title, content, author, date extracted from HTML) before analysis.

## Architecture

**Monorepo** (`pnpm workspaces`):
- `artifacts/vero-browser/` — React + Vite frontend (port via `$PORT` in dev, static build for prod)
- `artifacts/api-server/` — Express API server (port 8080), **dev/Replit production server**
- `artifacts/mockup-sandbox/` — Component preview server (dev only)
- `cloud-functions/` — **EdgeOne Pages Node Functions** (production API for `sentrix.live`)
- `edgeone.json` — EdgeOne Pages build + functions config

### EdgeOne Pages Production Architecture (sentrix.live)

On **EdgeOne Pages**, the deployment is:
1. **Static frontend** built from `artifacts/vero-browser/dist/public`
2. **Node Functions** in `cloud-functions/` handle all `/api/*` routes same-origin:
   - `cloud-functions/api/healthz.js` → `/api/healthz`
   - `cloud-functions/api/search.js` → `/api/search`
   - `cloud-functions/api/sage/query.js` → `/api/sage/query`

EdgeOne environment variables required:
- `GEMINI_API_KEY` — Google AI API key for Sage (Gemini 2.5 Flash)
- `BRAVE_SEARCH_API_KEY` — (optional) Brave Search API key; falls back to DuckDuckGo → mock

Frontend api-client uses relative `/api/...` paths (no `VITE_API_BASE_URL` needed) — same-origin automatically.

### Replit Dev Architecture

In **development**, the api-server acts as a **reverse proxy**:
- `/api/*` → handled directly by Express (port 8080)
- All other requests → proxied to Vite dev server (port 22442) via Node `http` module
- Vite also has `proxy: { '/api': 'http://localhost:8080' }` as belt-and-suspenders

## Design System

- Background: `220 14% 5.5%` (near-black)
- **Primary (neon baby pink)**: `hsl(322 84% 65%)` — brand, buttons, CTAs, search focus ring
- **Security green** (SAFE indicators, BLACKDOG status, signal tiers): `hsl(142 72% 38%)` — NOT changed to pink
- **Sage / AI purple**: `rgba(139,92,246,...)` — AI/answer engine accent
- Glow tokens: pink `rgba(224,64,151,...)`, safe-green `rgba(22,163,74,...)`, sage-purple `rgba(139,92,246,...)`
- Body gradient: pink top-center + purple bottom-right
- Fonts: JetBrains Mono + Inter
- CSS utilities: `.glass-panel`, `.glass-surface`, `.section-label`, `.risk-safe/caution/danger/unknown`
- Compact interface: `html.compact` class applied via `applyCompactInterface()`

## Key Files

```
artifacts/vero-browser/src/
  hooks/use-browser-state.tsx   — Full browser state (tabs, nav, history, bookmarks, downloads, settings)
  lib/blackdog.ts               — URL analysis, risk classification, PageType enum
  lib/settings.ts               — Settings persistence (sentrix-settings-v1 localStorage)
  lib/search.ts                 — Search API client (calls /api/search, enriches results)
  components/
    AddressBar.tsx              — Nav buttons, URL input, bookmark button, BLACKDOG toggle
    BrowserContent.tsx          — Routes pageType → view component
    TacticalSidebar.tsx         — Icon nav (Home/Search/History/Downloads/Bookmarks/Privacy/Vault/Settings)
    BlackdogPanel.tsx           — Collapsible security panel
    VeroTabBar.tsx              — Tab bar (displays "SENTRIX" brand)
    LinkCheckModal.tsx          — Pre-flight URL risk analysis modal
  views/
    HomeView.tsx                — New tab with search, Quick Tools (functional), recent history
    SearchResultsView.tsx       — Real search API integration, risk-filtered cards, investigation mode banner
    WebsiteView.tsx             — Preview + Live iframe attempt with graceful embed-blocked fallback
    HistoryView.tsx             — Full history list with search/filter
    BookmarksView.tsx           — Bookmark CRUD (navigate + delete)
    DownloadsView.tsx           — Real download tracking (auto-populated from file-type URLs)
    PrivacyReportView.tsx       — Honest session policies, real stats from history, burn session
    SettingsView.tsx            — Real settings (Session/Appearance/About) with persistent toggles
    VaultView.tsx               — Secure vault placeholder
    InvestigationView.tsx       — Full investigation workspace (posture/source breakdown, notes, export)
artifacts/api-server/src/routes/
  search.ts                    — GET /api/search — Brave Search API proxy + mock fallback
```

## Protocols

- `sentrix://newtab` `search` `history` `downloads` `privacy` `vault` `settings` `bookmarks` `collections` `investigations`
- Legacy `sentra://` and `vero://` auto-upgrade via `classifyInput()`
- BLACKDOG engine URL is NEVER exposed (private endpoint, heuristic classification only)

## Storage

- Session: `sentrix-session-v5` localStorage key
- Investigations: `sentrix-investigations-v1` localStorage key (separate, persists independently)
- Settings: `sentrix-settings-v1` localStorage key
- Downloads: auto-tracked from file-type URL navigation (`.pdf`, `.zip`, `.dmg`, `.exe`, etc.)
- Bookmarks: persisted in session, CRUD via `addBookmark/removeBookmark/isBookmarked`
- Burn Session: clears both session and investigations localStorage keys

## Settings (all real, persisted)

- `sessionRestore` — re-open tabs/history on launch
- `clearDataOnExit` — wipes session on `beforeunload`
- `compactInterface` — adds `html.compact` class
- `developerMode` — shows DEV indicator in status bar
- `blackdogPanelOpenByDefault` — controls panel open state on init

## BLACKDOG

- Status: `connecting → connected` (900ms simulated transition)
- Engine: `BLACKDOG v4.1.2` — private endpoint never exposed
- `blackdogStatus`: `'connecting' | 'connected' | 'unavailable'`

## Search API

- `GET /api/search?q=...`
- Uses `BRAVE_SEARCH_API_KEY` env var if set; smart mock fallback otherwise
- Results enriched client-side with heuristic domain risk classification

## Feature Checklist ✓

- [x] 10 distinct page views (newtab, search, website, history, downloads, privacy, vault, settings, bookmarks, collections, investigations)
- [x] Per-tab back/forward navigation with full stack
- [x] Session persistence (localStorage, version 5)
- [x] Bookmarks (add/remove from address bar, view in BookmarksView)
- [x] Downloads auto-tracking from file-type URLs
- [x] Settings persistence with real applied effects
- [x] Privacy report with real session stats
- [x] Link Check modal (pre-flight URL analysis)
- [x] Real search API integration with mock fallback
- [x] Website view: Preview mode + Live iframe attempt with blocked-domain fallback
- [x] Burn session (full data wipe + tab reset, clears investigations)
- [x] BLACKDOG panel with status transitions
- [x] Risk classification (safe/caution/danger/unknown) on every URL
- [x] High-risk domain block screen with override option
- [x] Collections system (saved items, 4 default collections, CRUD)
- [x] Intelligence ranking engine (score, confidence, whyReason, domain diversity)
- [x] Investigation Mode (toggle in address bar, auto-attach saves, investigation panel, export text/JSON)
- [x] Investigation persistence (sentrix-investigations-v1 localStorage, survives page reload)
