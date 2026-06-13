import { useState, useCallback, lazy, Suspense } from 'react';
import { ConverterTab } from '../components/ConverterTab';

const PdfTools = lazy(() => import('../pdf-tools/PdfTools').then((m) => ({ default: m.PdfTools })));
const ImageTools = lazy(() => import('../image-tools/ImageTools').then((m) => ({ default: m.ImageTools })));
const WatermarkTool = lazy(() => import('../watermark/WatermarkTool').then((m) => ({ default: m.WatermarkTool })));
const FaviconGenerator = lazy(() => import('../favicon-generator/FaviconTool').then((m) => ({ default: m.FaviconGenerator })));
const ChecksumTool = lazy(() => import('../checksum/ChecksumTool').then((m) => ({ default: m.ChecksumTool })));

type AppTab = 'converter' | 'pdf' | 'image' | 'watermark' | 'favicon' | 'checksum';

export function FullAppPage() {
  const [tab, setTab] = useState<AppTab>('converter');
  const [checksumFile, setChecksumFile] = useState<File | null>(null);

  const handleHashFile = useCallback((file: File) => {
    setChecksumFile(file);
    setTab('checksum');
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4">

      {/* Tab bar */}
      <div className="pt-4">
        <div className="grid grid-cols-6 sm:flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {([
            { id: 'converter', icon: '🔄', label: 'Converter',   span: 'col-span-2' },
            { id: 'pdf',       icon: '📄', label: 'PDF Tools',   span: 'col-span-2' },
            { id: 'image',     icon: '✨', label: 'Image Tools', span: 'col-span-2' },
            { id: 'watermark', icon: '💧', label: 'Watermark',   span: 'col-span-2' },
            { id: 'favicon',   icon: '🖼️', label: 'Favicon',     span: 'col-span-2' },
            { id: 'checksum',  icon: '🔐', label: 'Checksum',    span: 'col-span-2' },
          ] as { id: AppTab; icon: string; label: string; span: string }[]).map(({ id, icon, label, span }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`${span} sm:flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 sm:px-3 py-2 sm:py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span aria-hidden className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <main className="py-4 sm:py-6">
        {tab === 'converter' && (
          <ConverterTab onHashFile={handleHashFile} />
        )}

        <Suspense fallback={<div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>}>
          {tab === 'pdf' && <PdfTools />}
          {tab === 'image' && <ImageTools />}
          {tab === 'watermark' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
              <WatermarkTool />
            </div>
          )}
          {tab === 'favicon' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
              <FaviconGenerator />
            </div>
          )}
          {tab === 'checksum' && <ChecksumTool initialFile={checksumFile} />}
        </Suspense>
      </main>
    </div>
  );
}
