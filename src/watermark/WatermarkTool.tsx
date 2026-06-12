import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { WatermarkConfig } from './WatermarkConfig';
import { drawWatermarkOnCanvas } from './imageWatermark';
import { convert as convertImage } from './imageWatermark';
import { convert as convertPdf } from './pdfWatermark';
import { DEFAULT_WATERMARK_OPTIONS } from './types';
import type { WatermarkOptions, WatermarkFile } from './types';
import { downloadBlob, formatBytes } from '../utils/download';
import { ProgressBar } from '../components/ProgressBar';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/bmp']);

function isImageFile(f: File): boolean {
  return IMAGE_TYPES.has(f.type) || /\.(jpe?g|png|webp|bmp)$/i.test(f.name);
}

function isPdfFile(f: File): boolean {
  return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
}

function outputName(wf: WatermarkFile): string {
  const base = wf.file.name.replace(/\.[^.]+$/, '');
  const ext = wf.file.name.split('.').pop() ?? '';
  return `${base}-watermarked.${ext}`;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

async function renderFirstPage(file: File, maxW = 700): Promise<HTMLCanvasElement> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const scale = Math.min(maxW / vp.width, 1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
  doc.destroy();
  return canvas;
}

export function WatermarkTool() {
  const [files, setFiles] = useState<WatermarkFile[]>([]);
  const [opts, setOpts] = useState<WatermarkOptions>(DEFAULT_WATERMARK_OPTIONS);
  const [logoImgEl, setLogoImgEl] = useState<HTMLImageElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  // Load logo image element whenever logoFile changes
  useEffect(() => {
    if (!opts.logoFile) { setLogoImgEl(null); return; }
    const url = URL.createObjectURL(opts.logoFile);
    loadImg(url).then(setLogoImgEl).catch(() => setLogoImgEl(null));
    return () => URL.revokeObjectURL(url);
  }, [opts.logoFile]);

  // Debounced preview update
  useEffect(() => {
    const firstFile = files[0];
    if (!firstFile || !previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
      }
      return;
    }

    const timer = setTimeout(async () => {
      if (!previewCanvasRef.current) return;
      setPreviewBusy(true);
      try {
        let srcCanvas: HTMLCanvasElement;

        if (firstFile.kind === 'image') {
          const url = URL.createObjectURL(firstFile.file);
          const img = await loadImg(url);
          URL.revokeObjectURL(url);
          srcCanvas = document.createElement('canvas');
          srcCanvas.width = img.naturalWidth;
          srcCanvas.height = img.naturalHeight;
          srcCanvas.getContext('2d')!.drawImage(img, 0, 0);
        } else {
          srcCanvas = await renderFirstPage(firstFile.file);
        }

        const container = previewCanvasRef.current.parentElement;
        const maxW = container ? container.clientWidth - 2 : 500;
        const maxH = 400;
        const scale = Math.min(maxW / srcCanvas.width, maxH / srcCanvas.height, 1);
        const pW = Math.round(srcCanvas.width * scale);
        const pH = Math.round(srcCanvas.height * scale);

        const canvas = previewCanvasRef.current;
        canvas.width = pW;
        canvas.height = pH;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(srcCanvas, 0, 0, pW, pH);

        // Scale opts for preview: font size is absolute px, needs scaling
        const previewOpts: WatermarkOptions = { ...opts, fontSize: opts.fontSize * scale };
        drawWatermarkOnCanvas(ctx, pW, pH, previewOpts, opts.type === 'image' ? logoImgEl : null);
      } catch {
        // Preview failed silently
      } finally {
        setPreviewBusy(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [files, opts, logoImgEl]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter((f) => isImageFile(f) || isPdfFile(f));
    if (!valid.length) return;
    setFiles((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        kind: isPdfFile(file) ? ('pdf' as const) : ('image' as const),
        status: 'idle' as const,
        resultBlob: null,
        error: null,
      })),
    ]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const applyAll = async () => {
    if (processing) return;
    setProcessing(true);

    for (const wf of files) {
      setFiles((prev) =>
        prev.map((f) => (f.id === wf.id ? { ...f, status: 'processing', error: null } : f)),
      );
      try {
        const resultBlob =
          wf.kind === 'pdf'
            ? await convertPdf(wf.file, 'pdf', opts)
            : await convertImage(wf.file, 'original', opts);

        setFiles((prev) =>
          prev.map((f) => (f.id === wf.id ? { ...f, status: 'done', resultBlob } : f)),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === wf.id
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Erreur' }
              : f,
          ),
        );
      }
    }

    setProcessing(false);
  };

  const downloadFile = (wf: WatermarkFile) => {
    if (wf.resultBlob) downloadBlob(wf.resultBlob, outputName(wf));
  };

  const downloadAll = async () => {
    const done = files.filter((f) => f.status === 'done' && f.resultBlob);
    if (!done.length) return;
    if (done.length === 1) {
      downloadBlob(done[0].resultBlob!, outputName(done[0]));
      return;
    }
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    for (const wf of done) zip.file(outputName(wf), wf.resultBlob!);
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'watermarked-files.zip');
  };

  const hasDone = files.some((f) => f.status === 'done');
  const hasPdf = files.some((f) => f.kind === 'pdf');
  const isIdle = !processing;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files here"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragOver
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
        }`}
      >
        <span className="text-3xl" aria-hidden>💧</span>
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
          Drop images or PDFs here — or{' '}
          <span className="text-brand-600 dark:text-brand-400 font-medium">browse</span>
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG, WebP, PDF — multiple files accepted</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((wf) => (
            <div
              key={wf.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
            >
              <span className="shrink-0 text-base" aria-hidden>
                {wf.kind === 'pdf' ? '📄' : '🖼️'}
              </span>
              <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200">{wf.file.name}</span>
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {formatBytes(wf.file.size)}
              </span>
              {wf.status === 'processing' && (
                <span className="shrink-0 text-xs text-brand-500 animate-pulse">Processing…</span>
              )}
              {wf.status === 'done' && (
                <button
                  onClick={() => downloadFile(wf)}
                  className="shrink-0 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  ⬇ Download
                </button>
              )}
              {wf.status === 'error' && (
                <span className="shrink-0 text-xs text-red-500" title={wf.error ?? undefined}>⚠ Erreur</span>
              )}
              {isIdle && (
                <button
                  onClick={() => removeFile(wf.id)}
                  aria-label={`Supprimer ${wf.file.name}`}
                  className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors rounded"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Config */}
          <div className="space-y-4">
            <WatermarkConfig opts={opts} onChange={setOpts} hasPdf={hasPdf} />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={applyAll}
                disabled={processing || files.length === 0}
                className="btn-primary"
              >
                {processing ? 'Applying…' : `💧 Apply to all files (${files.length})`}
              </button>
              {hasDone && (
                <button onClick={downloadAll} className="btn-success">
                  ⬇ Download all
                </button>
              )}
              {!processing && (
                <button
                  onClick={() => setFiles([])}
                  className="btn-ghost text-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Live preview {previewBusy && <span className="animate-pulse">…</span>}
              {files.length > 1 && (
                <span className="ml-1 normal-case font-normal">(first file)</span>
              )}
            </p>
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-checkerboard min-h-[120px] flex items-center justify-center">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full block"
                style={{ imageRendering: 'auto' }}
              />
              {files.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">Preview available once a file is added</p>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              The preview is an approximation — the final result is pixel-perfect for images, slightly different for PDFs (standard fonts).
            </p>
          </div>
        </div>
      )}

      {processing && (
        <div className="space-y-1">
          <ProgressBar
            value={
              files.length > 0
                ? (files.filter((f) => f.status === 'done' || f.status === 'error').length /
                    files.length) *
                  100
                : 0
            }
          />
        </div>
      )}
    </div>
  );
}
