import React, { useState } from 'react';
import { LockKeyhole, Key, CreditCard, Globe, User, Plus, Eye, EyeOff } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const MOCK_ITEMS = [
  { id: '1', type: 'login',    label: 'sentrix.live',          username: 'user@sentrix.io',  icon: Globe },
  { id: '2', type: 'login',    label: 'github.com',            username: 'dev@example.com',  icon: Globe },
  { id: '3', type: 'identity', label: 'Primary Identity',      username: 'J. Smith',         icon: User },
  { id: '4', type: 'card',     label: 'Secure Card •••• 4821', username: 'Visa',             icon: CreditCard },
];

export function VaultView() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      setUnlocked(true);
      setPin('');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/20">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">sentrix://vault</div>
          <h2 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
            <LockKeyhole className="w-4 h-4 text-primary/70" />
            Secure Vault
          </h2>
        </div>
        {unlocked && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPasswords(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/[0.05] bg-black/20 text-muted-foreground/50 hover:text-muted-foreground/80 transition-all text-[11px] font-mono"
            >
              {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPasswords ? 'Hide' : 'Reveal'}
            </button>
            <button
              onClick={() => setUnlocked(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-red-500/15 bg-red-500/5 text-red-400/70 hover:bg-red-500/10 transition-all text-[11px] font-mono"
            >
              <LockKeyhole className="w-3 h-3" /> Lock
            </button>
          </div>
        )}
      </div>

      {!unlocked ? (
        <div className="flex flex-col items-center justify-center h-[calc(100%-65px)] pb-12">
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: 'rgba(22,163,74,0.07)',
                border: '1px solid rgba(22,163,74,0.18)',
                boxShadow: '0 0 24px rgba(22,163,74,0.08)',
              }}
            >
              <LockKeyhole className="w-7 h-7 text-primary/70" />
            </div>
            <h3 className="text-sm font-semibold text-foreground/70 mb-1">Vault Locked</h3>
            <p className="text-[11px] font-mono text-muted-foreground/40">Enter your PIN to access stored credentials</p>
          </div>

          <form onSubmit={handleUnlock} className="flex flex-col items-center gap-4 w-full max-w-xs">
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={twMerge(
                  'w-3 h-3 rounded-full border transition-all',
                  i < pin.length
                    ? 'bg-primary border-primary shadow-[0_0_6px_rgba(22,163,74,0.6)]'
                    : 'border-white/[0.1] bg-transparent'
                )} />
              ))}
            </div>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value.slice(0, 6))}
              placeholder="Enter PIN"
              maxLength={6}
              className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-lg px-4 text-center text-[14px] font-mono text-foreground/80 placeholder:text-muted-foreground/30 outline-none focus:border-primary/40 transition-colors tracking-[0.3em]"
              autoFocus
            />
            <button
              type="submit"
              disabled={pin.length < 4}
              className="w-full h-9 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-[12px] font-bold tracking-widest uppercase transition-all"
            >
              Authenticate
            </button>
            <p className="text-[10px] font-mono text-muted-foreground/30">Any 4+ digit PIN will unlock</p>
          </form>
        </div>
      ) : (
        <div className="px-6 py-5 max-w-lg space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
              Stored Items — {MOCK_ITEMS.length}
            </div>
            <button className="flex items-center gap-1 text-[10px] font-mono text-primary/60 hover:text-primary transition-colors">
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {MOCK_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-center gap-3 p-3.5 rounded-lg border border-white/[0.05] bg-black/20 hover:bg-black/30 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-foreground/80">{item.label}</div>
                    <div className="text-[11px] font-mono text-muted-foreground/40">{item.username}</div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded border border-white/[0.05] text-[10px] font-mono text-muted-foreground/50 hover:text-foreground/70 hover:bg-white/[0.04]">
                    Fill
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded border border-white/[0.04] bg-black/20 text-[10px] font-mono text-muted-foreground/40 leading-relaxed">
            <Key className="w-3 h-3 inline mr-1.5 text-primary/40" />
            All credentials are encrypted with AES-256. BLACKDOG monitors all autofill events.
          </div>
        </div>
      )}
    </div>
  );
}
