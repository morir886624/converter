interface Props {
  value: number; // 0–100
  className?: string;
}

export function ProgressBar({ value, className = '' }: Props) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 ${className}`}
    >
      <div
        className="h-full rounded-full bg-brand-500 transition-all motion-reduce:transition-none duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
