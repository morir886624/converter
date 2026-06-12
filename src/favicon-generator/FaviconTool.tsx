import { useState, useEffect, useRef, useCallback } from 'react';
import { downloadBlob } from '../utils/download';
import { ToolDropZone } from '../image-tools/ToolDropZone';
import {
  rasterizeSource,
  generateFaviconPack,
  ALL_SIZES,
  type ManifestMeta,
  type FaviconPackResult,
} from './faviconGenerator';

const DEFAULT_META: ManifestMeta = {
  name: '',
  shortName: '',
  themeColor: '#ffffff',
  backgroundColor: '#ffffff',
};

type DragState = { startX: number; startY: number; initCropX: number; initCropY: number };

export function FaviconGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropSize, setCropSize] = useState(0);

  const [meta, setMeta] = useState<ManifestMeta>(DEFAULT_META);
  const [result, setResult] = useState<FaviconPackResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const isSquare = sourceCanvas != null && sourceCanvas.width === sourceCanvas.height;

  // Revoke preview URLs when result changes or component unmounts
  useEffect(() => {
    return () => {
      if (result) {
        for (const p of result.previews) URL.revokeObjectURL(p.url);
      }
    };
  }, [result]);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setSourceCanvas(null);
    setResult(null);
    setLoadError(null);
    setLoading(true);
    try {
      const canvas = await rasterizeSource(f);
      const size = Math.min(canvas.width, canvas.height);
      setSourceCanvas(canvas);
      setCropSize(size);
      setCropX(Math.floor((canvas.width - size) / 2));
      setCropY(Math.floor((canvas.height - size) / 2));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load image');
    } finally {
      setLoading(false);
    }
  }, []);

  // Draw crop preview on canvas
  useEffect(() => {
    if (!sourceCanvas || !cropCanvasRef.current || cropSize === 0) return;
    const el = cropCanvasRef.current;
    const maxW = el.parentElement?.clientWidth ?? 480;
    const scale = Math.min(maxW / sourceCanvas.width, 280 / sourceCanvas.height, 1);
    el.width = Math.round(sourceCanvas.width * scale);
    el.height = Math.round(sourceCanvas.height * scale);
    const ctx = el.getContext('2d')!;

    ctx.drawImage(sourceCanvas, 0, 0, el.width, el.height);

    if (!isSquare) {
      // Darken non-crop area
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, el.width, el.height);

      // Reveal crop area
      const sx = Math.round(cropX * scale);
      const sy = Math.round(cropY * scale);
      const ss = Math.round(cropSize * scale);
      ctx.drawImage(sourceCanvas, cropX, cropY, cropSize, cropSize, sx, sy, ss, ss);

      // Crop border
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, ss - 2, ss - 2);
    }
  }, [sourceCanvas, cropX, cropY, cropSize, isSquare]);

  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropCanvasRef.current || !sourceCanvas) return;
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const cssToSrc = sourceCanvas.width / rect.width;
    dragStateRef.current = {
      startX: (e.clientX - rect.left) * cssToSrc,
      startY: (e.clientY - rect.top) * cssToSrc,
      initCropX: cropX,
      initCropY: cropY,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds || !sourceCanvas) return;
      const el = cropCanvasRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cssToSrc = sourceCanvas.width / rect.width;
      const curX = (e.clientX - rect.left) * cssToSrc;
      const curY = (e.clientY - rect.top) * cssToSrc;
      setCropX(Math.round(Math.max(0, Math.min(sourceCanvas.width - cropSize, ds.initCropX + curX - ds.startX))));
      setCropY(Math.round(Math.max(0, Math.min(sourceCanvas.height - cropSize, ds.initCropY + curY - ds.startY))));
    };
    const onUp = () => { dragStateRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [sourceCanvas, cropSize]);

  const generate = async () => {
    if (!sourceCanvas) return;
    setGenerating(true);
    setGenError(null);
    if (result) {
      for (const p of result.previews) URL.revokeObjectURL(p.url);
      setResult(null);
    }
    try {
      const r = await generateFaviconPack(sourceCanvas, cropX, cropY, cropSize, meta);
      setResult(r);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const copyHtml = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.htmlSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <ToolDropZone
        file={file}
        onFile={handleFile}
        accept="image/jpeg,image/png,image/webp,image/svg+xml,.svg"
        acceptLabel="PNG, JPG, WebP, SVG — ideally 512×512 or larger"
        icon="🖼️"
        disabled={loading || generating}
      />

      {loading && (
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 animate-pulse">Loading…</p>
      )}

      {loadError && (
        <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
          {loadError}
        </p>
      )}

      {/* Crop / source preview */}
      {sourceCanvas && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {isSquare
              ? `Source — ${sourceCanvas.width}×${sourceCanvas.height} px (square, no crop needed)`
              : `Crop — ${sourceCanvas.width}×${sourceCanvas.height} px — drag the selection`}
          </p>
          <div
            className={`rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 ${
              !isSquare ? 'cursor-move' : ''
            }`}
          >
            <canvas
              ref={cropCanvasRef}
              className="w-full block"
              style={{ touchAction: 'none', userSelect: 'none' }}
              onMouseDown={!isSquare ? handleCropMouseDown : undefined}
            />
          </div>
        </div>
      )}

      {/* Manifest metadata */}
      {sourceCanvas && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Web App Manifest
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">App name</label>
              <input
                type="text"
                placeholder="My App"
                value={meta.name}
                onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
                className="select-field-sm w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">Short name</label>
              <input
                type="text"
                placeholder="App"
                value={meta.shortName}
                onChange={(e) => setMeta((m) => ({ ...m, shortName: e.target.value }))}
                className="select-field-sm w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">Theme color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={meta.themeColor}
                  onChange={(e) => setMeta((m) => ({ ...m, themeColor: e.target.value }))}
                  className="w-8 h-8 rounded border border-slate-200 dark:border-slate-600 cursor-pointer p-0.5 bg-white dark:bg-slate-700"
                />
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{meta.themeColor}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500 dark:text-slate-400">Background color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={meta.backgroundColor}
                  onChange={(e) => setMeta((m) => ({ ...m, backgroundColor: e.target.value }))}
                  className="w-8 h-8 rounded border border-slate-200 dark:border-slate-600 cursor-pointer p-0.5 bg-white dark:bg-slate-700"
                />
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{meta.backgroundColor}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate */}
      {sourceCanvas && (
        <button onClick={generate} disabled={generating} className="btn-primary">
          {generating ? 'Generating…' : '✨ Generate favicon pack'}
        </button>
      )}

      {genError && (
        <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
          {genError}
        </p>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Icon preview grid */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Generated icons
            </p>
            <div className="flex flex-wrap gap-4 items-end">
              {result.previews.map(({ size, filename, url }) => {
                const displaySize = Math.min(size, 80);
                return (
                  <div key={size} className="flex flex-col items-center gap-1">
                    <div
                      className="flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-checkerboard"
                      style={{ width: displaySize, height: displaySize }}
                    >
                      <img
                        src={url}
                        alt={filename}
                        width={displaySize}
                        height={displaySize}
                        style={{ imageRendering: size <= 32 ? 'pixelated' : 'auto' }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{size}×{size}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-600 truncate max-w-[84px] text-center">{filename}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              + <code className="font-mono">favicon.ico</code> (16/32/48 multi-res) and <code className="font-mono">site.webmanifest</code> are included in the ZIP.
            </p>
          </div>

          {/* HTML snippet */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Paste in your &lt;head&gt;
            </p>
            <div className="relative">
              <pre className="text-xs bg-slate-800 dark:bg-slate-900 text-slate-200 rounded-xl p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                {result.htmlSnippet}
              </pre>
              <button
                onClick={copyHtml}
                className="absolute top-2 right-2 text-xs px-2.5 py-1 rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition-colors font-medium"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Download */}
          <button
            onClick={() => downloadBlob(result.zipBlob, 'favicon-pack.zip')}
            className="btn-success"
          >
            ⬇ Download complete pack (ZIP)
          </button>
        </>
      )}
    </div>
  );
}
