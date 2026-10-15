import { useEffect } from 'react';
import { create } from 'zustand';
import type { ThemeMode } from '@/state/demo';

function initialMode(): ThemeMode {
  try {
    const value = localStorage.getItem('fexpo-pwa-theme');
    return value === 'dark' || value === 'light' ? value : 'system';
  } catch {
    return 'system';
  }
}
const useThemeState = create<{ mode: ThemeMode; setMode: (mode: ThemeMode) => void }>((set) => ({
  mode: initialMode(),
  setMode: (mode) => set({ mode }),
}));
export function useTheme() {
  const { mode, setMode } = useThemeState();
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    function apply() {
      const theme = mode === 'dark' || (mode === 'system' && media.matches) ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#101012' : '#f6f8fc');
      try {
        localStorage.setItem('fexpo-pwa-theme', mode);
      } catch {
        /* Theme still applies for this session. */
      }
    }
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);
  return { mode, setMode };
}
