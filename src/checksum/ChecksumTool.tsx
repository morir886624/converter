import { useState, useEffect, useRef, useCallback } from 'react';
import { formatBytes } from '../utils/download';
import { ProgressBar } from '../components/ProgressBar';
import { computeChecksums, type ChecksumResult } from './checksumCalculator';

const SIZE_WARNING = 500 * 1024 * 1024; // 500 MB

// ── Local drop zone (accepts any file type) ──────────────────────────────────

function AnyFileDropZone({ onFile, file }: { onFile: (f: File) => void; file: File | null }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (list: FileList | null) => {
    const f = list?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
        dragging
          ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700/30'
      }`}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => pick(e.target.files)} />
      {file ? (
        <div className="text-sm text-slate-700 dark:text-slate-200">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatBytes(file.size)}</p>
          <p className="text-xs text-brand-500 dark:text-brand-400 mt-1">Click or drop to change</p>
        </div>
      ) : (
        <>
          <p className="text-3xl mb-2" aria-hidden>🔐</p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drop any file here</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">All file types — or click to browse</p>
        </>
      )}
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ── Hash row ──────────────────────────────────────────────────────────────────

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 min-w-0 font-mono text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 truncate"
          onFocus={(e) => e.target.select()}
        />
        <CopyButton text={value} />
      </div>
    </div>
  );
}

// ── Compare field ─────────────────────────────────────────────────────────────

function CompareField({ result }: { result: ChecksumResult }) {
  const [value, setValue] = useState('');

  const trimmed = value.trim().toLowerCase();
  const verdict = trimmed
    ? trimmed === result.md5
      ? { match: true, algo: 'MD5' }
      : trimmed === result.sha1
      ? { match: true, algo: 'SHA-1' }
      : trimmed === result.sha256
      ? { match: true, algo: 'SHA-256' }
      : { match: false, algo: null }
    : null;

  return (
    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        Compare with reference hash
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste expected hash here…"
        className="w-full font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500"
      />
      {verdict && (
        <div
          className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ${
            verdict.match
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}
        >
          <span aria-hidden>{verdict.match ? '✓' : '✗'}</span>
          {verdict.match
            ? `Matches ${verdict.algo}`
            : 'No match — hash differs'}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialFile?: File | null;
}

export function ChecksumTool({ initialFile }: Props) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [progress, setProgress] = useState(0);
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<ChecksumResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runComputation = useCallback(async (f: File) => {
    setResult(null);
    setError(null);
    setProgress(0);
    setComputing(true);
    try {
      const r = await computeChecksums(f, setProgress);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Computation failed');
    } finally {
      setComputing(false);
    }
  }, []);

  // Auto-compute when a new file arrives from the converter prop
  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      runComputation(initialFile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    runComputation(f);
  }, [runComputation]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Verify integrity (checksum)</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">MD5 · SHA-1 · SHA-256 — computed locally, never uploaded</p>
      </div>

      <AnyFileDropZone onFile={handleFile} file={file} />

      {file && file.size > SIZE_WARNING && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-100 dark:border-amber-800/30">
          ⚠ Large file ({formatBytes(file.size)}) — the entire file must be read into memory. This may take a moment.
        </p>
      )}

      {computing && (
        <div className="space-y-1">
          <ProgressBar value={progress} />
          <p className="text-right text-xs text-slate-400 dark:text-slate-500">{progress}%</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <HashRow label="MD5" value={result.md5} />
          <HashRow label="SHA-1" value={result.sha1} />
          <HashRow label="SHA-256" value={result.sha256} />
          <CompareField result={result} />
        </div>
      )}
    </div>
  );
}
