# Sentrix Browser

A polished dark tactical browser UI prototype with BLACKDOG as the embedded private security engine.

## Architecture

**Monorepo** (`pnpm workspaces`):
- `artifacts/vero-browser/` — React + Vite frontend (port via `$PORT`)
- `artifacts/api-server/` — Express API server (port 8080)
- `artifacts/mockup-sandbox/` — Component preview server

## Design System

- Background: `220 14% 5.5%` (near-black)
- Primary (green): `hsl(142 72% 34%)` with glow tokens
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
    SearchResultsView.tsx       — Real search API integration, risk-filtered cards
    WebsiteView.tsx             — Preview + Live iframe attempt with graceful embed-blocked fallback
    HistoryView.tsx             — Full history list with search/filter
    BookmarksView.tsx           — Bookmark CRUD (navigate + delete)
    DownloadsView.tsx           — Real download tracking (auto-populated from file-type URLs)
    PrivacyReportView.tsx       — Honest session policies, real stats from history, burn session
    SettingsView.tsx            — Real settings (Session/Appearance/About) with persistent toggles
    VaultView.tsx               — Secure vault placeholder
artifacts/api-server/src/routes/
  search.ts                    — GET /api/search — Brave Search API proxy + mock fallback
```

## Protocols

- `sentrix://newtab` `search` `history` `downloads` `privacy` `vault` `settings` `bookmarks`
- Legacy `sentra://` and `vero://` auto-upgrade via `classifyInput()`
- BLACKDOG engine URL is NEVER exposed (private endpoint, heuristic classification only)

## Storage

- Session: `sentrix-session-v4` localStorage key
- Settings: `sentrix-settings-v1` localStorage key
- Downloads: auto-tracked from file-type URL navigation (`.pdf`, `.zip`, `.dmg`, `.exe`, etc.)
- Bookmarks: persisted in session, CRUD via `addBookmark/removeBookmark/isBookmarked`

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

- [x] 8+ distinct page views (newtab, search, website, history, downloads, privacy, vault, settings, bookmarks)
- [x] Per-tab back/forward navigation with full stack
- [x] Session persistence (localStorage, version 4)
- [x] Bookmarks (add/remove from address bar, view in BookmarksView)
- [x] Downloads auto-tracking from file-type URLs
- [x] Settings persistence with real applied effects
- [x] Privacy report with real session stats
- [x] Link Check modal (pre-flight URL analysis)
- [x] Real search API integration with mock fallback
- [x] Website view: Preview mode + Live iframe attempt with blocked-domain fallback
- [x] Burn session (full data wipe + tab reset)
- [x] BLACKDOG panel with status transitions
- [x] Risk classification (safe/caution/danger/unknown) on every URL
- [x] High-risk domain block screen with override option
