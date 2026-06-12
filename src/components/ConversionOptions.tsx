import type { ConversionOptions, FileCategory } from '../types';
import { useImageEstimate } from '../hooks/useImageEstimate';
import { formatBytes } from '../utils/download';

interface Props {
  category: FileCategory;
  targetFormat: string;
  options: ConversionOptions;
  onChange: (opts: Partial<ConversionOptions>) => void;
  file?: File;
}

const BITRATES = ['64k', '96k', '128k', '192k', '256k', '320k'];
const RESOLUTIONS = ['original', '3840x2160', '1920x1080', '1280x720', '854x480', '640x360'];
const MAX_WIDTHS = [
  { label: 'Original', value: '' },
  { label: '3840 px (4K)', value: '3840' },
  { label: '1920 px (FHD)', value: '1920' },
  { label: '1280 px (HD)', value: '1280' },
  { label: '1024 px', value: '1024' },
  { label: '800 px', value: '800' },
  { label: '600 px', value: '600' },
  { label: '400 px', value: '400' },
];

const LABEL_CLS = 'text-xs text-slate-500 dark:text-slate-400 w-20 shrink-0';
const ROW_CLS = 'flex items-center gap-3';

function SizeEstimateRow({ file, targetFormat, quality, maxWidth }: {
  file: File; targetFormat: string; quality: number; maxWidth: number | undefined;
}) {
  const est = useImageEstimate(file, targetFormat, quality, maxWidth);
  if (!est) return null;

  const diff = est.estimated - est.original;
  const pct = Math.abs(Math.round((diff / est.original) * 100));
  const sign = diff < 0 ? '−' : '+';
  const color = diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';

  return (
    <div className={`flex items-center gap-1.5 text-xs ${est.isLoading ? 'opacity-50' : ''}`}>
      <span className="w-20 shrink-0" />
      <span className="text-slate-500 dark:text-slate-400">
        {formatBytes(est.original)}
      </span>
      <span className="text-slate-400 dark:text-slate-500" aria-hidden>→</span>
      <span className="font-medium text-slate-700 dark:text-slate-300">
        {est.isLoading ? '…' : `~${formatBytes(est.estimated)}`}
      </span>
      {!est.isLoading && (
        <span className={`font-semibold ${color}`}>({sign}{pct}%)</span>
      )}
    </div>
  );
}

export function ConversionOptions({ category, targetFormat, options, onChange, file }: Props) {
  const isLossyImageOutput = ['jpg', 'jpeg', 'webp', 'avif'].includes(targetFormat);
  const isImageOutput = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(targetFormat);
  const isAudioOutput = ['mp3', 'wav', 'ogg', 'aac'].includes(targetFormat);
  const isVideoOutput = ['mp4', 'webm'].includes(targetFormat);
  const isGifOutput = targetFormat === 'gif';
  const isCsvOutput = targetFormat === 'csv';
  const isCsvInput = category === 'data';
  const sourceExt = file?.name.split('.').pop()?.toLowerCase();

  const showQuality = category === 'image' && isLossyImageOutput;
  const showMaxWidth = category === 'image' && isImageOutput && targetFormat !== 'pdf';
  const showEstimate = showQuality && !!file;
  const showBitrate = isAudioOutput || (category === 'video' && isAudioOutput);
  const showResolution = category === 'video' && (isVideoOutput || isGifOutput);
  const showFrameRate = isGifOutput;
  const showDelimiter = isCsvOutput || (isCsvInput && targetFormat !== 'xlsx');
  const showMdMode = targetFormat === 'md' && sourceExt === 'json';
  const showBgRemovalInfo = targetFormat === 'png-nobg';

  if (!showQuality && !showMaxWidth && !showBitrate && !showResolution && !showFrameRate && !showDelimiter && !showMdMode && !showBgRemovalInfo) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-col gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
      {showQuality && (
        <label className={ROW_CLS}>
          <span className={LABEL_CLS}>Quality</span>
          <input
            type="range"
            min={10} max={100} step={5}
            value={options.quality ?? 90}
            onChange={(e) => onChange({ quality: Number(e.target.value) })}
            className="flex-1 accent-brand-500 h-2 cursor-pointer"
          />
          <span className="text-xs font-mono w-9 text-right text-slate-700 dark:text-slate-300">
            {options.quality ?? 90}%
          </span>
        </label>
      )}

      {showEstimate && file && (
        <SizeEstimateRow
          file={file}
          targetFormat={targetFormat}
          quality={options.quality ?? 90}
          maxWidth={options.maxWidth}
        />
      )}

      {showMaxWidth && (
        <label className={ROW_CLS}>
          <span className={LABEL_CLS}>Max width</span>
          <select
            value={options.maxWidth != null ? String(options.maxWidth) : ''}
            onChange={(e) => onChange({ maxWidth: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            className="select-field-sm flex-1"
          >
            {MAX_WIDTHS.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </label>
      )}

      {showBitrate && (
        <label className={ROW_CLS}>
          <span className={LABEL_CLS}>Audio bitrate</span>
          <select
            value={options.bitrate ?? '128k'}
            onChange={(e) => onChange({ bitrate: e.target.value })}
            className="select-field-sm flex-1"
          >
            {BITRATES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      )}

      {showResolution && (
        <label className={ROW_CLS}>
          <span className={LABEL_CLS}>Resolution</span>
          <select
            value={options.resolution ?? 'original'}
            onChange={(e) => onChange({ resolution: e.target.value === 'original' ? undefined : e.target.value })}
            className="select-field-sm flex-1"
          >
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>{r === 'original' ? 'Original' : r}</option>
            ))}
          </select>
        </label>
      )}

      {showFrameRate && (
        <label className={ROW_CLS}>
          <span className={LABEL_CLS}>Frame rate</span>
          <select
            value={options.frameRate ?? 15}
            onChange={(e) => onChange({ frameRate: Number(e.target.value) })}
            className="select-field-sm flex-1"
          >
            {[5, 10, 15, 24, 30].map((f) => <option key={f} value={f}>{f} fps</option>)}
          </select>
        </label>
      )}

      {showDelimiter && (
        <label className={ROW_CLS}>
          <span className={LABEL_CLS}>Delimiter</span>
          <select
            value={options.delimiter ?? ','}
            onChange={(e) => onChange({ delimiter: e.target.value })}
            className="select-field-sm flex-1"
          >
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value={'\t'}>Tab (↹)</option>
            <option value="|">Pipe ( | )</option>
          </select>
        </label>
      )}

      {showBgRemovalInfo && (
        <p className="text-xs text-slate-500 dark:text-slate-400 flex gap-1.5 items-start">
          <span aria-hidden className="shrink-0">ℹ</span>
          AI model (~40 MB) downloaded on first use — internet connection required.
        </p>
      )}

      {showMdMode && (
        <label className={ROW_CLS}>
          <span className={LABEL_CLS}>MD format</span>
          <select
            value={options.mdMode ?? 'code'}
            onChange={(e) => onChange({ mdMode: e.target.value as 'code' | 'table' })}
            className="select-field-sm flex-1"
          >
            <option value="code">JSON code block</option>
            <option value="table">Markdown table</option>
          </select>
        </label>
      )}
    </div>
  );
}
