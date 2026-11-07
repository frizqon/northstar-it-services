export type ThemeSetting = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'northstar-theme';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredThemeSetting(): ThemeSetting {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'auto';
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
  } catch {
    // Local storage access error (e.g. iframe or disabled cookies)
  }
  return 'auto';
}

export function resolveTheme(setting: ThemeSetting): ResolvedTheme {
  if (setting === 'auto') {
    return getSystemTheme();
  }
  return setting;
}

export function applyTheme(setting: ThemeSetting): ResolvedTheme {
  const resolved = resolveTheme(setting);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-setting', setting);
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, setting);
    } catch {
      // Ignore storage write errors
    }
    window.dispatchEvent(
      new CustomEvent('northstar-theme-change', {
        detail: { setting, resolved }
      })
    );
  }
  return resolved;
}

export function initThemeListener(
  onChange: (setting: ThemeSetting, resolved: ResolvedTheme) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<{ setting: ThemeSetting; resolved: ResolvedTheme }>;
    if (custom.detail) {
      onChange(custom.detail.setting, custom.detail.resolved);
    }
  };

  const mediaQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  const handleMediaChange = () => {
    const currentSetting = getStoredThemeSetting();
    if (currentSetting === 'auto') {
      const resolved = getSystemTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', resolved);
        document.documentElement.setAttribute('data-theme-setting', 'auto');
      }
      onChange('auto', resolved);
    }
  };

  window.addEventListener('northstar-theme-change', handleCustomEvent);
  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else if (typeof (mediaQuery as any).addListener === 'function') {
      (mediaQuery as any).addListener(handleMediaChange);
    }
  }

  return () => {
    window.removeEventListener('northstar-theme-change', handleCustomEvent);
    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else if (typeof (mediaQuery as any).removeListener === 'function') {
        (mediaQuery as any).removeListener(handleMediaChange);
      }
    }
  };
}
