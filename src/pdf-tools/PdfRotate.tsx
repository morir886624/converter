import { useState, useRef, useCallback } from 'react';
import { usePdfThumbnail } from './usePdfThumbnail';
import { downloadBlob, formatBytes } from '../utils/download';
import { ProgressBar } from '../components/ProgressBar';

type Angle = 0 | 90 | 180 | 270;

interface PageEntry {
  index: number; // 0-based
  rotation: Angle;
  selected: boolean;
}

async function rotatePdf(file: File, pages: PageEntry[]): Promise<Blob> {
  const { PDFDocument, degrees } = await import('pdf-lib');
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  for (const entry of pages) {
    const page = doc.getPage(entry.index);
    const current = page.getRotation().angle as Angle;
    const total = ((current + entry.rotation) % 360) as Angle;
    page.setRotation(degrees(total));
  }
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

function DropZone({ onFile, file }: { onFile: (f: File) => void; file: File | null }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const thumb = usePdfThumbnail(file, 0.35);

  const pick = (list: FileList | null) => {
    const f = Array.from(list ?? []).find((x) => x.type === 'application/pdf' || x.name.endsWith('.pdf'));
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
        over
          ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-slate-50 dark:hover:bg-slate-700/30'
      }`}
    >
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => pick(e.target.files)} />
      {file ? (
        <div className="p-3 flex items-center gap-3">
          {thumb
            ? <img src={thumb} alt="" aria-hidden className="h-16 w-14 object-cover rounded border border-slate-100 dark:border-slate-700 shrink-0" />
            : <span className="text-3xl shrink-0 w-14 flex items-center justify-center" aria-hidden>📄</span>
          }
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{formatBytes(file.size)}</p>
            <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">Click or drop to change</p>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-3xl mb-2" aria-hidden>🔄</p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Drop a PDF here</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">or click to browse</p>
        </div>
      )}
    </div>
  );
}

const ANGLES: Angle[] = [90, 180, 270];
const ANGLE_LABEL: Record<Angle, string> = { 0: '0°', 90: '90° ↻', 180: '180°', 270: '90° ↺' };

export function PdfRotate() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<PageEntry[]>([]);
  const [globalAngle, setGlobalAngle] = useState<Angle>(90);
  const [status, setStatus] = useState<'idle' | 'rotating' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setStatus('idle');
    setResultBlob(null);
    setError(null);
    const { PDFDocument } = await import('pdf-lib');
    const buf = await f.arrayBuffer();
    const doc = await PDFDocument.load(buf);
    const n = doc.getPageCount();
    setPageCount(n);
    setPages(Array.from({ length: n }, (_, i) => ({ index: i, rotation: 90, selected: true })));
  }, []);

  const togglePage = (i: number) =>
    setPages((prev) => prev.map((p) => p.index === i ? { ...p, selected: !p.selected } : p));

  const setPageAngle = (i: number, angle: Angle) =>
    setPages((prev) => prev.map((p) => p.index === i ? { ...p, rotation: angle } : p));

  const applyGlobal = () =>
    setPages((prev) => prev.map((p) => p.selected ? { ...p, rotation: globalAngle } : p));

  const selectAll = (v: boolean) =>
    setPages((prev) => prev.map((p) => ({ ...p, selected: v })));

  const handleRotate = async () => {
    if (!file) return;
    const toRotate = pages.filter((p) => p.selected);
    if (toRotate.length === 0) return;
    setStatus('rotating');
    setProgress(20);
    setError(null);
    try {
      const blob = await rotatePdf(file, toRotate);
      setProgress(100);
      setResultBlob(blob);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rotation failed');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, file.name.replace(/\.pdf$/i, '-rotated.pdf'));
  };

  const allSelected = pages.length > 0 && pages.every((p) => p.selected);
  const noneSelected = pages.every((p) => !p.selected);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Rotate PDF pages</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Select pages and rotation angle — 100% local, no upload
        </p>
      </div>

      <DropZone onFile={handleFile} file={file} />

      {pages.length > 0 && (
        <>
          {/* Global controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => selectAll(!allSelected)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-400 transition-colors"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Apply to selected:</span>
              <select
                value={globalAngle}
                onChange={(e) => setGlobalAngle(Number(e.target.value) as Angle)}
                className="text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {ANGLES.map((a) => <option key={a} value={a}>{ANGLE_LABEL[a]}</option>)}
              </select>
              <button
                onClick={applyGlobal}
                className="text-xs px-3 py-1.5 rounded-lg border border-brand-400 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Page grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
            {pages.map((p) => (
              <div
                key={p.index}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 cursor-pointer transition-colors select-none ${
                  p.selected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
                onClick={() => togglePage(p.index)}
              >
                <span className="text-lg" aria-hidden>📄</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">p.{p.index + 1}</span>
                <select
                  value={p.rotation}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setPageAngle(p.index, Number(e.target.value) as Angle)}
                  className="w-full text-[10px] rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
                >
                  {ANGLES.map((a) => <option key={a} value={a}>{ANGLE_LABEL[a]}</option>)}
                </select>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            {pages.filter((p) => p.selected).length} / {pageCount} page{pageCount > 1 ? 's' : ''} selected
          </p>

          {status === 'rotating' && (
            <div className="space-y-1">
              <ProgressBar value={progress} />
              <p className="text-xs text-slate-400 dark:text-slate-500">Rotating…</p>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRotate}
              disabled={status === 'rotating' || noneSelected}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'rotating' ? '⏳ Rotating…' : '🔄 Rotate pages'}
            </button>
            {status === 'done' && resultBlob && (
              <button onClick={handleDownload} className="btn-success">
                ⬇ Download rotated PDF
              </button>
            )}
          </div>

          {status === 'done' && resultBlob && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Done — {formatBytes(resultBlob.size)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
