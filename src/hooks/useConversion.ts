import { useState, useCallback, useRef, useEffect } from 'react';
import type { FileItem, ConversionOptions, FileCategory } from '../types';
import { detectFile } from '../utils/fileDetection';
import { getOutputFormats, convert } from '../converters/registry';
import { downloadBlob, replaceExtension } from '../utils/download';
import { applyFilenamePattern, getBaseName, getOutputExt, todayIso } from '../utils/filenamePattern';
import { trackConversionStarted, trackConversionSuccess, trackConversionError } from '../utils/analytics';

type SuccessCb = (
  file: File, inputExt: string, outputFormat: string,
  outputFileName: string, category: FileCategory, blob: Blob,
) => void;

type FailureCb = (
  file: File, inputExt: string, outputFormat: string,
  outputFileName: string, category: FileCategory, error: string,
) => void;

interface UseConversionCallbacks {
  onSuccess?: SuccessCb;
  onFailure?: FailureCb;
}

function makePreviewUrl(file: File): string | null {
  if (detectFile(file).category === 'image') return URL.createObjectURL(file);
  return null;
}

export function useConversion(callbacks?: UseConversionCallbacks) {
  const [files, setFilesState] = useState<FileItem[]>([]);
  // Keep a ref in sync so async callbacks always read fresh state
  const filesRef = useRef<FileItem[]>([]);
  // Map of active AbortControllers keyed by file id
  const abortMap = useRef<Map<string, AbortController>>(new Map());

  // Stable refs for history callbacks — updated each render, never in deps
  const onSuccessRef = useRef<SuccessCb | undefined>(undefined);
  const onFailureRef = useRef<FailureCb | undefined>(undefined);
  useEffect(() => { onSuccessRef.current = callbacks?.onSuccess; });
  useEffect(() => { onFailureRef.current = callbacks?.onFailure; });

  const setFiles = useCallback((updater: (prev: FileItem[]) => FileItem[]) => {
    setFilesState((prev) => {
      const next = updater(prev);
      filesRef.current = next;
      return next;
    });
  }, []);

  const addFiles = useCallback(async (newFiles: File[], preferredFormat?: string) => {
    const items = await Promise.all(
      newFiles.map(async (file): Promise<FileItem> => {
        const { category, extension } = detectFile(file);
        const availableFormats = await getOutputFormats(extension);
        const targetFormat =
          preferredFormat && availableFormats.includes(preferredFormat)
            ? preferredFormat
            : (availableFormats[0] ?? null);
        return {
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          category,
          extension,
          availableFormats,
          targetFormat,
          options: { quality: 90, bitrate: '128k', delimiter: ',' },
          status: 'idle',
          progress: 0,
          result: null,
          error: null,
          previewUrl: makePreviewUrl(file),
          resultPreviewUrl: null,
        };
      }),
    );
    setFiles((prev) => [...prev, ...items]);
  }, [setFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (item?.resultPreviewUrl) URL.revokeObjectURL(item.resultPreviewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, [setFiles]);

  const cancelFile = useCallback((id: string) => {
    abortMap.current.get(id)?.abort();
    abortMap.current.delete(id);
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id && f.status === 'converting'
          ? { ...f, status: 'cancelled' as const, progress: 0, error: null }
          : f,
      ),
    );
  }, [setFiles]);

  const convertFile = useCallback(async (id: string) => {
    // Mark as converting first
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id && f.targetFormat
          ? { ...f, status: 'converting' as const, progress: 0, error: null }
          : f,
      ),
    );

    // Read current state from ref (always up-to-date after setFiles above)
    const item = filesRef.current.find((f) => f.id === id);
    if (!item?.targetFormat) return;

    const { file, extension, targetFormat, options, category } = item;
    const outputFileName = replaceExtension(file.name, targetFormat);
    const recordable = targetFormat !== 'extract';

    const ctrl = new AbortController();
    abortMap.current.set(id, ctrl);

    trackConversionStarted(extension, targetFormat);
    try {
      const result = await convert(
        file, extension, targetFormat, options,
        (pct) => setFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress: pct } : f)),
        ctrl.signal,
      );
      const resultPreviewUrl =
        (detectFile(file).category === 'image' && targetFormat !== 'pdf') ||
        result.type.startsWith('image/')
          ? URL.createObjectURL(result)
          : null;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'done', progress: 100, result, resultPreviewUrl } : f,
        ),
      );
      trackConversionSuccess(extension, targetFormat);
      if (recordable) onSuccessRef.current?.(file, extension, targetFormat, outputFileName, category, result);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // already handled by cancelFile
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'error', error: errMsg }
            : f,
        ),
      );
      trackConversionError(extension, targetFormat);
      if (recordable) onFailureRef.current?.(file, extension, targetFormat, outputFileName, category, errMsg);
    } finally {
      abortMap.current.delete(id);
    }
  }, [setFiles]);

  const convertAll = useCallback(async () => {
    const pending = filesRef.current.filter((f) => f.status === 'idle' && f.targetFormat);
    await Promise.all(pending.map((f) => convertFile(f.id)));
  }, [convertFile]);

  const downloadFile = useCallback((id: string, pattern?: string, index?: number) => {
    const item = filesRef.current.find((f) => f.id === id);
    if (!item?.result || !item.targetFormat) return;
    if (!pattern) {
      downloadBlob(item.result, replaceExtension(item.name, item.targetFormat));
      return;
    }
    const filename = applyFilenamePattern(pattern, {
      n: index ?? 1,
      name: getBaseName(item.name),
      ext: getOutputExt(item.targetFormat, item.name),
      date: todayIso(),
    });
    downloadBlob(item.result, filename);
  }, []);

  const downloadAll = useCallback(async (pattern?: string) => {
    const done = filesRef.current.filter((f) => f.status === 'done' && f.result);
    if (done.length === 0) return;
    const getName = (f: FileItem, n: number) => {
      if (!pattern) return replaceExtension(f.name, f.targetFormat!);
      return applyFilenamePattern(pattern, {
        n,
        name: getBaseName(f.name),
        ext: getOutputExt(f.targetFormat!, f.name),
        date: todayIso(),
      });
    };
    if (done.length === 1) {
      const f = done[0];
      downloadBlob(f.result!, getName(f, 1));
      return;
    }
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    done.forEach((f, i) => zip.file(getName(f, i + 1), f.result!));
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'conversions.zip');
  }, []);

  const setTargetFormat = useCallback((id: string, fmt: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, targetFormat: fmt, status: 'idle', result: null, error: null, resultPreviewUrl: null }
          : f,
      ),
    );
  }, [setFiles]);

  const setOptions = useCallback((id: string, opts: Partial<ConversionOptions>) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, options: { ...f.options, ...opts } } : f));
  }, [setFiles]);

  const cleanExif = useCallback(async (id: string) => {
    const item = filesRef.current.find((f) => f.id === id);
    if (!item) return;
    const { file, extension, options, category } = item;
    const outputFileName = replaceExtension(file.name, 'jpg-clean');

    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, targetFormat: 'jpg-clean', status: 'converting' as const, progress: 0, error: null, result: null, resultPreviewUrl: null }
          : f,
      ),
    );

    trackConversionStarted(extension, 'jpg-clean');
    try {
      const result = await convert(file, extension, 'jpg-clean', options,
        (pct) => setFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress: pct } : f)),
      );
      const resultPreviewUrl = URL.createObjectURL(result);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'done', progress: 100, result, resultPreviewUrl } : f,
        ),
      );
      trackConversionSuccess(extension, 'jpg-clean');
      onSuccessRef.current?.(file, extension, 'jpg-clean', outputFileName, category, result);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'error', error: errMsg }
            : f,
        ),
      );
      trackConversionError(extension, 'jpg-clean');
      onFailureRef.current?.(file, extension, 'jpg-clean', outputFileName, category, errMsg);
    }
  }, [setFiles]);

  // Trim-and-copy: uses -c copy (fast, lossless), same format as source.
  // Called directly (like cleanExif) to avoid stale-read race on targetFormat.
  const trimCopy = useCallback(async (id: string) => {
    const item = filesRef.current.find((f) => f.id === id);
    if (!item) return;
    const { file, extension, options, category } = item;
    const outputFileName = replaceExtension(file.name, 'trim-copy');

    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, targetFormat: 'trim-copy', status: 'converting' as const, progress: 0, error: null, result: null, resultPreviewUrl: null }
          : f,
      ),
    );

    trackConversionStarted(extension, 'trim-copy');
    try {
      const result = await convert(file, extension, 'trim-copy', options,
        (pct) => setFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress: pct } : f)),
      );
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'done', progress: 100, result, resultPreviewUrl: null } : f,
        ),
      );
      trackConversionSuccess(extension, 'trim-copy');
      onSuccessRef.current?.(file, extension, 'trim-copy', outputFileName, category, result);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'error', error: errMsg }
            : f,
        ),
      );
      trackConversionError(extension, 'trim-copy');
      onFailureRef.current?.(file, extension, 'trim-copy', outputFileName, category, errMsg);
    }
  }, [setFiles]);

  const clearAll = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        if (f.resultPreviewUrl) URL.revokeObjectURL(f.resultPreviewUrl);
      });
      return [];
    });
  }, [setFiles]);

  return {
    files,
    addFiles,
    removeFile,
    cancelFile,
    convertFile,
    convertAll,
    downloadFile,
    downloadAll,
    setTargetFormat,
    setOptions,
    cleanExif,
    trimCopy,
    clearAll,
  };
}
