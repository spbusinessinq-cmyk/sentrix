import React, { useState } from 'react';
import {
  X, ExternalLink, Bookmark, BookmarkCheck, FolderPlus,
  Shield, Globe, Lock, Copy, Check, ChevronDown, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { enrichUrl, postureColor, sourceTypeIcon } from '@/lib/enrichment';
import { useBrowserState } from '@/hooks/use-browser-state';

interface InspectDrawerProps {
  url: string;
  title?: string;
  snippet?: string;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

function PostureBadge({ posture }: { posture: string }) {
  const colors = postureColor(posture as any);
  return (
    <span className={twMerge('inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold tracking-[0.15em] uppercase', colors.text, colors.border, colors.bg)}>
      {posture}
    </span>
  );
}

export function InspectDrawer({ url, title, snippet, onClose, onNavigate }: InspectDrawerProps) {
  const { saveItem, isSaved, unsaveItem, savedItems, collections, addToCollection, createCollection, addBookmark, isBookmarked, bookmarks, removeBookmark } = useBrowserState();
  const [copied, setCopied] = useState(false);
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const [newCollectionMode, setNewCollectionMode] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const enriched = enrichUrl(url, title, snippet);
  const typeIcon = sourceTypeIcon(enriched.sourceType);
  const colors = postureColor(enriched.posture);

  const saved = isSaved(url);
  const savedItemObj = savedItems.find(s => s.url === url);
  const bookmarked = isBookmarked(url);
  const bookmarkObj = bookmarks.find(b => b.url === url);

  const copyUrl = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = () => {
    if (saved && savedItemObj) {
      unsaveItem(savedItemObj.id);
    } else {
      saveItem({
        title: title ?? enriched.rootDomain,
        url,
        domain: enriched.rootDomain,
        posture: enriched.posture,
        sourceType: enriched.sourceType,
        reasoning: enriched.reasoning,
      });
    }
  };

  const handleBookmark = () => {
    if (bookmarked && bookmarkObj) removeBookmark(bookmarkObj.id);
    else addBookmark({ title: title ?? enriched.rootDomain, url, domain: enriched.rootDomain });
  };

  const handleAddToCollection = (colId: string) => {
    if (!savedItemObj && !saved) {
      saveItem({
        title: title ?? enriched.rootDomain,
        url, domain: enriched.rootDomain,
        posture: enriched.posture, sourceType: enriched.sourceType, reasoning: enriched.reasoning,
      });
    }
    // Use a small timeout to let the save propagate
    setTimeout(() => {
      const si = savedItems.find(s => s.url === url);
      if (si) addToCollection(si.id, colId);
    }, 50);
    setCollectionMenuOpen(false);
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    const col = createCollection(newCollectionName.trim());
    handleAddToCollection(col.id);
    setNewCollectionName('');
    setNewCollectionMode(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-3"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="w-[380px] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl flex flex-col"
        style={{
          background: 'rgba(8,9,12,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8), -4px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-[11px] font-mono font-semibold text-foreground/70 uppercase tracking-widest">
              Inspect
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-5">
          {/* Title */}
          {title && (
            <div>
              <div className="text-[13px] font-semibold text-foreground/80 leading-snug mb-1">{title}</div>
              {snippet && <div className="text-[11px] font-mono text-muted-foreground/40 leading-relaxed line-clamp-3">{snippet}</div>}
            </div>
          )}

          {/* Posture + source type */}
          <div className="flex items-center gap-2 flex-wrap">
            <PostureBadge posture={enriched.posture} />
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-white/[0.07] bg-white/[0.03] text-[9px] font-mono text-muted-foreground/55 uppercase tracking-wider">
              <span>{typeIcon}</span>
              {enriched.sourceType}
            </span>
            {!enriched.isHttps && (
              <span className="px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/[0.06] text-[9px] font-mono text-amber-500/70 uppercase tracking-wider">
                HTTP
              </span>
            )}
          </div>

          {/* URL breakdown */}
          <div className="p-3.5 rounded-xl border border-white/[0.05] bg-black/25 space-y-2.5">
            <Row label="Domain" value={enriched.rootDomain} mono accent />
            <Row label="Protocol" value={enriched.protocol.toUpperCase()} mono />
            <Row label="Source type" value={enriched.sourceType} />
            <div className="pt-1 border-t border-white/[0.04]">
              <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/30 mb-1">URL</div>
              <div className="text-[10px] font-mono text-muted-foreground/45 break-all leading-relaxed">{url}</div>
            </div>
          </div>

          {/* Reasoning */}
          <div className="p-3.5 rounded-xl border border-white/[0.05] bg-black/20">
            <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/30 mb-2">Analysis</div>
            <div className={twMerge('text-[12px] font-medium mb-2', colors.text)}>
              {enriched.reasoning}
            </div>
            {enriched.notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/25 mt-1.5 shrink-0" />
                <span className="text-[10px] font-mono text-muted-foreground/45 leading-relaxed">{note}</span>
              </div>
            ))}
            <div className="text-[9px] font-mono text-muted-foreground/22 mt-3 pt-2 border-t border-white/[0.04]">
              Heuristic classification — URL patterns and domain signals only.
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-primary/[0.08] text-primary/80 text-[12px] font-mono hover:bg-primary/[0.12] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open externally
            </a>

            <div className="grid grid-cols-3 gap-1.5">
              <ActionBtn
                icon={saved ? <Check className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                label={saved ? 'Saved' : 'Save'}
                active={saved}
                onClick={handleSave}
              />
              <ActionBtn
                icon={bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                label={bookmarked ? 'Bookmarked' : 'Bookmark'}
                active={bookmarked}
                onClick={handleBookmark}
              />
              <div className="relative">
                <ActionBtn
                  icon={<FolderPlus className="w-3.5 h-3.5" />}
                  label="Collection"
                  onClick={() => setCollectionMenuOpen(v => !v)}
                />
                <AnimatePresence>
                  {collectionMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full mb-1.5 right-0 w-44 rounded-xl overflow-hidden shadow-2xl z-20"
                      style={{ background: 'rgba(10,11,15,0.98)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      {collections.map(col => (
                        <button
                          key={col.id}
                          onClick={() => handleAddToCollection(col.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors text-left"
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
                          <span className="text-[11px] font-mono text-foreground/65 flex-1 truncate">{col.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground/30">{col.itemCount}</span>
                        </button>
                      ))}
                      <div className="border-t border-white/[0.06]">
                        {newCollectionMode ? (
                          <div className="px-3 py-2 flex items-center gap-2">
                            <input
                              autoFocus
                              value={newCollectionName}
                              onChange={e => setNewCollectionName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleCreateCollection(); if (e.key === 'Escape') setNewCollectionMode(false); }}
                              placeholder="Collection name"
                              className="flex-1 bg-transparent text-[11px] font-mono text-foreground/70 outline-none placeholder:text-muted-foreground/25"
                            />
                            <button onClick={handleCreateCollection} className="text-primary/70 hover:text-primary transition-colors">
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setNewCollectionMode(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors text-left"
                          >
                            <Plus className="w-3 h-3 text-muted-foreground/40" />
                            <span className="text-[11px] font-mono text-muted-foreground/40">New collection…</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button onClick={copyUrl} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] text-muted-foreground/50 text-[11px] font-mono hover:text-muted-foreground/75 hover:bg-white/[0.03] transition-all">
              {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy URL'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value, mono = false, accent = false }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-mono text-muted-foreground/35 shrink-0">{label}</span>
      <span className={twMerge(
        'text-right truncate',
        mono ? 'font-mono text-[11px]' : 'text-[12px]',
        accent ? 'text-foreground/70' : 'text-muted-foreground/55'
      )}>
        {value}
      </span>
    </div>
  );
}

function ActionBtn({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        'flex flex-col items-center gap-1 px-2 py-2 rounded-xl border text-[10px] font-mono transition-all',
        active
          ? 'border-primary/20 bg-primary/[0.08] text-primary/80'
          : 'border-white/[0.06] bg-white/[0.02] text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-white/[0.04]'
      )}
    >
      {icon}
      <span className="text-[9px] uppercase tracking-wide">{label}</span>
    </button>
  );
}
