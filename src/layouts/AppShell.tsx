import { useCallback, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { usePwa } from '../hooks/usePwa';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ThemeToggle } from '../components/ThemeToggle';
import { HistoryPanel } from '../components/HistoryPanel';
import { HistoryProvider, useHistoryContext } from '../contexts/HistoryContext';

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

function Shell() {
  const { dark, toggleTheme } = useTheme();
  const { offlineReady, needRefresh, canInstall, updateServiceWorker, install, close } = usePwa();
  const { entries, totalSize, historyOpen, setHistoryOpen, downloadEntry, removeEntry, clearAll, downloadAllZip } = useHistoryContext();
  const [pwaVisible, setPwaVisible] = useState(true);
  const location = useLocation();
  const isOnline = useOnlineStatus();

  const handlePwaClose = useCallback(() => {
    setPwaVisible(false);
    close();
  }, [close]);

  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">

      {/* Offline indicator — replaces privacy banner when offline */}
      {isOnline ? (
        <div className="bg-emerald-600 text-white text-center text-xs sm:text-sm py-2 px-3 font-medium leading-snug">
          <span>🔒 Your files never leave your device</span>
          <span className="hidden sm:inline"> — all conversions happen in your browser</span>
        </div>
      ) : (
        <div className="bg-amber-500 text-white text-center text-xs sm:text-sm py-2 px-3 font-medium leading-snug flex items-center justify-center gap-2">
          <span aria-hidden>📶</span>
          <span>Offline — all conversions still work normally</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
              <span className="text-xl sm:text-2xl shrink-0" aria-hidden>🔄</span>
              <span className="text-base sm:text-lg font-bold tracking-tight truncate">File Converter</span>
            </Link>
            {!isHome && (
              <Link
                to="/app"
                className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Full tool ↗
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setHistoryOpen(true)}
              aria-label="Open conversion history"
              title="Conversion history"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
              </svg>
              {entries.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-brand-500 text-white text-[10px] font-bold rounded-full px-0.5 leading-none">
                  {entries.length > 99 ? '99+' : entries.length}
                </span>
              )}
            </button>
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {/* Page content */}
      <Outlet />

      <footer className="text-center text-xs text-slate-400 dark:text-slate-600 py-6 px-4 space-y-1">
        <p>No data collected. No files sent to any server.</p>
        <p>
          Anonymous usage statistics via{' '}
          <a
            href="https://plausible.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
          >
            Plausible Analytics
          </a>
          {' '}— no cookies, no personal data.
        </p>
      </footer>

      {/* History panel */}
      {historyOpen && (
        <HistoryPanel
          entries={entries}
          totalSize={totalSize}
          onClose={() => setHistoryOpen(false)}
          onDownload={downloadEntry}
          onRemove={removeEntry}
          onClearAll={clearAll}
          onDownloadAll={downloadAllZip}
        />
      )}

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

export function AppShell() {
  return (
    <HistoryProvider>
      <Shell />
    </HistoryProvider>
  );
}
