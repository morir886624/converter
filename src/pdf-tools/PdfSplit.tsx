import { useState, useRef, useCallback } from 'react';
import { parsePageRanges, type PageRange } from './parsePageRanges';
import { usePdfThumbnail } from './usePdfThumbnail';
import { downloadBlob, formatBytes } from '../utils/download';

async function splitPdf(file: File, ranges: PageRange[]): Promise<{ label: string; blob: Blob }[]> {
  const { PDFDocument } = await import('pdf-lib');
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf);
  const results: { label: string; blob: Blob }[] = [];
  for (const range of ranges) {
    const dest = await PDFDocument.create();
    const indices: number[] = [];
    for (let p = range.start; p <= range.end; p++) indices.push(p - 1);
    const pages = await dest.copyPages(src, indices);
    pages.forEach((page) => dest.addPage(page));
    const bytes = await dest.save();
    results.push({ label: range.label, blob: new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }) });
  }
  return results;
}

async function getPageCount(file: File): Promise<number> {
  const { PDFDocument } = await import('pdf-lib');
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  return doc.getPageCount();
}

export function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [rangeInput, setRangeInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'splitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const thumb = usePdfThumbnail(file, 0.35);

  const loadFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') return;
    setFile(f);
    setStatus('idle');
    setError(null);
    setRangeInput('');
    try {
      const n = await getPageCount(f);
      setPageCount(n);
    } catch {
      setPageCount(null);
    }
  }, []);

  const handleSplit = async () => {
    if (!file || !rangeInput.trim()) return;
    const ranges = parsePageRanges(rangeInput, pageCount ?? Infinity);
    if (!ranges.length) {
      setError('No valid ranges. Example: 1-3, 5, 8-10');
      return;
    }
    setStatus('splitting');
    setError(null);
    try {
      const results = await splitPdf(file, ranges);
      if (results.length === 1) {
        downloadBlob(results[0].blob, `${file.name.replace(/\.pdf$/i, '')}-${results[0].label}.pdf`);
      } else {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (const r of results) {
          zip.file(`${r.label}.pdf`, await r.blob.arrayBuffer());
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${file.name.replace(/\.pdf$/i, '')}-split.zip`);
      }
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-4">
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
          <span className="text-3xl" aria-hidden>✂️</span>
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
            <p className="text-xs text-slate-400">
              {formatBytes(file.size)}{pageCount != null ? ` · ${pageCount} page${pageCount > 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <button
            onClick={() => { setFile(null); setPageCount(null); setStatus('idle'); setError(null); }}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 rounded transition-colors"
            aria-label="Remove"
          >
            ✕
          </button>
        </div>
      )}

      {file && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Page ranges
            </label>
            <input
              type="text"
              placeholder={pageCount ? `e.g. 1-3, 5, 8-${pageCount}` : 'e.g. 1-3, 5, 8-10'}
              value={rangeInput}
              onChange={(e) => { setRangeInput(e.target.value); setStatus('idle'); setError(null); }}
              className="select-field w-full font-mono text-sm"
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Separate ranges with commas. Each range generates a separate PDF.
            </p>
          </div>

          {rangeInput && pageCount && (
            <div className="flex flex-wrap gap-1.5">
              {parsePageRanges(rangeInput, pageCount).map((r) => (
                <span key={r.label} className="text-xs px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-medium">
                  {r.label}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={handleSplit}
            disabled={!rangeInput.trim() || status === 'splitting'}
            className="btn-primary"
          >
            {status === 'splitting' ? 'Splitting…' : '✂️ Split'}
          </button>
        </div>
      )}

      {status === 'done' && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ Download started.</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
