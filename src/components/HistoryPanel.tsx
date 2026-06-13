import { useState } from 'react';
import type { HistoryEntry } from '../types';
import { CATEGORY_ICON } from '../utils/fileDetection';
import { formatBytes } from '../utils/download';

const FMT_LABEL: Record<string, string> = {
  'jpg-clean': 'JPEG (no EXIF)',
  'trim-copy': 'Trim copy',
  'png-nobg': 'PNG (no bg)',
  jpg: 'JPG', jpeg: 'JPG', png: 'PNG', webp: 'WebP',
  bmp: 'BMP', gif: 'GIF', avif: 'AVIF',
  mp3: 'MP3', wav: 'WAV', ogg: 'OGG', aac: 'AAC',
  mp4: 'MP4', webm: 'WebM',
  pdf: 'PDF', html: 'HTML', txt: 'TXT', md: 'Markdown',
  csv: 'CSV', json: 'JSON', yaml: 'YAML', xml: 'XML', xlsx: 'XLSX',
  zip: 'ZIP',
};

function fmtLabel(format: string): string {
  return FMT_LABEL[format] ?? format.toUpperCase();
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return time;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

const SIZE_WARN_BYTES = 150 * 1024 * 1024;
const COUNT_WARN = 50;

interface Props {
  entries: HistoryEntry[];
  totalSize: number;
  onClose: () => void;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onDownloadAll: () => void;
}

export function HistoryPanel({ entries, totalSize, onClose, onDownload, onRemove, onClearAll, onDownloadAll }: Props) {
  const [clearConfirm, setClearConfirm] = useState(false);

  const hasSuccess = entries.some((e) => e.status === 'success');
  const showMemWarn = entries.length > COUNT_WARN || totalSize > SIZE_WARN_BYTES;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md flex flex-col bg-white dark:bg-slate-900 shadow-2xl h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none" aria-hidden>🕐</span>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Session history</h2>
            {entries.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-medium">
                {entries.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close history"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Memory warning */}
        {showMemWarn && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-xs text-amber-800 dark:text-amber-300 shrink-0">
            ⚠ History is using {formatBytes(totalSize)} of memory ({entries.length} entries).
            Consider clearing old entries to free RAM.
          </div>
        )}

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <span className="text-4xl opacity-30" aria-hidden>🕐</span>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No conversions yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Convert a file in the Converter tab to see it here.
              </p>
            </div>
          ) : (
            <ul>
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-1.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  {/* Top row: icon · info · status badge */}
                  <div className="flex items-start gap-2.5">
                    <span aria-hidden className="text-xl leading-none mt-0.5 shrink-0">
                      {CATEGORY_ICON[entry.category]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate leading-snug"
                        title={entry.fileName}
                      >
                        {entry.fileName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                        {entry.inputFormat.toUpperCase()} → {fmtLabel(entry.outputFormat)}
                        <span className="mx-1 opacity-40">·</span>
                        {fmtTime(entry.timestamp)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 ${
                        entry.status === 'success'
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {entry.status === 'success' ? '✓' : '✗'}
                    </span>
                  </div>

                  {/* Size delta */}
                  {entry.status === 'success' && entry.outputSize !== null && (
                    <p className="ml-8 text-xs text-slate-400 dark:text-slate-500">
                      {formatBytes(entry.inputSize)}
                      <span className="mx-1 opacity-50" aria-hidden>→</span>
                      <span className={entry.outputSize <= entry.inputSize
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-amber-600 dark:text-amber-400 font-medium'
                      }>
                        {formatBytes(entry.outputSize)}
                      </span>
                      {' '}
                      <span className={entry.outputSize <= entry.inputSize
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-amber-500 dark:text-amber-400'
                      }>
                        ({entry.outputSize <= entry.inputSize ? '−' : '+'}
                        {Math.abs(Math.round(((entry.outputSize - entry.inputSize) / entry.inputSize) * 100))}%)
                      </span>
                    </p>
                  )}

                  {/* Error message */}
                  {entry.status === 'error' && entry.error && (
                    <p
                      className="ml-8 text-xs text-red-600 dark:text-red-400 truncate"
                      title={entry.error}
                    >
                      {entry.error}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="ml-8 flex gap-1.5">
                    {entry.status === 'success' && entry.blob && (
                      <button
                        onClick={() => onDownload(entry.id)}
                        className="btn-ghost text-xs px-2 py-1"
                      >
                        ⬇ Download
                      </button>
                    )}
                    <button
                      onClick={() => onRemove(entry.id)}
                      className="btn-ghost text-xs px-2 py-1 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      × Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {entries.length > 0 && (
          <div className="shrink-0 flex flex-col gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            {hasSuccess && (
              <button onClick={onDownloadAll} className="btn-success text-sm w-full">
                ⬇ Download all (ZIP)
              </button>
            )}
            {clearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xs text-slate-600 dark:text-slate-400">
                  Clear all {entries.length} entries?
                </span>
                <button
                  onClick={() => { onClearAll(); setClearConfirm(false); }}
                  className="btn-ghost text-xs px-2.5 py-1 text-red-500 dark:text-red-400 font-semibold"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  className="btn-ghost text-xs px-2.5 py-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setClearConfirm(true)}
                className="btn-ghost text-sm w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                🗑 Clear history
              </button>
            )}
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-600">
              History is in-memory only — cleared on page reload
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
