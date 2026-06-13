import { useState, useCallback, useEffect, useMemo } from 'react';
import { useConversion } from '../hooks/useConversion';
import { useHistoryContext } from '../contexts/HistoryContext';
import { DropZone } from './DropZone';
import { FileCard } from './FileCard';
import { ProgressBar } from './ProgressBar';
import { BatchRenamePanel } from './BatchRenamePanel';
import { DEFAULT_PATTERN } from '../utils/filenamePattern';

function GlobalProgress({ files }: { files: ReturnType<typeof useConversion>['files'] }) {
  const active = files.filter((f) => f.status === 'converting' || f.status === 'done');
  const done = files.filter((f) => f.status === 'done');
  if (active.length === 0) return null;
  const pct = (done.length / active.length) * 100;
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
        <span>Overall progress</span>
        <span>{done.length} / {active.length} file{active.length > 1 ? 's' : ''}</span>
      </div>
      <ProgressBar value={pct} />
    </div>
  );
}

interface Props {
  preferredFormat?: string;
  onHashFile?: (file: File) => void;
}

export function ConverterTab({ preferredFormat, onHashFile }: Props) {
  const { addSuccess, addFailure } = useHistoryContext();
  const [filePattern, setFilePattern] = useState(DEFAULT_PATTERN);

  const {
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
  } = useConversion({ onSuccess: addSuccess, onFailure: addFailure });

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    addFiles(newFiles, preferredFormat);
  }, [addFiles, preferredFormat]);

  // Clipboard paste → add image files
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;
      const items = Array.from(e.clipboardData?.items ?? []).filter((i) => i.type.startsWith('image/'));
      if (!items.length) return;
      const pasted = items
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null)
        .map((f, i) => {
          const ext = f.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
          return new File([f], `collage-${Date.now()}-${i}.${ext}`, { type: f.type });
        });
      if (pasted.length) handleFilesAdded(pasted);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFilesAdded]);

  // Wrap downloadFile to inject current pattern + sequential index among done files
  const doneFiles = useMemo(() => files.filter((f) => f.status === 'done' && f.result), [files]);

  const handleDownloadFile = useCallback((id: string) => {
    const index = doneFiles.findIndex((f) => f.id === id) + 1;
    downloadFile(id, filePattern, index);
  }, [downloadFile, doneFiles, filePattern]);

  const handleDownloadAll = useCallback(() => {
    downloadAll(filePattern);
  }, [downloadAll, filePattern]);

  const hasFiles = files.length > 0;
  const hasDone = doneFiles.length > 0;
  const hasIdle = files.some((f) => (f.status === 'idle' || f.status === 'cancelled') && f.targetFormat);

  return (
    <>
      {hasFiles
        ? <DropZone onFilesAdded={handleFilesAdded} compact />
        : <DropZone onFilesAdded={handleFilesAdded} />
      }

      {hasFiles && (
        <>
          <GlobalProgress files={files} />

          {/* Batch rename pattern — only shown when there are results */}
          {hasDone && (
            <BatchRenamePanel
              pattern={filePattern}
              onChange={setFilePattern}
              files={files}
            />
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
            {hasIdle && (
              <button onClick={convertAll} className="btn-primary">
                ⚡ Convert all
              </button>
            )}
            {hasDone && (
              <button onClick={handleDownloadAll} className="btn-success">
                ⬇ Download all (ZIP)
              </button>
            )}
            <button onClick={clearAll} className="btn-ghost">
              🗑 Clear all
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {files.map((item) => (
              <FileCard
                key={item.id}
                item={item}
                onRemove={removeFile}
                onConvert={convertFile}
                onCancel={cancelFile}
                onDownload={handleDownloadFile}
                onFormatChange={setTargetFormat}
                onOptionsChange={setOptions}
                onCleanExif={cleanExif}
                onTrimCopy={trimCopy}
                onHashFile={onHashFile}
              />
            ))}
          </div>
        </>
      )}

      {!hasFiles && (
        <>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-600 text-center">
            You can also paste an image with Ctrl+V / ⌘V
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { icon: '🔒', title: 'EXIF & privacy', desc: 'Detects and removes GPS metadata from your JPEG photos before sharing.' },
              { icon: '✨', title: 'Background removal', desc: 'Remove the background from any image in one click, no account needed.' },
              { icon: '🗜️', title: 'Smart compression', desc: 'Reduce image file size with a live estimated size preview.' },
              { icon: '📄', title: '40+ formats supported', desc: 'Images, PDF, documents, data, audio, video — all in the browser.' },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50"
              >
                <span className="text-xl shrink-0 mt-0.5" aria-hidden>{icon}</span>
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
