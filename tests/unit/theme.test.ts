import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredThemeSetting,
  resolveTheme,
  applyTheme,
  THEME_STORAGE_KEY
} from '../../src/utils/theme';

describe('Theme Utility (theme.ts)', () => {
  let mockStorage: Record<string, string> = {};
  let mockAttributes: Record<string, string> = {};
  let eventListeners: Record<string, ((e: any) => void)[]> = {};

  beforeEach(() => {
    mockStorage = {};
    mockAttributes = {};
    eventListeners = {};

    // Mock window & document in Node environment
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = String(v);
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          mockStorage = {};
        }
      },
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })),
      addEventListener: (event: string, handler: (e: any) => void) => {
        eventListeners[event] = eventListeners[event] || [];
        eventListeners[event].push(handler);
      },
      removeEventListener: (event: string, handler: (e: any) => void) => {
        if (!eventListeners[event]) return;
        eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
      },
      dispatchEvent: (e: any) => {
        const handlers = eventListeners[e.type] || [];
        handlers.forEach((h) => h(e));
        return true;
      }
    };

    (globalThis as any).document = {
      documentElement: {
        setAttribute: (k: string, v: string) => {
          mockAttributes[k] = String(v);
        },
        getAttribute: (k: string) => mockAttributes[k] || null,
        removeAttribute: (k: string) => {
          delete mockAttributes[k];
        }
      }
    };

    (globalThis as any).CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, params?: { detail: any }) {
        this.type = type;
        this.detail = params?.detail;
      }
    };
  });

  it('defaults to auto when no preference is saved', () => {
    expect(getStoredThemeSetting()).toBe('auto');
  });

  it('returns valid stored setting from localStorage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(getStoredThemeSetting()).toBe('light');

    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(getStoredThemeSetting()).toBe('dark');

    window.localStorage.setItem(THEME_STORAGE_KEY, 'auto');
    expect(getStoredThemeSetting()).toBe('auto');
  });

  it('resolves explicit light and dark settings correctly', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('resolves auto based on system media query', () => {
    expect(resolveTheme('auto')).toBe('dark');
  });

  it('applies theme attributes to documentElement and saves to localStorage', () => {
    const resolved = applyTheme('dark');
    expect(resolved).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-setting')).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('applies light theme correctly', () => {
    const resolved = applyTheme('light');
    expect(resolved).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme-setting')).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('dispatches custom event on theme change', () => {
    const handler = vi.fn();
    window.addEventListener('northstar-theme-change', handler);

    applyTheme('dark');

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
