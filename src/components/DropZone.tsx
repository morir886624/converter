import { useRef, useState, useCallback } from 'react';

interface Props {
  onFilesAdded: (files: File[]) => void;
  compact?: boolean;
}

export function DropZone({ onFilesAdded, compact = false }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFilesAdded(Array.from(files));
    },
    [onFilesAdded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  };

  const open = () => inputRef.current?.click();

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
      onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
    />
  );

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Add files"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={open}
        onKeyDown={(e) => e.key === 'Enter' && open()}
        className={`
          flex items-center gap-3 p-3 mb-4 rounded-xl border-2 border-dashed
          cursor-pointer select-none transition-colors duration-150
          min-h-[52px]
          ${dragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
            : 'border-slate-300 dark:border-slate-600 hover:border-brand-500 dark:hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
          }
        `}
      >
        <span className="text-xl shrink-0">📂</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Drop more files or{' '}
          <span className="text-brand-600 dark:text-brand-400 font-medium">browse</span>
        </span>
        {hiddenInput}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="File drop zone"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      className={`
        flex flex-col items-center justify-center gap-3 sm:gap-4
        p-8 sm:p-14
        rounded-2xl border-2 border-dashed cursor-pointer select-none
        transition-all duration-150
        ${dragging
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 scale-[1.01]'
          : 'border-slate-300 dark:border-slate-600 hover:border-brand-500 dark:hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
        }
      `}
    >
      <span className="text-5xl sm:text-6xl select-none" aria-hidden>📂</span>
      <div className="text-center space-y-1">
        <p className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-200">
          Drop your files here
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          or{' '}
          <span className="text-brand-600 dark:text-brand-400 font-medium underline underline-offset-2">
            browse your files
          </span>
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
          Images · Audio · Video · Documents · Data · Archives
        </p>
      </div>
      {hiddenInput}
    </div>
  );
}
