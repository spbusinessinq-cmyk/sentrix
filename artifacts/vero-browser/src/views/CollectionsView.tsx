import React, { useState } from 'react';
import {
  FolderOpen, Plus, Trash2, Globe, ExternalLink,
  ChevronRight, X, Check, Layers
} from 'lucide-react';
import { useBrowserState, Collection, SavedItem } from '@/hooks/use-browser-state';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

function PostureDot({ posture }: { posture: string }) {
  const cls =
    posture === 'SAFE'    ? 'bg-primary/60' :
    posture === 'CAUTION' ? 'bg-amber-500/60' :
    posture === 'DANGER'  ? 'bg-red-500/60' :
    'bg-muted-foreground/30';
  return <span className={twMerge('w-1.5 h-1.5 rounded-full shrink-0', cls)} />;
}

function CollectionCard({
  collection, items, isActive, onClick,
}: {
  collection: Collection; items: SavedItem[]; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        'relative w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border text-left transition-all',
        isActive ? 'border-primary/15 bg-primary/[0.06]' : 'border-white/[0.05] bg-black/20 hover:bg-white/[0.02] hover:border-white/[0.08]'
      )}
    >
      {isActive && <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full" style={{ background: collection.color }} />}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${collection.color}15`, border: `1px solid ${collection.color}25` }}
      >
        <FolderOpen className="w-4 h-4" style={{ color: collection.color, opacity: 0.8 }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-foreground/75 truncate">{collection.name}</div>
        <div className="text-[10px] font-mono text-muted-foreground/35 truncate">{collection.description}</div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <div className="text-[13px] font-mono font-bold" style={{ color: collection.color, opacity: 0.7 }}>
          {items.length}
        </div>
        <div className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-wider">items</div>
      </div>
      <ChevronRight className={twMerge('w-3.5 h-3.5 text-muted-foreground/25 shrink-0 transition-transform', isActive && 'text-primary/40')} />
    </button>
  );
}

export function CollectionsView() {
  const { collections, savedItems, createCollection, deleteCollection, unsaveItem, navigate } = useBrowserState();
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const activeCollection = collections.find(c => c.id === activeCollectionId);
  const collectionItems = activeCollectionId
    ? savedItems.filter(s => s.collectionId === activeCollectionId)
    : [];
  const unsortedItems = savedItems.filter(s => !s.collectionId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const col = createCollection(newName.trim(), newDesc.trim());
    setCreating(false);
    setNewName(''); setNewDesc('');
    setActiveCollectionId(col.id);
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/20 shrink-0">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">sentrix://collections</div>
          <h2 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground/50" />
            Collections
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono text-muted-foreground/30">
            {savedItems.length} saved · {collections.length} collections
          </div>
          <button
            onClick={() => setCreating(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/[0.08] text-primary/70 text-[11px] font-mono hover:bg-primary/[0.12] transition-colors"
          >
            <Plus className="w-3 h-3" /> New
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100%-61px)]">
        {/* Sidebar — collection list */}
        <div className="w-72 shrink-0 border-r border-white/[0.05] overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {/* Create new collection inline */}
          <AnimatePresence>
            {creating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-1"
              >
                <div className="p-3.5 rounded-xl border border-primary/15 bg-primary/[0.05] flex flex-col gap-2">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-primary/50 mb-1">New Collection</div>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                    placeholder="Collection name"
                    className="w-full bg-transparent text-[12px] font-mono text-foreground/80 outline-none border-b border-white/[0.06] pb-1 placeholder:text-muted-foreground/25"
                  />
                  <input
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full bg-transparent text-[11px] font-mono text-muted-foreground/50 outline-none placeholder:text-muted-foreground/20"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={handleCreate} className="flex items-center gap-1.5 px-3 py-1 rounded border border-primary/20 bg-primary/[0.1] text-primary/80 text-[10px] font-mono">
                      <Check className="w-3 h-3" /> Create
                    </button>
                    <button onClick={() => setCreating(false)} className="text-muted-foreground/40 hover:text-muted-foreground/70 text-[10px] font-mono transition-colors">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* All saved */}
          <button
            onClick={() => { setActiveCollectionId(null); setShowAll(true); }}
            className={twMerge(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
              showAll && !activeCollectionId
                ? 'border-primary/15 bg-primary/[0.06] text-foreground/80'
                : 'border-white/[0.05] bg-black/15 text-muted-foreground/50 hover:text-muted-foreground/75 hover:bg-white/[0.02]'
            )}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[12px] font-medium flex-1">All Saved</span>
            <span className="text-[11px] font-mono text-muted-foreground/40">{savedItems.length}</span>
          </button>

          {unsortedItems.length > 0 && (
            <button
              onClick={() => { setActiveCollectionId(null); setShowAll(false); }}
              className={twMerge(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                !activeCollectionId && !showAll
                  ? 'border-amber-500/15 bg-amber-500/[0.05] text-amber-400/70'
                  : 'border-white/[0.05] bg-black/15 text-muted-foreground/50 hover:text-muted-foreground/75 hover:bg-white/[0.02]'
              )}
            >
              <Globe className="w-3.5 h-3.5 shrink-0 text-amber-500/50" />
              <span className="text-[12px] font-medium flex-1">Unsorted</span>
              <span className="text-[11px] font-mono text-muted-foreground/40">{unsortedItems.length}</span>
            </button>
          )}

          <div className="w-full h-px bg-white/[0.05] my-1" />

          {collections.map(col => {
            const items = savedItems.filter(s => s.collectionId === col.id);
            return (
              <CollectionCard
                key={col.id}
                collection={col}
                items={items}
                isActive={activeCollectionId === col.id}
                onClick={() => { setActiveCollectionId(col.id); setShowAll(false); }}
              />
            );
          })}
        </div>

        {/* Content pane */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Collection header */}
          {activeCollection && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full" style={{ background: activeCollection.color }} />
                <div>
                  <div className="text-[13px] font-semibold text-foreground/75">{activeCollection.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground/40">{activeCollection.description}</div>
                </div>
              </div>
              <button
                onClick={() => { deleteCollection(activeCollection.id); setActiveCollectionId(null); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-red-500/10 bg-red-500/[0.04] text-red-500/50 text-[10px] font-mono hover:text-red-500/80 hover:bg-red-500/[0.08] transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}

          {/* Items list */}
          {(() => {
            let items: SavedItem[];
            if (activeCollectionId) {
              items = collectionItems;
            } else if (showAll) {
              items = savedItems;
            } else {
              items = unsortedItems;
            }

            if (items.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <FolderOpen className="w-8 h-8 text-muted-foreground/20" />
                  <div className="text-[12px] font-mono text-muted-foreground/35 text-center">
                    {activeCollectionId ? 'No items in this collection yet' : 'No saved items yet'}<br/>
                    <span className="text-[10px] text-muted-foreground/25">Save items from search results or inspect view</span>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-1.5">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/[0.04] hover:border-white/[0.07] hover:bg-white/[0.02] transition-all"
                  >
                    <PostureDot posture={item.posture} />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(item.url)}
                        className="text-[12px] font-medium text-foreground/70 hover:text-foreground/90 transition-colors text-left truncate w-full block"
                      >
                        {item.title}
                      </button>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground/35 truncate">{item.domain}</span>
                        <span className="text-[9px] font-mono text-muted-foreground/25 uppercase tracking-wider shrink-0">{item.sourceType}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/25 shrink-0">{format(item.savedAt, 'MMM d')}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-primary/70 transition-all shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => unsaveItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-red-500/60 transition-all shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
