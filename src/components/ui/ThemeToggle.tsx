import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import {
  getStoredThemeSetting,
  resolveTheme,
  applyTheme,
  initThemeListener,
  type ThemeSetting,
  type ResolvedTheme
} from '../../utils/theme';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps): JSX.Element {
  const [setting, setSetting] = useState<ThemeSetting>('auto');
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    const current = getStoredThemeSetting();
    setSetting(current);
    setResolved(resolveTheme(current));

    const unsubscribe = initThemeListener((newSetting, newResolved) => {
      setSetting(newSetting);
      setResolved(newResolved);
    });

    return unsubscribe;
  }, []);

  const handleSelect = (mode: ThemeSetting) => {
    const nextResolved = applyTheme(mode);
    setSetting(mode);
    setResolved(nextResolved);
  };

  return (
    <div
      class={`theme-toggle-group ${className}`}
      role="group"
      aria-label="Color theme selection"
    >
      <button
        type="button"
        class={`theme-toggle-btn ${setting === 'auto' ? 'active' : ''}`}
        onClick={() => handleSelect('auto')}
        title={`Auto (${resolved === 'dark' ? 'system dark' : 'system light'})`}
        aria-pressed={setting === 'auto'}
      >
        <span class="theme-icon" aria-hidden="true">◐</span>
        {!compact && <span class="theme-text">Auto</span>}
      </button>

      <button
        type="button"
        class={`theme-toggle-btn ${setting === 'light' ? 'active' : ''}`}
        onClick={() => handleSelect('light')}
        title="Light mode"
        aria-pressed={setting === 'light'}
      >
        <span class="theme-icon" aria-hidden="true">☼</span>
        {!compact && <span class="theme-text">Light</span>}
      </button>

      <button
        type="button"
        class={`theme-toggle-btn ${setting === 'dark' ? 'active' : ''}`}
        onClick={() => handleSelect('dark')}
        title="Dark mode"
        aria-pressed={setting === 'dark'}
      >
        <span class="theme-icon" aria-hidden="true">☾</span>
        {!compact && <span class="theme-text">Dark</span>}
      </button>
    </div>
  );
}
