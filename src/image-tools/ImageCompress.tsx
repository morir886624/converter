import { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { ToolDropZone } from './ToolDropZone';
import { ProgressBar } from '../components/ProgressBar';
import { downloadBlob, formatBytes } from '../utils/download';

type State = 'idle' | 'processing' | 'done' | 'error';

const ROW = 'flex items-center gap-3';
const LBL = 'text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0';

export function ImageCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [maxSizeMB, setMaxSizeMB] = useState(1);
  const [quality, setQuality] = useState(80);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResultUrl(null);
    setResultFile(null);
    setState('idle');
    setError(null);
    setProgress(0);
  };

  const compress = async () => {
    if (!file) return;
    setState('processing');
    setProgress(0);
    setError(null);
    try {
      const result = await imageCompression(file, {
        maxSizeMB,
        initialQuality: quality / 100,
        useWebWorker: true,
        onProgress: setProgress,
      });
      setResultFile(result);
      setResultUrl(URL.createObjectURL(result));
      setState('done');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Compression error');
    }
  };

  const download = () => {
    if (!resultFile || !file) return;
    const base = file.name.replace(/\.[^.]+$/, '');
    const ext = file.name.split('.').pop() ?? 'jpg';
    downloadBlob(resultFile, `${base}-compressed.${ext}`);
  };

  const ratio = resultFile && file ? resultFile.size / file.size : null;
  const pctChange = ratio !== null ? Math.round((ratio - 1) * 100) : null;

  return (
    <div className="space-y-4">
      <ToolDropZone
        file={file}
        onFile={handleFile}
        accept="image/jpeg,image/png,image/webp,image/gif"
        acceptLabel="JPG, PNG, WebP, GIF"
        icon="🗜️"
        disabled={state === 'processing'}
      />

      {file && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className={ROW}>
            <span className={LBL}>Quality</span>
            <input
              type="range" min={10} max={100} step={5}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="flex-1 accent-brand-500 h-2 cursor-pointer"
            />
            <span className="text-xs font-mono w-9 text-right text-slate-700 dark:text-slate-300">
              {quality}%
            </span>
          </div>
          <div className={ROW}>
            <span className={LBL}>Max size (MB)</span>
            <input
              type="number" min={0.1} max={50} step={0.1}
              value={maxSizeMB}
              onChange={(e) => setMaxSizeMB(Number(e.target.value))}
              className="select-field-sm w-24"
            />
          </div>
        </div>
      )}

      {file && (state === 'idle' || state === 'done') && (
        <button onClick={compress} className="btn-primary">
          🗜️ Compress
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
                className="w-full max-h-64 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f8f8] dark:bg-slate-700"
              />
              {file && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center">
                  {formatBytes(file.size)}
                </p>
              )}
            </div>
          )}

          {resultUrl && resultFile && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
                Compressed
              </p>
              <img
                src={resultUrl}
                alt="compressed"
                className="w-full max-h-64 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f8f8] dark:bg-slate-700"
              />
              <p className={`text-xs mt-1 text-center font-semibold ${
                pctChange !== null && pctChange < 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {formatBytes(resultFile.size)}
                {pctChange !== null && (
                  <span className="ml-1 font-normal text-slate-400">
                    ({pctChange < 0 ? '−' : '+'}{Math.abs(pctChange)}%)
                  </span>
                )}
              </p>
              {pctChange !== null && pctChange >= 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-0.5">
                  Image was already well compressed.
                </p>
              )}
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
