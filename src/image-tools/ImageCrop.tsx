import { useState, useRef, useCallback, useEffect } from 'react';
import { downloadBlob } from '../utils/download';

interface Rect { x: number; y: number; w: number; h: number }

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif';

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export function ImageCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [status, setStatus] = useState<'idle' | 'done'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragging = useRef(false);
  const startPt = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rectRef = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [rect, setRect] = useState<Rect | null>(null);
  const animRef = useRef<number>(0);

  // cleanup URLs
  useEffect(() => () => {
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const r = rectRef.current;
    if (r.w !== 0 && r.h !== 0) {
      const x = Math.min(r.x, r.x + r.w);
      const y = Math.min(r.y, r.y + r.h);
      const w = Math.abs(r.w);
      const h = Math.abs(r.h);

      // Darken outside
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, y);
      ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
      ctx.fillRect(0, y, x, h);
      ctx.fillRect(x + w, y, canvas.width - x - w, h);

      // Selection border
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // Corner handles
      const hs = 8;
      ctx.fillStyle = '#60a5fa';
      for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]] as [number, number][]) {
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      }
    }
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clamp((clientX - rect.left) * scaleX, 0, canvas.width),
      y: clamp((clientY - rect.top) * scaleY, 0, canvas.height),
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    dragging.current = true;
    startPt.current = pos;
    rectRef.current = { x: pos.x, y: pos.y, w: 0, h: 0 };
    setRect(null);
    setStatus('idle');
    setResultUrl(null);
    setResultBlob(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const pos = getPos(e);
    rectRef.current = {
      x: startPt.current.x,
      y: startPt.current.y,
      w: pos.x - startPt.current.x,
      h: pos.y - startPt.current.y,
    };
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
  };

  const onMouseUp = () => {
    dragging.current = false;
    const r = rectRef.current;
    const normalized: Rect = {
      x: Math.round(Math.min(r.x, r.x + r.w)),
      y: Math.round(Math.min(r.y, r.y + r.h)),
      w: Math.round(Math.abs(r.w)),
      h: Math.round(Math.abs(r.h)),
    };
    if (normalized.w > 4 && normalized.h > 4) setRect(normalized);
    draw();
  };

  const loadFile = useCallback((f: File) => {
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(f);
    setRect(null);
    setStatus('idle');
    setResultUrl(null);
    setResultBlob(null);
    rectRef.current = { x: 0, y: 0, w: 0, h: 0 };

    const url = URL.createObjectURL(f);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      draw();
    };
    img.src = url;
  }, [imgSrc, resultUrl, draw]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('image/'));
    if (f) loadFile(f);
  }, [loadFile]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleCrop = async () => {
    if (!rect || !imgRef.current) return;
    const src = canvasRef.current!;
    const out = document.createElement('canvas');
    out.width = rect.w;
    out.height = rect.h;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, mime, 0.92));
    if (!blob) return;
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    const url = URL.createObjectURL(blob);
    setResultUrl(url);
    setResultBlob(blob);
    setStatus('done');
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const ext = format === 'jpeg' ? 'jpg' : format;
    downloadBlob(resultBlob, file.name.replace(/\.[^.]+$/, `-crop.${ext}`));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Image Crop</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Drag to select a crop area — 100% local, no upload
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl transition-colors ${
          file
            ? 'border-slate-200 dark:border-slate-700'
            : 'cursor-pointer hover:border-brand-300 dark:hover:border-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 border-slate-200 dark:border-slate-700'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
        />
        {file ? (
          <div className="p-3 flex items-center gap-2">
            <span className="text-slate-400 text-xs">{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="ml-auto text-xs text-brand-500 dark:text-brand-400 hover:underline shrink-0"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-3xl mb-2" aria-hidden>✂️</p>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drop an image here</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">JPG, PNG, WebP, GIF… or click to browse</p>
          </div>
        )}
      </div>

      {imgSrc && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click and drag on the image to select the crop area
          </p>

          {/* Canvas editor */}
          <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
            <canvas
              ref={canvasRef}
              className="block max-w-full cursor-crosshair"
              style={{ maxHeight: '420px', objectFit: 'contain' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>

          {rect && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Selection: {rect.w} × {rect.h} px at ({rect.x}, {rect.y})
            </p>
          )}

          {/* Format + action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Save as:</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            <button
              onClick={handleCrop}
              disabled={!rect}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✂️ Crop
            </button>

            {status === 'done' && resultBlob && (
              <button onClick={handleDownload} className="btn-success">
                ⬇ Download
              </button>
            )}
          </div>

          {/* Preview */}
          {status === 'done' && resultUrl && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Preview</p>
              <img
                src={resultUrl}
                alt="Cropped preview"
                className="max-w-full max-h-64 rounded-xl border border-slate-200 dark:border-slate-700 object-contain"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
