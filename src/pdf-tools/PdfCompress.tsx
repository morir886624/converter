import { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { usePdfThumbnail } from './usePdfThumbnail';
import { downloadBlob, formatBytes } from '../utils/download';
import { ProgressBar } from '../components/ProgressBar';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

async function compressPdf(
  file: File,
  quality: number,
  onProgress: (pct: number) => void,
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const n = doc.numPages;

  const { jsPDF } = await import('jspdf');
  let output: InstanceType<typeof jsPDF> | null = null;

  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const vp1 = page.getViewport({ scale: 1 });
    const vp2 = page.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    canvas.width = vp2.width;
    canvas.height = vp2.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp2 }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', quality / 100);
    const mmW = vp1.width * 0.264583;
    const mmH = vp1.height * 0.264583;

    if (!output) {
      output = new jsPDF({
        orientation: mmW > mmH ? 'l' : 'p',
        unit: 'mm',
        format: [mmW, mmH],
        compress: true,
      });
    } else {
      output.addPage([mmW, mmH], mmW > mmH ? 'l' : 'p');
    }
    output.addImage(dataUrl, 'JPEG', 0, 0, mmW, mmH);
    onProgress(Math.round((i / n) * 100));
  }

  return output!.output('blob');
}

export function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(70);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'compressing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ blob: Blob; originalSize: number; compressedSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const thumb = usePdfThumbnail(file, 0.35);

  const loadFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') return;
    setFile(f);
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  const handleCompress = async () => {
    if (!file) return;
    setStatus('compressing');
    setProgress(0);
    setResult(null);
    setError(null);
    try {
      const blob = await compressPdf(file, quality, setProgress);
      setResult({ blob, originalSize: file.size, compressedSize: blob.size });
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('error');
    }
  };

  const diff = result ? result.compressedSize - result.originalSize : 0;
  const pct = result ? Math.abs(Math.round((diff / result.originalSize) * 100)) : 0;
  const sign = diff < 0 ? '−' : '+';

  return (
    <div className="space-y-4">
      {/* Warning */}
      <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-700 dark:text-amber-400">
        <span className="shrink-0">⚠️</span>
        <p>
          Compression re-encodes each page as a JPEG image — text and vector elements become pixelated (non-selectable). For a purely vector result, use a dedicated tool.
        </p>
      </div>

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop a PDF here"
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            isDragOver
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
          }`}
        >
          <span className="text-3xl" aria-hidden>🗜️</span>
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Drop a PDF or <span className="text-brand-600 dark:text-brand-400 font-medium">browse</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
            onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700">
          {thumb && (
            <div className="w-10 h-14 shrink-0 rounded overflow-hidden border border-slate-200 dark:border-slate-600">
              <img src={thumb} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
          </div>
          <button
            onClick={() => { setFile(null); setStatus('idle'); setResult(null); setError(null); }}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 rounded transition-colors"
            aria-label="Remove"
          >
            ✕
          </button>
        </div>
      )}

      {file && (
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 w-16 shrink-0">JPEG quality</span>
            <input
              type="range"
              min={10} max={100} step={5}
              value={quality}
              onChange={(e) => { setQuality(Number(e.target.value)); setStatus('idle'); setResult(null); }}
              className="flex-1 accent-brand-500 h-2 cursor-pointer"
            />
            <span className="text-xs font-mono w-9 text-right text-slate-700 dark:text-slate-300">{quality}%</span>
          </label>

          <button
            onClick={handleCompress}
            disabled={status === 'compressing'}
            className="btn-primary"
          >
            {status === 'compressing' ? 'Compressing…' : '🗜️ Compress'}
          </button>

          {status === 'compressing' && (
            <div className="space-y-1">
              <ProgressBar value={progress} />
              <p className="text-right text-xs text-slate-400">{progress}%</p>
            </div>
          )}

          {status === 'done' && result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">{formatBytes(result.originalSize)}</span>
                <span className="text-slate-400" aria-hidden>→</span>
                <span className={`font-semibold ${diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {formatBytes(result.compressedSize)} ({sign}{pct}%)
                </span>
              </div>
              <button
                onClick={() => downloadBlob(result.blob, file.name.replace(/\.pdf$/i, '-compressed.pdf'))}
                className="btn-success"
              >
                ⬇ Download compressed PDF
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
          )}
        </div>
      )}
    </div>
  );
}
