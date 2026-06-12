import { useState, useEffect } from 'react';
import { ToolDropZone } from './ToolDropZone';
import { ProgressBar } from '../components/ProgressBar';
import { downloadBlob, formatBytes } from '../utils/download';

type State = 'idle' | 'processing' | 'done' | 'error';
type OutputFormat = 'original' | 'jpg' | 'png' | 'webp';

const MIME: Record<OutputFormat, string> = {
  original: '',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXT: Record<OutputFormat, string> = {
  original: '',
  jpg: 'jpg',
  png: 'png',
  webp: 'webp',
};

const ROW = 'flex items-center gap-3';
const LBL = 'text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0';

export function ImageResize() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [origDim, setOrigDim] = useState<{ w: number; h: number } | null>(null);
  const [targetW, setTargetW] = useState('');
  const [targetH, setTargetH] = useState('');
  const [lockAspect, setLockAspect] = useState(true);
  const [format, setFormat] = useState<OutputFormat>('original');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dim = { w: img.naturalWidth, h: img.naturalHeight };
      setOrigDim(dim);
      setTargetW(String(dim.w));
      setTargetH(String(dim.h));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [file]);

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResultUrl(null);
    setResultBlob(null);
    setOrigDim(null);
    setTargetW('');
    setTargetH('');
    setState('idle');
    setError(null);
    setProgress(0);
  };

  const onWidthChange = (val: string) => {
    setTargetW(val);
    if (lockAspect && origDim && val && !isNaN(Number(val))) {
      const ratio = origDim.h / origDim.w;
      setTargetH(String(Math.round(Number(val) * ratio)));
    }
  };

  const onHeightChange = (val: string) => {
    setTargetH(val);
    if (lockAspect && origDim && val && !isNaN(Number(val))) {
      const ratio = origDim.w / origDim.h;
      setTargetW(String(Math.round(Number(val) * ratio)));
    }
  };

  const resize = async () => {
    if (!file || !origDim) return;
    const w = targetW ? Math.max(1, parseInt(targetW, 10)) : origDim.w;
    const h = targetH ? Math.max(1, parseInt(targetH, 10)) : origDim.h;
    if (isNaN(w) || isNaN(h)) {
      setError('Invalid dimensions.');
      return;
    }

    setState('processing');
    setProgress(30);
    setError(null);

    try {
      const mime = format === 'original' ? (file.type || 'image/png') : MIME[format];

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const el = new Image();
        el.onload = () => { URL.revokeObjectURL(url); resolve(el); };
        el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
        el.src = url;
      });

      setProgress(60);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      if (mime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);

      setProgress(85);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Export failed')),
          mime,
          0.92,
        );
      });

      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setState('done');
      setProgress(100);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Resize error');
    }
  };

  const download = () => {
    if (!resultBlob || !file) return;
    const base = file.name.replace(/\.[^.]+$/, '');
    const ext = format === 'original' ? (file.name.split('.').pop() ?? 'png') : EXT[format];
    downloadBlob(resultBlob, `${base}-${targetW}x${targetH}.${ext}`);
  };

  return (
    <div className="space-y-4">
      <ToolDropZone
        file={file}
        onFile={handleFile}
        accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
        acceptLabel="JPG, PNG, WebP, BMP, GIF"
        icon="↔️"
        disabled={state === 'processing'}
      />

      {origDim && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Original size: {origDim.w} × {origDim.h} px
          </p>

          <div className={ROW}>
            <span className={LBL}>Width (px)</span>
            <input
              type="number" min={1} max={10000}
              value={targetW}
              onChange={(e) => onWidthChange(e.target.value)}
              className="select-field-sm w-28"
            />
          </div>
          <div className={ROW}>
            <span className={LBL}>Height (px)</span>
            <input
              type="number" min={1} max={10000}
              value={targetH}
              onChange={(e) => onHeightChange(e.target.value)}
              className="select-field-sm w-28"
            />
          </div>

          <label className={`${ROW} cursor-pointer select-none`}>
            <span className={LBL}>Lock ratio</span>
            <button
              type="button"
              role="switch"
              aria-checked={lockAspect}
              onClick={() => setLockAspect((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                lockAspect ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                  lockAspect ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {lockAspect ? '🔒 Proportions locked' : '🔓 Free'}
            </span>
          </label>

          <div className={ROW}>
            <span className={LBL}>Output format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as OutputFormat)}
              className="select-field-sm flex-1"
            >
              <option value="original">Original ({file?.name.split('.').pop()?.toUpperCase()})</option>
              <option value="jpg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
        </div>
      )}

      {file && origDim && (state === 'idle' || state === 'done') && (
        <button onClick={resize} className="btn-primary">
          ↔️ Resize
        </button>
      )}

      {state === 'processing' && (
        <div className="space-y-1">
          <ProgressBar value={progress} />
          <p className="text-right text-xs text-slate-400 dark:text-slate-500">{progress}%</p>
        </div>
      )}

      {state === 'error' && error && (
        <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
          {error}
        </p>
      )}

      {/* Before / After */}
      {(previewUrl || resultUrl) && (
        <div className={`grid gap-3 ${previewUrl && resultUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {previewUrl && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
                Original
              </p>
              <img
                src={previewUrl}
                alt="original"
                className="w-full max-h-56 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f8f8] dark:bg-slate-700"
              />
              {file && origDim && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center">
                  {origDim.w} × {origDim.h} px · {formatBytes(file.size)}
                </p>
              )}
            </div>
          )}

          {resultUrl && resultBlob && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
                Result
              </p>
              <img
                src={resultUrl}
                alt="resized"
                className={`w-full max-h-56 object-contain rounded-xl border border-slate-200 dark:border-slate-700 ${
                  format === 'png' || (format === 'original' && file?.type === 'image/png')
                    ? 'bg-checkerboard'
                    : 'bg-[#f8f8f8] dark:bg-slate-700'
                }`}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center">
                {targetW} × {targetH} px · {formatBytes(resultBlob.size)}
              </p>
              <button onClick={download} className="btn-success mt-2 w-full text-sm">
                ⬇ Download
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
