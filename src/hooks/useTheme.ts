import { useState, useEffect } from 'react';

export type ThemeMode = 'system' | 'dark' | 'light';

function getSystemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [systemDark, setSystemDark] = useState(getSystemDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const dark = mode === 'dark' || (mode === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Cycle: system → dark → light → system
  const cycleTheme = () => setMode((m) => m === 'system' ? 'dark' : m === 'dark' ? 'light' : 'system');

  return { dark, mode, cycleTheme };
}
