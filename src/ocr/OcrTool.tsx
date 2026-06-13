import { useState, useCallback, useRef, useEffect } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { downloadBlob } from '../utils/download';
import { recognizeImage, recognizePdf, OCR_LANGUAGES, type OcrLangCode, type OcrResult } from './ocr-engine';

const CONFIDENCE_WARN = 40;
const ACCEPT = 'image/*,.heic,.heif,.pdf';

// ── Image drop zone ────────────────────────────────────────────────────────────

function ImageDropZone({ onFile, file }: { onFile: (f: File) => void; file: File | null }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const pick = useCallback((list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const isPdf = f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf';
    const url = isPdf ? null : URL.createObjectURL(f);
    urlRef.current = url;
    setPreview(url);
    onFile(f);
  }, [onFile]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl transition-colors cursor-pointer ${
        dragging
          ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700/30'
      }`}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files)} />
      {file ? (
        <div className="p-3 flex items-center gap-3">
          {preview
            ? <img src={preview} alt="" aria-hidden className="h-16 w-24 object-cover rounded-lg shrink-0 border border-slate-100 dark:border-slate-700" />
            : <span className="text-4xl shrink-0 w-24 flex items-center justify-center" aria-hidden>📄</span>
          }
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
            <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">Click or drop to change</p>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-3xl mb-2" aria-hidden>🔍</p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drop an image or PDF here</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">JPG, PNG, WebP, HEIC, PDF… or click to browse</p>
        </div>
      )}
    </div>
  );
}

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn-ghost text-xs px-3 py-1.5"
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OcrTool() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<OcrLangCode>('fra');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState('');
  const [result, setResult] = useState<OcrResult | null>(null);
  const [editedText, setEditedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resultPreviewRef = useRef<string | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
  }, []);

  // Clipboard paste — pick first image item (not during active recognition)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (running) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable) return;
      const items = Array.from(e.clipboardData?.items ?? []).filter((i) => i.type.startsWith('image/'));
      if (!items.length) return;
      const raw = items[0].getAsFile();
      if (!raw) return;
      const ext = raw.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
      handleFile(new File([raw], `paste-${Date.now()}.${ext}`, { type: raw.type }));
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [running, handleFile]);

  const handleRun = useCallback(async () => {
    if (!file) return;
    setRunning(true);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusLabel('');

    if (resultPreviewRef.current) URL.revokeObjectURL(resultPreviewRef.current);
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const url = isPdf ? null : URL.createObjectURL(file);
    resultPreviewRef.current = url;
    setResultPreview(url);

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      const recognize = isPdf ? recognizePdf : recognizeImage;
      const r = await recognize(file, lang, ({ pct, status }) => {
        setProgress(pct);
        setStatusLabel(status);
      });
      setProgress(100);
      setResult(r);
      setEditedText(r.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR recognition failed');
      if (resultPreviewRef.current) {
        URL.revokeObjectURL(resultPreviewRef.current);
        resultPreviewRef.current = null;
        setResultPreview(null);
      }
    } finally {
      setRunning(false);
    }
  }, [file, lang]);

  useEffect(() => () => { if (resultPreviewRef.current) URL.revokeObjectURL(resultPreviewRef.current); }, []);

  const handleDownload = () => {
    const name = file ? file.name.replace(/\.[^.]+$/, '') + '.txt' : 'extraction.txt';
    downloadBlob(new Blob([editedText], { type: 'text/plain;charset=utf-8' }), name);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Text Extraction (OCR)</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Optical character recognition · 100% local · language model loaded on demand
        </p>
      </div>

      <ImageDropZone onFile={handleFile} file={file} />

      {/* Language selector */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0">Document language:</span>
        <div className="flex flex-wrap gap-1.5">
          {OCR_LANGUAGES.map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                lang === code
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400'
              }`}
            >
              <span aria-hidden>{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={!file || running}
        className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {running ? '⏳ Extracting…' : '⚡ Extract text'}
      </button>

      {/* Progress */}
      {running && (
        <div className="space-y-1.5">
          <ProgressBar value={progress} />
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>{statusLabel}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
          {error}
        </p>
      )}

      {/* Result panel */}
      {result && (
        <div className="space-y-3 pt-1">
          {/* Confidence warning */}
          {result.confidence < CONFIDENCE_WARN && (
            <div className="flex gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2.5 border border-amber-100 dark:border-amber-800/30">
              <span aria-hidden className="shrink-0 mt-px">⚠</span>
              <span>
                <strong>Low confidence: {result.confidence}%</strong> — the image appears to be poor quality.
                Try a sharper image with better contrast or higher resolution.
              </span>
            </div>
          )}

          {/* Two-column layout: image preview | extracted text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">

            {/* Image preview */}
            {resultPreview && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Source image
                </p>
                <img
                  src={resultPreview}
                  alt="Source image"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 object-contain max-h-72"
                />
              </div>
            )}

            {/* Extracted text */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Extracted text
                </p>
                {result.confidence >= CONFIDENCE_WARN && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Confidence {result.confidence}%
                  </span>
                )}
              </div>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={10}
                spellCheck={false}
                className="w-full text-sm font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 resize-y focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500 leading-relaxed"
                placeholder="Extracted text will appear here…"
              />
              {editedText && (
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={editedText} />
                  <button onClick={handleDownload} className="btn-ghost text-xs px-3 py-1.5">
                    ⬇ Download .txt
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
