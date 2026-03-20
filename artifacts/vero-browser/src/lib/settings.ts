const SETTINGS_KEY = 'sentrix-settings-v1';

export interface SentrixSettings {
  clearDataOnExit: boolean;
  sessionRestore: boolean;
  compactInterface: boolean;
  developerMode: boolean;
  blackdogPanelOpenByDefault: boolean;
}

export const DEFAULT_SETTINGS: SentrixSettings = {
  clearDataOnExit: false,
  sessionRestore: true,
  compactInterface: false,
  developerMode: false,
  blackdogPanelOpenByDefault: true,
};

export function loadSettings(): SentrixSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: SentrixSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function applyCompactInterface(enabled: boolean): void {
  if (enabled) {
    document.documentElement.classList.add('compact');
  } else {
    document.documentElement.classList.remove('compact');
  }
}
