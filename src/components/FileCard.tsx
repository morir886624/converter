import { useState, useEffect } from 'react';
import type { FileItem, ConversionOptions } from '../types';
import { CATEGORY_ICON } from '../utils/fileDetection';
import { formatBytes } from '../utils/download';
import { ProgressBar } from './ProgressBar';
import { Preview } from './Preview';
import { ConversionOptions as OptionsPanel } from './ConversionOptions';
import { ExifPanel } from './ExifPanel';
import { extractAndDownload, listZipContents } from '../converters/archives';

// ── Image presets ────────────────────────────────────────────────────────────

const IMAGE_PRESETS = [
  { id: 'web'    as const, label: '🌐 Web',         hint: 'WebP · 80% · max 1920 px', format: 'webp', quality: 80,  maxWidth: 1920 as number | undefined },
  { id: 'email'  as const, label: '📧 Email',        hint: 'JPEG · 60% · max 1024 px', format: 'jpg',  quality: 60,  maxWidth: 1024 as number | undefined },
  { id: 'max'    as const, label: '✨ Max quality',  hint: 'PNG · lossless · no resize', format: 'png', quality: 100, maxWidth: undefined as number | undefined },
  { id: 'custom' as const, label: 'Custom',          hint: 'Manual settings',            format: '',    quality: -1,  maxWidth: undefined as number | undefined },
];

type PresetId = 'web' | 'email' | 'max' | 'custom';

const PRESET_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);

function getActivePreset(targetFormat: string, options: ConversionOptions): PresetId {
  const quality = options.quality ?? 90;
  const maxWidth = options.maxWidth;
  for (const p of IMAGE_PRESETS) {
    if (p.id === 'custom') continue;
    if (targetFormat === p.format && quality === p.quality && maxWidth === p.maxWidth) {
      return p.id;
    }
  }
  return 'custom';
}

interface ImagePresetsProps {
  targetFormat: string;
  options: ConversionOptions;
  availableFormats: string[];
  disabled: boolean;
  onFormatChange: (fmt: string) => void;
  onOptionsChange: (opts: Partial<ConversionOptions>) => void;
}

function ImagePresets({
  targetFormat, options, availableFormats, disabled, onFormatChange, onOptionsChange,
}: ImagePresetsProps) {
  if (!PRESET_FORMATS.has(targetFormat)) return null;

  const activeId = getActivePreset(targetFormat, options);

  return (
    <div className="flex flex-wrap gap-1.5">
      {IMAGE_PRESETS.map((preset) => {
        if (preset.id !== 'custom' && !availableFormats.includes(preset.format)) return null;
        const isActive = activeId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            title={preset.hint || undefined}
            disabled={disabled}
            onClick={() => {
              if (preset.id === 'custom') return;
              onFormatChange(preset.format);
              onOptionsChange({ quality: preset.quality, maxWidth: preset.maxWidth });
            }}
            className={`
              text-xs px-2.5 py-1 rounded-full border font-medium transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              ${isActive
                ? 'bg-brand-600 border-brand-600 text-white dark:bg-brand-500 dark:border-brand-500'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-400 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400'
              }
            `}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

const EXIF_EXTENSIONS = new Set(['jpg', 'jpeg', 'tiff', 'tif']);

interface Props {
  item: FileItem;
  onRemove: (id: string) => void;
  onConvert: (id: string) => void;
  onDownload: (id: string) => void;
  onFormatChange: (id: string, fmt: string) => void;
  onOptionsChange: (id: string, opts: Partial<ConversionOptions>) => void;
  onCleanExif: (id: string) => void;
}

const FORMAT_LABELS: Record<string, string> = {
  extract: 'Extract',
  jpg: 'JPG', jpeg: 'JPG', png: 'PNG', webp: 'WebP',
  bmp: 'BMP', gif: 'GIF', avif: 'AVIF',
  'png-nobg': 'Remove background → PNG',
  'jpg-clean': 'Supprimer l\'EXIF → JPEG',
  mp3: 'MP3', wav: 'WAV', ogg: 'OGG', aac: 'AAC',
  mp4: 'MP4', webm: 'WebM',
  pdf: 'PDF', html: 'HTML', txt: 'TXT', md: 'Markdown',
  csv: 'CSV', json: 'JSON', yaml: 'YAML', xml: 'XML', xlsx: 'XLSX',
  zip: 'ZIP',
};

function SizeDiff({ before, after }: { before: number; after: number }) {
  const diff = after - before;
  const pct = Math.abs(Math.round((diff / before) * 100));
  const sign = diff < 0 ? '−' : '+';
  const color = diff < 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400';
  return (
    <span className="shrink-0 text-xs flex items-center gap-1">
      <span className="text-slate-400 dark:text-slate-500">{formatBytes(before)} →</span>
      <span className={`font-medium ${color}`}>{formatBytes(after)} ({sign}{pct}%)</span>
    </span>
  );
}

const STATUS_MAP = {
  converting: {
    label: 'Converting…',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  done: {
    label: '✓ Done',
    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  error: {
    label: '✗ Error',
    cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
} as const;

function StatusBadge({ status }: { status: FileItem['status'] }) {
  if (status === 'idle') return null;
  const { label, cls } = STATUS_MAP[status];
  return (
    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  );
}

function ZipPreview({ blob }: { blob: Blob }) {
  const [fileList, setFileList] = useState<string[] | null>(null);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    listZipContents(blob).then(setFileList);
  }, [blob]);

  const handleExtract = async () => {
    setExtracting(true);
    await extractAndDownload(blob);
    setExtracting(false);
  };

  return (
    <div className="mt-3 space-y-2">
      {fileList !== null ? (
        <details className="text-xs">
          <summary className="
            cursor-pointer select-none
            text-slate-500 dark:text-slate-400
            hover:text-slate-700 dark:hover:text-slate-200
            transition-colors
          ">
            {fileList.length} file{fileList.length > 1 ? 's' : ''} in archive
          </summary>
          <ul className="mt-1.5 pl-3 space-y-0.5 max-h-28 overflow-auto">
            {fileList.map((f) => (
              <li key={f} className="text-slate-600 dark:text-slate-300 truncate">{f}</li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">Analyzing archive…</p>
      )}
      <button
        onClick={handleExtract}
        disabled={extracting}
        className="btn-primary text-xs px-3 min-h-[40px]"
      >
        {extracting ? 'Extracting…' : '⬇ Extract files'}
      </button>
    </div>
  );
}

export function FileCard({
  item, onRemove, onConvert, onDownload, onFormatChange, onOptionsChange, onCleanExif,
}: Props) {
  const isZipExtract = item.targetFormat === 'extract';
  const canConvert = item.status === 'idle' && item.targetFormat !== null;
  const canDownload = item.status === 'done' && item.result !== null && !isZipExtract;
  const isBig = (item.category === 'video' || item.category === 'audio') && item.size > 150 * 1024 * 1024;

  return (
    <article className="
      bg-white dark:bg-slate-800
      rounded-2xl border border-slate-200 dark:border-slate-700
      p-3.5 sm:p-4
      shadow-sm
    ">
      {/* ── Top row: icon · file info · close ── */}
      <div className="flex items-start gap-3">

        {/* Category icon */}
        <span className="text-2xl shrink-0 mt-0.5 select-none" aria-hidden>
          {CATEGORY_ICON[item.category]}
        </span>

        {/* File info + controls */}
        <div className="flex-1 min-w-0 space-y-2">

          {/* Name + size + status */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <p
              className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate min-w-0 flex-1"
              title={item.name}
            >
              {item.name}
            </p>
            {item.status === 'done' && item.result && !isZipExtract ? (
              <SizeDiff before={item.size} after={item.result.size} />
            ) : (
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {formatBytes(item.size)}
              </span>
            )}
            <StatusBadge status={item.status} />
          </div>

          {/* Format selector row */}
          {item.availableFormats.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono shrink-0">
                .{item.extension}
              </span>
              <span className="text-slate-300 dark:text-slate-600 shrink-0" aria-hidden>→</span>
              <select
                value={item.targetFormat ?? ''}
                onChange={(e) => onFormatChange(item.id, e.target.value)}
                disabled={item.status === 'converting'}
                aria-label="Output format"
                className="select-field flex-1 sm:flex-none sm:w-auto font-medium"
              >
                {item.availableFormats
                  // jpg-clean is accessible via ExifPanel only; keep in list if currently selected
                  .filter((fmt) => fmt !== 'jpg-clean' || item.targetFormat === 'jpg-clean')
                  .map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {FORMAT_LABELS[fmt] ?? fmt.toUpperCase()}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              No conversion available for this format.
            </p>
          )}

          {/* EXIF metadata panel (JPEG/TIFF only) */}
          {EXIF_EXTENSIONS.has(item.extension) && (
            <ExifPanel
              file={item.file}
              extension={item.extension}
              canClean={item.availableFormats.includes('jpg-clean')}
              isCleaned={item.status === 'done' && item.targetFormat === 'jpg-clean'}
              onClean={() => onCleanExif(item.id)}
            />
          )}

          {/* Image presets */}
          {item.category === 'image' && item.targetFormat && (
            <ImagePresets
              targetFormat={item.targetFormat}
              options={item.options}
              availableFormats={item.availableFormats}
              disabled={item.status === 'converting'}
              onFormatChange={(fmt) => onFormatChange(item.id, fmt)}
              onOptionsChange={(opts) => onOptionsChange(item.id, opts)}
            />
          )}

          {/* Per-format options */}
          {item.targetFormat && !isZipExtract && (
            <OptionsPanel
              category={item.category}
              targetFormat={item.targetFormat}
              options={item.options}
              onChange={(opts) => onOptionsChange(item.id, opts)}
              file={item.file}
            />
          )}
        </div>

        {/* Close button — 44×44 touch target */}
        <button
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name}`}
          className="
            shrink-0 -mt-1 -mr-1
            flex items-center justify-center w-11 h-11
            rounded-xl
            text-slate-400 dark:text-slate-500
            hover:text-red-500 dark:hover:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20
            transition-colors duration-150
          "
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* ── RAM warning ── */}
      {isBig && (
        <p className="mt-2.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-100 dark:border-amber-800/30">
          ⚠ Large file ({formatBytes(item.size)}) — ffmpeg.wasm may use a lot of RAM.
        </p>
      )}

      {/* ── Progress bar ── */}
      {item.status === 'converting' && (
        <div className="mt-3 space-y-1">
          <ProgressBar value={item.progress} />
          <p className="text-right text-xs text-slate-400 dark:text-slate-500">{item.progress}%</p>
        </div>
      )}

      {/* ── Error message ── */}
      {item.status === 'error' && item.error && (
        <p className="mt-2.5 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
          {item.error}
        </p>
      )}

      {/* ── ZIP preview ── */}
      {isZipExtract && item.status === 'done' && item.result && (
        <ZipPreview blob={item.result} />
      )}

      {/* ── Image / text preview ── */}
      {!isZipExtract && <Preview item={item} />}

      {/* ── Action buttons ── */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {canConvert && !isZipExtract && (
          <button onClick={() => onConvert(item.id)} className="btn-primary text-sm px-4">
            Convert
          </button>
        )}
        {isZipExtract && item.status === 'idle' && (
          <button onClick={() => onConvert(item.id)} className="btn-primary text-sm px-4">
            Analyze
          </button>
        )}
        {canDownload && (
          <button onClick={() => onDownload(item.id)} className="btn-success text-sm px-4">
            ⬇ Download
          </button>
        )}
        {item.status === 'done' && !isZipExtract && (
          <button onClick={() => onConvert(item.id)} className="btn-ghost text-sm px-3">
            ↺ Convert again
          </button>
        )}
      </div>
    </article>
  );
}
