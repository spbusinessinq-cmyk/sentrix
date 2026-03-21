import React, { useState } from 'react';
import { LockKeyhole, Sparkles, Globe, Trash2, Eye, EyeOff, Plus, ShieldCheck } from 'lucide-react';
import { useBrowserState, VaultItem } from '@/hooks/use-browser-state';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';

// ─── Locked screen ─────────────────────────────────────────────────────────────

function LockedScreen({ hasPasscode, onUnlock, onCreate }: {
  hasPasscode: boolean;
  onUnlock: (pin: string) => Promise<boolean>;
  onCreate: (pin: string) => Promise<void>;
}) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState<'enter' | 'create' | 'confirm'>(hasPasscode ? 'enter' : 'create');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (step === 'enter') {
      if (pin.length < 4) return;
      setLoading(true);
      const ok = await onUnlock(pin);
      setLoading(false);
      if (!ok) { setError('Incorrect passcode. Try again.'); setPin(''); }
    } else if (step === 'create') {
      if (pin.length < 4) { setError('Passcode must be at least 4 characters.'); return; }
      setStep('confirm');
    } else if (step === 'confirm') {
      if (pin !== confirm) { setError('Passcodes do not match. Try again.'); setConfirm(''); return; }
      setLoading(true);
      await onCreate(pin);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full pb-16">
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{
          background: 'rgba(56,189,248,0.06)',
          border: '1px solid rgba(56,189,248,0.18)',
          boxShadow: '0 0 28px rgba(56,189,248,0.07)',
        }}
      >
        <LockKeyhole className="w-7 h-7" style={{ color: 'rgba(56,189,248,0.70)' }} />
      </div>

      <h3 className="text-[13px] font-semibold mb-1" style={{ color: 'rgba(220,225,235,0.80)' }}>
        {step === 'enter' ? 'Vault Locked' : step === 'create' ? 'Create Vault Passcode' : 'Confirm Passcode'}
      </h3>
      <p className="text-[10.5px] font-mono mb-6 text-center max-w-[220px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.40)' }}>
        {step === 'enter'
          ? 'Enter your passcode to access secured data.'
          : step === 'create'
          ? 'Choose a passcode to protect sensitive analyses and sources.'
          : 'Re-enter your passcode to confirm.'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 w-full max-w-[240px]">
        <input
          type="password"
          value={step === 'confirm' ? confirm : pin}
          onChange={e => step === 'confirm' ? setConfirm(e.target.value) : setPin(e.target.value.slice(0, 20))}
          placeholder={step === 'confirm' ? 'Confirm passcode' : 'Enter passcode'}
          className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-lg px-4 text-center text-[14px] font-mono text-foreground/80 placeholder:text-muted-foreground/30 outline-none focus:border-primary/40 transition-colors tracking-[0.2em]"
          autoFocus
        />

        {error && (
          <p className="text-[10px] font-mono text-red-400/70">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || (step === 'confirm' ? confirm.length < 4 : pin.length < 4)}
          className="w-full h-9 rounded-lg text-[11px] font-bold tracking-widest uppercase transition-all"
          style={{
            background: 'rgba(56,189,248,0.10)',
            border: '1px solid rgba(56,189,248,0.22)',
            color: 'rgba(56,189,248,0.80)',
            opacity: (loading || (step === 'confirm' ? confirm.length < 4 : pin.length < 4)) ? 0.35 : 1,
          }}
        >
          {loading ? '…' : step === 'enter' ? 'Authenticate' : step === 'create' ? 'Continue' : 'Create Passcode'}
        </button>

        {step !== 'enter' && (
          <p className="text-[9.5px] font-mono text-center leading-relaxed" style={{ color: 'rgba(148,163,184,0.28)' }}>
            Passcode is hashed locally — not stored in plain text.
          </p>
        )}
      </form>
    </div>
  );
}

// ─── Vault item row ─────────────────────────────────────────────────────────────

function VaultItemRow({ item, unlocked, onRemove }: {
  item: VaultItem; unlocked: boolean; onRemove: () => void;
}) {
  const isAnalysis = item.type === 'analysis';

  if (!unlocked) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
        style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.18)' }}
      >
        <LockKeyhole className="w-3 h-3 shrink-0" style={{ color: 'rgba(148,163,184,0.20)' }} />
        <div
          className="flex-1 h-3 rounded"
          style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(3px)' }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg group"
      style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.18)' }}
    >
      {isAnalysis
        ? <Sparkles className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'rgba(139,92,246,0.55)' }} />
        : <Globe className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'rgba(56,189,248,0.45)' }} />
      }
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-mono truncate" style={{ color: 'rgba(210,210,230,0.80)' }}>{item.title}</p>
        {item.summary && (
          <p className="text-[9.5px] font-mono truncate mt-0.5 leading-relaxed" style={{ color: 'rgba(148,163,184,0.40)' }}>
            {item.summary}
          </p>
        )}
        <p className="text-[8.5px] font-mono mt-1" style={{ color: 'rgba(148,163,184,0.25)' }}>
          Secured {format(item.movedAt, 'MMM d · HH:mm')}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
        title="Remove from vault"
        style={{ color: 'rgba(239,68,68,0.45)' }}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-[8.5px] font-mono uppercase tracking-[0.18em] font-semibold" style={{ color: 'rgba(148,163,184,0.35)' }}>
        {label}
      </p>
      <p className="text-[8.5px] font-mono" style={{ color: 'rgba(148,163,184,0.22)' }}>{count} item{count !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────────

export function VaultView() {
  const {
    vaultItems, vaultUnlocked, hasVaultPasscode,
    setVaultUnlocked, createVaultPasscode, verifyVaultPasscode, removeFromVault,
  } = useBrowserState();

  const analyses = vaultItems.filter(v => v.type === 'analysis');
  const sources  = vaultItems.filter(v => v.type === 'source');

  const isLocked = !vaultUnlocked;

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'rgba(5,5,9,0.98)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.25)' }}
      >
        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: 'rgba(148,163,184,0.35)' }}>
            sentrix://vault
          </div>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'rgba(210,215,230,0.85)' }}>
            <LockKeyhole className="w-4 h-4" style={{ color: 'rgba(56,189,248,0.65)' }} />
            Secure Vault
          </h2>
        </div>
        {vaultUnlocked && (
          <button
            onClick={() => setVaultUnlocked(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10.5px] font-mono transition-all"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.18)',
              color: 'rgba(239,68,68,0.65)',
            }}
          >
            <LockKeyhole className="w-3 h-3" /> Lock Vault
          </button>
        )}
      </div>

      {/* Locked / unlocked content */}
      {isLocked ? (
        <LockedScreen
          hasPasscode={hasVaultPasscode}
          onUnlock={verifyVaultPasscode}
          onCreate={createVaultPasscode}
        />
      ) : (
        <div className="px-6 py-5 max-w-xl space-y-6">
          {/* Status bar */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-mono"
            style={{
              background: 'rgba(22,163,74,0.06)',
              border: '1px solid rgba(22,163,74,0.18)',
              color: 'hsl(142 72% 46%)',
            }}
          >
            <ShieldCheck className="w-3 h-3 shrink-0" />
            Vault unlocked — {vaultItems.length} secured item{vaultItems.length !== 1 ? 's' : ''}
          </div>

          {vaultItems.length === 0 && (
            <div
              className="px-4 py-6 rounded-lg text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <LockKeyhole className="w-6 h-6 mx-auto mb-3" style={{ color: 'rgba(148,163,184,0.20)' }} />
              <p className="text-[11px] font-mono" style={{ color: 'rgba(148,163,184,0.40)' }}>No secured items yet</p>
              <p className="text-[9.5px] font-mono mt-1.5 leading-relaxed" style={{ color: 'rgba(148,163,184,0.25)' }}>
                Use "Move to Vault" on analyses or sources to secure them here.
              </p>
            </div>
          )}

          {/* Secured Analyses */}
          {analyses.length > 0 && (
            <div>
              <SectionLabel label="Secured Analyses" count={analyses.length} />
              <div className="flex flex-col gap-2">
                {analyses.map(item => (
                  <VaultItemRow key={item.id} item={item} unlocked={vaultUnlocked} onRemove={() => removeFromVault(item.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Secured Sources */}
          {sources.length > 0 && (
            <div>
              <SectionLabel label="Secured Sources" count={sources.length} />
              <div className="flex flex-col gap-2">
                {sources.map(item => (
                  <VaultItemRow key={item.id} item={item} unlocked={vaultUnlocked} onRemove={() => removeFromVault(item.id)} />
                ))}
              </div>
            </div>
          )}

          <p className="text-[9px] font-mono leading-relaxed" style={{ color: 'rgba(148,163,184,0.22)' }}>
            Passcode is SHA-256 hashed and stored locally. Items are stored in this browser only.
          </p>
        </div>
      )}
    </div>
  );
}
