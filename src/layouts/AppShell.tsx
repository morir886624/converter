import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useSearchParams } from 'react-router-dom';
import type { AppTab } from '../pages/FullAppPage';
import { useTheme } from '../hooks/useTheme';
import { usePwa } from '../hooks/usePwa';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ThemeToggle } from '../components/ThemeToggle';
import { HistoryPanel } from '../components/HistoryPanel';
import { HistoryProvider, useHistoryContext } from '../contexts/HistoryContext';

const NAV_TOOLS: { id: AppTab; icon: string; label: string }[] = [
  { id: 'converter', icon: '🔄',  label: 'Converter'   },
  { id: 'pdf',       icon: '📄',  label: 'PDF Tools'   },
  { id: 'image',     icon: '✨',  label: 'Image Tools' },
  { id: 'watermark', icon: '💧',  label: 'Watermark'   },
  { id: 'favicon',   icon: '🖼️',  label: 'Favicon'     },
  { id: 'checksum',  icon: '🔐',  label: 'Checksum'    },
  { id: 'ocr',       icon: '🔍',  label: 'OCR'         },
  { id: 'qr',        icon: '◼',   label: 'QR Code'     },
  { id: 'formatter', icon: '{ }', label: 'Formatter'   },
];

function ToolsNav({ activeTab }: { activeTab: AppTab | null }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scroll = (dir: 'left' | 'right') =>
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -140 : 140, behavior: 'smooth' });

  return (
    <div className="relative border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      {/* Left gradient + arrow */}
      {canScrollLeft && (
        <div className="absolute left-0 inset-y-0 w-10 z-10 flex items-center justify-start pl-1 bg-gradient-to-r from-white dark:from-slate-900 to-transparent pointer-events-none">
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="pointer-events-auto w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-base leading-none"
          >
            ‹
          </button>
        </div>
      )}

      {/* Scrollable list */}
      <nav ref={scrollRef} aria-label="Tools" className="overflow-x-auto scrollbar-hide">
        <div className="max-w-4xl mx-auto px-2 flex">
          {NAV_TOOLS.map(({ id, icon, label }) => (
            <Link
              key={id}
              to={`/app?tab=${id}`}
              className={`flex flex-col items-center gap-0.5 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span aria-hidden className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Right gradient + arrow */}
      {canScrollRight && (
        <div className="absolute right-0 inset-y-0 w-10 z-10 flex items-center justify-end pr-1 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none">
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="pointer-events-auto w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-base leading-none"
          >
            ›
          </button>
        </div>
      )}
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

function Shell() {
  const { dark, mode, cycleTheme } = useTheme();
  const { offlineReady, needRefresh, canInstall, updateServiceWorker, install, close } = usePwa();
  const { entries, totalSize, historyOpen, setHistoryOpen, downloadEntry, removeEntry, clearAll, downloadAllZip } = useHistoryContext();
  const [pwaVisible, setPwaVisible] = useState(true);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isOnline = useOnlineStatus();

  const activeTab: AppTab | null = location.pathname === '/app'
    ? ((searchParams.get('tab') as AppTab) ?? 'converter')
    : null;

  const handlePwaClose = useCallback(() => {
    setPwaVisible(false);
    close();
  }, [close]);

  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">

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
            <ThemeToggle mode={mode} onCycle={cycleTheme} />
          </div>
        </div>
      </header>

      {/* Tools nav */}
      <ToolsNav activeTab={activeTab} />

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-700 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <a
            href="https://ko-fi.com/moeidmorir"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5E5B] hover:bg-[#e54e4b] text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
              <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.126.434.199.651.732.151.96-.249.151-.27.274-.56.364-.853.137-.44.244-.882.32-1.329.013-.077.026-.156.04-.235zM15 8c0 3.309-2.691 6-6 6s-6-2.691-6-6 2.691-6 6-6 6 2.691 6 6zm-6-4c-2.206 0-4 1.794-4 4s1.794 4 4 4 4-1.794 4-4-1.794-4-4-4z"/>
            </svg>
            Support me on Ko-fi
          </a>
          <div className="text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
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
          </div>
        </div>
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
