import { useRef, useState } from 'react';
import { formatBytes } from '../utils/download';

interface Props {
  onFile: (file: File) => void;
  accept: string;
  acceptLabel: string;
  file: File | null;
  icon?: string;
  disabled?: boolean;
}

export function ToolDropZone({ onFile, accept, acceptLabel, file, icon = '🖼️', disabled = false }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (list: FileList | null) => {
    const f = list?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) pick(e.dataTransfer.files); }}
      onClick={() => { if (!disabled) inputRef.current?.click(); }}
      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
        disabled
          ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
          : dragging
          ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 cursor-pointer'
          : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => pick(e.target.files)}
      />
      {file ? (
        <div className="text-sm text-slate-700 dark:text-slate-200">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatBytes(file.size)}</p>
          {!disabled && (
            <p className="text-xs text-brand-500 dark:text-brand-400 mt-1">Click or drop to change</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-3xl mb-2" aria-hidden>{icon}</p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drop an image here</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{acceptLabel} — or click to browse</p>
        </>
      )}
    </div>
  );
}
