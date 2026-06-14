import type { ThemeMode } from '../hooks/useTheme';

interface Props {
  mode: ThemeMode;
  onCycle: () => void;
}

const ICONS: Record<ThemeMode, string> = { system: '🖥️', dark: '🌙', light: '☀️' };
const LABELS: Record<ThemeMode, string> = {
  system: 'System theme — click for dark mode',
  dark:   'Dark mode — click for light mode',
  light:  'Light mode — click for system theme',
};

export function ThemeToggle({ mode, onCycle }: Props) {
  return (
    <button
      onClick={onCycle}
      aria-label={LABELS[mode]}
      title={LABELS[mode]}
      className="
        flex items-center justify-center
        w-11 h-11 shrink-0
        rounded-xl text-xl
        text-slate-600 dark:text-slate-300
        hover:bg-slate-100 dark:hover:bg-slate-800
        active:bg-slate-200 dark:active:bg-slate-700
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
      "
    >
      {ICONS[mode]}
    </button>
  );
}
