import { useState, useRef, useCallback, useEffect } from 'react';
import { downloadBlob } from '../utils/download';

type SubTab = 'generate' | 'scan';

// ── QR Generate ───────────────────────────────────────────────────────────────

function QrGenerate() {
  const [text, setText] = useState('');
  const [size, setSize] = useState(256);
  const [dark, setDark] = useState('#000000');
  const [light, setLight] = useState('#ffffff');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = useCallback(async () => {
    if (!text.trim()) return;
    setError(null);
    try {
      const QRCode = (await import('qrcode')).default;
      const canvas = canvasRef.current!;
      await QRCode.toCanvas(canvas, text.trim(), {
        width: size,
        margin: 2,
        color: { dark, light },
      });
      setDataUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setDataUrl(null);
    }
  }, [text, size, dark, light]);

  // Regenerate on option changes if text is already set
  useEffect(() => { if (text.trim()) generate(); }, [size, dark, light]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'qrcode.png');
    });
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } catch {
        // Clipboard API not available — silent fail
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
          Text or URL to encode
        </label>
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="https://example.com or any text…"
            className="flex-1 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500 leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Size</label>
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {[128, 256, 512, 1024].map((s) => (
              <option key={s} value={s}>{s} × {s} px</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 dark:text-slate-300">Dark</label>
          <input type="color" value={dark} onChange={(e) => setDark(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-slate-200 dark:border-slate-600 p-0.5 bg-white dark:bg-slate-800" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 dark:text-slate-300">Light</label>
          <input type="color" value={light} onChange={(e) => setLight(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-slate-200 dark:border-slate-600 p-0.5 bg-white dark:bg-slate-800" />
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!text.trim()}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ⚡ Generate QR code
      </button>

      {error && (
        <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
          {error}
        </p>
      )}

      {/* Hidden canvas used for rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {dataUrl && (
        <div className="space-y-3">
          <img
            src={dataUrl}
            alt="Generated QR code"
            className="rounded-xl border border-slate-200 dark:border-slate-700"
            style={{ imageRendering: 'pixelated', width: Math.min(size, 256), height: Math.min(size, 256) }}
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={handleDownload} className="btn-success text-sm">
              ⬇ Download PNG
            </button>
            <button onClick={handleCopy} className="btn-ghost text-xs px-3 py-1.5">
              📋 Copy image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── QR Scan ───────────────────────────────────────────────────────────────────

function QrScan() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const scan = useCallback(async (f: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(f);
    urlRef.current = url;
    setFile(f);
    setImgUrl(url);
    setResult(null);
    setError(null);

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsQR = (await import('jsqr')).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setResult(code.data);
      } else {
        setError('No QR code detected in this image. Make sure the QR code is clearly visible.');
      }
    };
    img.onerror = () => setError('Could not load image.');
    img.src = url;
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
    if (!item) return;
    const f = item.getAsFile();
    if (f) scan(f);
  }, [scan]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isUrl = result && /^https?:\/\//i.test(result);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('image/'));
          if (f) scan(f);
        }}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-2xl cursor-pointer hover:border-brand-300 dark:hover:border-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 border-slate-200 dark:border-slate-700 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) scan(f); }}
        />
        {file && imgUrl ? (
          <div className="p-3 flex items-center gap-3">
            <img src={imgUrl} alt="" aria-hidden className="h-16 w-16 object-contain rounded border border-slate-100 dark:border-slate-700 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
              <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">Click or drop to change</p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-3xl mb-2" aria-hidden>📷</p>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drop a QR code image here</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">or click to browse · also Ctrl+V to paste</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-100 dark:border-amber-800/30">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Decoded content</p>
            <button onClick={handleCopy} className="btn-ghost text-xs px-3 py-1.5">
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl px-4 py-3">
            <p className="text-sm font-mono text-slate-800 dark:text-slate-100 break-all">{result}</p>
          </div>
          {isUrl && (
            <a
              href={result}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              🔗 Open link
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

export function QrTool() {
  const [tab, setTab] = useState<SubTab>('generate');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">QR Code</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Generate or scan QR codes — 100% local, works offline
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg self-start w-fit">
        {(['generate', 'scan'] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t === 'generate' ? '⚡ Generate' : '🔍 Scan'}
          </button>
        ))}
      </div>

      {tab === 'generate' ? <QrGenerate /> : <QrScan />}
    </div>
  );
}
