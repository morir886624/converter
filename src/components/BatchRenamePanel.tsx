import { useMemo } from 'react';
import type { FileItem } from '../types';
import { applyFilenamePattern, getBaseName, getOutputExt, todayIso, DEFAULT_PATTERN } from '../utils/filenamePattern';

interface Props {
  pattern: string;
  onChange: (pattern: string) => void;
  files: FileItem[];
}

const VARS = ['{name}', '{ext}', '{n}', '{n:3}', '{date}'];

export function BatchRenamePanel({ pattern, onChange, files }: Props) {
  const today = useMemo(() => todayIso(), []);

  const previewNames = useMemo(() => {
    return files
      .filter((f) => f.status === 'done' && f.targetFormat)
      .slice(0, 3)
      .map((f, i) =>
        applyFilenamePattern(pattern, {
          n: i + 1,
          name: getBaseName(f.name),
          ext: getOutputExt(f.targetFormat!, f.name),
          date: today,
        }),
      );
  }, [files, pattern, today]);

  const isDefault = pattern === DEFAULT_PATTERN;

  return (
    <div className="mb-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">
          📝 Filename pattern
        </label>
        <div className="flex-1 min-w-36 flex items-center gap-1.5">
          <input
            type="text"
            value={pattern}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="flex-1 min-w-0 text-xs font-mono px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
          />
          {!isDefault && (
            <button
              onClick={() => onChange(DEFAULT_PATTERN)}
              title="Reset to default"
              className="shrink-0 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1.5 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      {/* Variable chips */}
      <div className="flex flex-wrap gap-1 mt-2">
        {VARS.map((v) => (
          <button
            key={v}
            onClick={() => onChange(pattern + v)}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            title={`Insert ${v}`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Live preview */}
      {previewNames.length > 0 && (
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 truncate leading-snug">
          <span className="font-medium text-slate-500 dark:text-slate-400">Preview: </span>
          {previewNames.join('  ·  ')}
        </p>
      )}
    </div>
  );
}
