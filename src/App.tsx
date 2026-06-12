import { useState, useEffect, useCallback } from 'react';
import { useTheme } from './hooks/useTheme';
import { useConversion } from './hooks/useConversion';
import { usePwa } from './hooks/usePwa';
import { DropZone } from './components/DropZone';
import { FileCard } from './components/FileCard';
import { ThemeToggle } from './components/ThemeToggle';
import { ProgressBar } from './components/ProgressBar';
import { PdfTools } from './pdf-tools/PdfTools';
import { ImageTools } from './image-tools/ImageTools';
import { WatermarkTool } from './watermark/WatermarkTool';

type AppTab = 'converter' | 'pdf' | 'image' | 'watermark';

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

function PwaBanners({
  offlineReady,
  needRefresh,
  canInstall,
  onUpdate,
  onInstall,
  onClose,
}: {
  offlineReady: boolean;
  needRefresh: boolean;
  canInstall: boolean;
  onUpdate: () => void;
  onInstall: () => void;
  onClose: () => void;
}) {
  if (!offlineReady && !needRefresh && !canInstall) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-50 flex flex-col gap-2">
      {offlineReady && !needRefresh && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-lg text-sm">
          <span aria-hidden>✅</span>
          <p className="flex-1">Available offline</p>
          <button onClick={onClose} aria-label="Close" className="shrink-0 hover:opacity-75">✕</button>
        </div>
      )}
      {needRefresh && (
        <div className="flex items-center gap-3 px-4 py-3 bg-brand-600 text-white rounded-xl shadow-lg text-sm">
          <span aria-hidden>🔄</span>
          <p className="flex-1">New version available</p>
          <button onClick={onUpdate} className="shrink-0 font-semibold underline hover:no-underline">Update</button>
          <button onClick={onClose} aria-label="Later" className="shrink-0 hover:opacity-75 ml-1">✕</button>
        </div>
      )}
      {canInstall && !needRefresh && (
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl shadow-lg text-sm">
          <span aria-hidden>📲</span>
          <p className="flex-1">Install app</p>
          <button onClick={onInstall} className="shrink-0 font-semibold underline hover:no-underline">Install</button>
          <button onClick={onClose} aria-label="Close" className="shrink-0 hover:opacity-75 ml-1">✕</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { dark, toggleTheme } = useTheme();
  const {
    files,
    addFiles,
    removeFile,
    convertFile,
    convertAll,
    downloadFile,
    downloadAll,
    setTargetFormat,
    setOptions,
    cleanExif,
    clearAll,
  } = useConversion();
  const { offlineReady, needRefresh, canInstall, updateServiceWorker, install, close } = usePwa();
  const [tab, setTab] = useState<AppTab>('converter');
  const [pwaVisible, setPwaVisible] = useState(true);

  // Clipboard paste → add image to converter
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
      if (pasted.length) {
        setTab('converter');
        addFiles(pasted);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  const handlePwaClose = useCallback(() => {
    setPwaVisible(false);
    close();
  }, [close]);

  const hasFiles = files.length > 0;
  const hasDone = files.some((f) => f.status === 'done');
  const hasIdle = files.some((f) => f.status === 'idle' && f.targetFormat);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">

      {/* Privacy banner */}
      <div className="bg-emerald-600 text-white text-center text-xs sm:text-sm py-2 px-3 font-medium leading-snug">
        <span>🔒 Your files never leave your device</span>
        <span className="hidden sm:inline"> — all conversions happen in your browser</span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0" aria-hidden>🔄</span>
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
              File Converter
            </h1>
          </div>
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
        </div>
      </header>

      {/* App tabs */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-4">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          <button
            onClick={() => setTab('converter')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'converter'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Converter
          </button>
          <button
            onClick={() => setTab('pdf')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'pdf'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            PDF Tools
          </button>
          <button
            onClick={() => setTab('image')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'image'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Image Tools
          </button>
          <button
            onClick={() => setTab('watermark')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'watermark'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            💧 Filigrane
          </button>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {tab === 'converter' && (
          <>
            {hasFiles
              ? <DropZone onFilesAdded={addFiles} compact />
              : <DropZone onFilesAdded={addFiles} />
            }

            {hasFiles && (
              <>
                <GlobalProgress files={files} />

                {/* Action bar */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
                  {hasIdle && (
                    <button onClick={convertAll} className="btn-primary">
                      ⚡ Convert all
                    </button>
                  )}
                  {hasDone && (
                    <button onClick={downloadAll} className="btn-success">
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
                      onDownload={downloadFile}
                      onFormatChange={setTargetFormat}
                      onOptionsChange={setOptions}
                      onCleanExif={cleanExif}
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
                    { icon: '🔒', title: 'EXIF & vie privée', desc: 'Détecte et supprime les métadonnées GPS de vos photos JPEG avant de les partager.' },
                    { icon: '✨', title: 'Suppression de fond', desc: 'Retire l\'arrière-plan de n\'importe quelle image en un clic, sans compte.' },
                    { icon: '🗜️', title: 'Compression intelligente', desc: 'Réduit le poids de vos images avec prévisualisation de la taille estimée.' },
                    { icon: '📄', title: '40+ formats supportés', desc: 'Images, PDF, documents, données, audio, vidéo — tout dans le navigateur.' },
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
        )}

        {tab === 'pdf' && <PdfTools />}
        {tab === 'image' && <ImageTools />}
        {tab === 'watermark' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
            <WatermarkTool />
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-400 dark:text-slate-600 py-6 px-4">
        No data collected. No files sent to any server.
      </footer>

      {/* PWA banners */}
      {pwaVisible && (
        <PwaBanners
          offlineReady={offlineReady}
          needRefresh={needRefresh}
          canInstall={canInstall}
          onUpdate={updateServiceWorker}
          onInstall={install}
          onClose={handlePwaClose}
        />
      )}
    </div>
  );
}
