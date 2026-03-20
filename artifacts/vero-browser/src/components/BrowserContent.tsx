import React from 'react';
import { useBrowserState } from '@/hooks/use-browser-state';
import { HomeView } from '@/views/HomeView';
import { SearchResultsView } from '@/views/SearchResultsView';
import { WebsiteView } from '@/views/WebsiteView';
import { HistoryView } from '@/views/HistoryView';
import { DownloadsView } from '@/views/DownloadsView';
import { PrivacyReportView } from '@/views/PrivacyReportView';
import { VaultView } from '@/views/VaultView';
import { SettingsView } from '@/views/SettingsView';

export function BrowserContent() {
  const { pageType } = useBrowserState();

  switch (pageType) {
    case 'newtab':    return <HomeView />;
    case 'search':    return <SearchResultsView />;
    case 'website':   return <WebsiteView />;
    case 'history':   return <HistoryView />;
    case 'downloads': return <DownloadsView />;
    case 'privacy':   return <PrivacyReportView />;
    case 'vault':     return <VaultView />;
    case 'settings':  return <SettingsView />;
    default:          return <HomeView />;
  }
}
