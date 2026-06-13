import { useState, useCallback, useRef } from 'react';
import type { HistoryEntry, FileCategory } from '../types';
import { downloadBlob } from '../utils/download';

export function useHistory() {
  const [entries, setEntriesState] = useState<HistoryEntry[]>([]);
  const entriesRef = useRef<HistoryEntry[]>([]);

  const setEntries = useCallback((updater: (prev: HistoryEntry[]) => HistoryEntry[]) => {
    setEntriesState((prev) => {
      const next = updater(prev);
      entriesRef.current = next;
      return next;
    });
  }, []);

  const addSuccess = useCallback(
    (
      file: File,
      inputExt: string,
      outputFormat: string,
      outputFileName: string,
      category: FileCategory,
      blob: Blob,
    ) => {
      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          fileName: file.name,
          outputFileName,
          inputFormat: inputExt,
          outputFormat,
          inputSize: file.size,
          outputSize: blob.size,
          category,
          timestamp: Date.now(),
          status: 'success',
          blob,
        },
        ...prev,
      ]);
    },
    [setEntries],
  );

  const addFailure = useCallback(
    (
      file: File,
      inputExt: string,
      outputFormat: string,
      outputFileName: string,
      category: FileCategory,
      error: string,
    ) => {
      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          fileName: file.name,
          outputFileName,
          inputFormat: inputExt,
          outputFormat,
          inputSize: file.size,
          outputSize: null,
          category,
          timestamp: Date.now(),
          status: 'error',
          error,
          blob: null,
        },
        ...prev,
      ]);
    },
    [setEntries],
  );

  const removeEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [setEntries],
  );

  const clearAll = useCallback(() => {
    setEntries(() => []);
  }, [setEntries]);

  const downloadEntry = useCallback((id: string) => {
    const entry = entriesRef.current.find((e) => e.id === id);
    if (!entry?.blob) return;
    downloadBlob(entry.blob, entry.outputFileName);
  }, []);

  const downloadAllZip = useCallback(async () => {
    const successes = entriesRef.current.filter((e) => e.status === 'success' && e.blob);
    if (successes.length === 0) return;
    if (successes.length === 1) {
      downloadBlob(successes[0].blob!, successes[0].outputFileName);
      return;
    }
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const seen = new Map<string, number>();
    for (const e of successes) {
      const base = e.outputFileName;
      const count = seen.get(base);
      if (count === undefined) {
        seen.set(base, 1);
        zip.file(base, e.blob!);
      } else {
        seen.set(base, count + 1);
        const dot = base.lastIndexOf('.');
        const stem = dot >= 0 ? base.slice(0, dot) : base;
        const ext = dot >= 0 ? base.slice(dot) : '';
        zip.file(`${stem} (${count + 1})${ext}`, e.blob!);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'history.zip');
  }, []);

  const totalSize = entries.reduce((sum, e) => sum + (e.blob?.size ?? 0), 0);

  return {
    entries,
    totalSize,
    addSuccess,
    addFailure,
    removeEntry,
    clearAll,
    downloadEntry,
    downloadAllZip,
  };
}
