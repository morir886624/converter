import { useState, useEffect } from 'react';
import { ToolDropZone } from './ToolDropZone';
import { ProgressBar } from '../components/ProgressBar';
import { backgroundRemovalConverter } from '../converters/backgroundRemoval';
import { downloadBlob } from '../utils/download';
import { formatBytes } from '../utils/download';

type State = 'idle' | 'processing' | 'done' | 'error';

export function ImageBgRemoval() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (originalUrl) URL.revokeObjectURL(originalUrl); }, [originalUrl]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  const handleFile = (f: File) => {
    setFile(f);
    setOriginalUrl(URL.createObjectURL(f));
    setResultUrl(null);
    setResultBlob(null);
    setState('idle');
    setError(null);
    setProgress(0);
  };

  const process = async () => {
    if (!file) return;
    setState('processing');
    setProgress(0);
    setError(null);
    try {
      const result = await backgroundRemovalConverter.convert(
        file, 'png-nobg', {}, (pct) => setProgress(pct),
      );
      setResultBlob(result);
      setResultUrl(URL.createObjectURL(result));
      setState('done');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Processing error');
    }
  };

  const download = () => {
    if (!resultBlob || !file) return;
    const base = file.name.replace(/\.[^.]+$/, '');
    downloadBlob(resultBlob, `${base}-no-bg.png`);
  };

  return (
    <div className="space-y-4">
      <ToolDropZone
        file={file}
        onFile={handleFile}
        accept="image/jpeg,image/png,image/webp"
        acceptLabel="JPG, PNG, WebP"
        disabled={state === 'processing'}
      />

      {file && state === 'idle' && (
        <p className="text-xs text-slate-500 dark:text-slate-400 flex gap-1.5 items-start">
          <span aria-hidden className="shrink-0">ℹ</span>
          AI model (~40 MB) downloaded on first use — internet required.
          Subsequent conversions are instant.
        </p>
      )}

      {file && (state === 'idle' || state === 'done') && (
        <button onClick={process} className="btn-primary">
          ✨ Remove background
        </button>
      )}

      {state === 'processing' && (
        <div className="space-y-1">
          <ProgressBar value={progress} />
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>
              {progress < 10 ? 'Starting…' : progress < 90 ? 'Loading model…' : 'Processing…'}
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {state === 'error' && error && (
        <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
          {error}
        </p>
      )}

      {/* Before / After */}
      {(originalUrl || resultUrl) && (
        <div className={`grid gap-3 ${originalUrl && resultUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {originalUrl && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
                Original
              </p>
              <img
                src={originalUrl}
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

          {resultUrl && resultBlob && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
                Result
              </p>
              <img
                src={resultUrl}
                alt="background removed"
                className="w-full max-h-64 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-checkerboard"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center">
                {formatBytes(resultBlob.size)}
              </p>
              <button onClick={download} className="btn-success mt-2 w-full text-sm">
                ⬇ Download PNG
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
