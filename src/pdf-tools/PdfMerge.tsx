import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePdfThumbnail } from './usePdfThumbnail';
import { formatBytes, downloadBlob } from '../utils/download';

interface PdfEntry {
  id: string;
  file: File;
}

function SortableItem({ entry, onRemove }: { entry: PdfEntry; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const thumb = usePdfThumbnail(entry.file, 0.3);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
        isDragging
          ? 'opacity-40 border-brand-400 bg-brand-50 dark:bg-brand-900/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}
    >
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        className="shrink-0 px-1.5 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
        aria-label="Reorder"
        tabIndex={0}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </button>

      {/* Thumbnail */}
      <div className="w-9 h-12 shrink-0 rounded overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
          : <span className="text-[10px] text-slate-400 font-mono">PDF</span>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{entry.file.name}</p>
        <p className="text-xs text-slate-400">{formatBytes(entry.file.size)}</p>
      </div>

      <button
        onClick={onRemove}
        aria-label={`Remove ${entry.file.name}`}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

async function mergePdfs(files: File[]): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const merged = await PDFDocument.create();
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const src = await PDFDocument.load(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const bytes = await merged.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

export function PdfMerge() {
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'merging' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const pdfs = Array.from(newFiles).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) return;
    setEntries((prev) => [
      ...prev,
      ...pdfs.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
    setStatus('idle');
  }, []);

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setStatus('idle');
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      setEntries((prev) => {
        const oldIdx = prev.findIndex((e) => e.id === active.id);
        const newIdx = prev.findIndex((e) => e.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleMerge = async () => {
    if (entries.length < 2) return;
    setStatus('merging');
    setError(null);
    try {
      const blob = await mergePdfs(entries.map((e) => e.file));
      downloadBlob(blob, 'merged.pdf');
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop PDFs here"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragOver
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
        }`}
      >
        <span className="text-3xl" aria-hidden>📎</span>
        <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
          Drop PDF files here or <span className="text-brand-600 dark:text-brand-400 font-medium">browse</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
        />
      </div>

      {entries.length > 0 && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Drag (⠿) to reorder · {entries.length} file{entries.length > 1 ? 's' : ''}
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <SortableItem
                    key={entry.id}
                    entry={entry}
                    onRemove={() => removeEntry(entry.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleMerge}
              disabled={entries.length < 2 || status === 'merging'}
              className="btn-primary"
            >
              {status === 'merging' ? 'Merging…' : '🔗 Merge into one PDF'}
            </button>
            <button onClick={() => { setEntries([]); setStatus('idle'); }} className="btn-ghost text-sm">
              Clear all
            </button>
          </div>

          {entries.length < 2 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Add at least 2 PDFs to merge.
            </p>
          )}
        </>
      )}

      {status === 'done' && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ Download started.</p>
      )}
      {status === 'error' && error && (
        <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
      )}
    </div>
  );
}
