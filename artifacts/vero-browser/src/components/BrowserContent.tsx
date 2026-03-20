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
import { BookmarksView } from '@/views/BookmarksView';
import { CollectionsView } from '@/views/CollectionsView';
import { InvestigationView } from '@/views/InvestigationView';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_MAP: Record<string, React.FC> = {
  newtab:         HomeView,
  search:         SearchResultsView,
  website:        WebsiteView,
  history:        HistoryView,
  downloads:      DownloadsView,
  privacy:        PrivacyReportView,
  vault:          VaultView,
  settings:       SettingsView,
  bookmarks:      BookmarksView,
  collections:    CollectionsView,
  investigations: InvestigationView,
};

export function BrowserContent() {
  const { pageType, activeTabId } = useBrowserState();
  const View = PAGE_MAP[pageType] ?? HomeView;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${activeTabId}-${pageType}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="h-full w-full overflow-hidden"
      >
        <View />
      </motion.div>
    </AnimatePresence>
  );
}
