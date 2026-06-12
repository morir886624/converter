interface Props {
  dark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ dark, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
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
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
