import { useState, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import { DOMAIN } from '../conversions.config';
import { ConverterTab } from '../components/ConverterTab';
import { ErrorBoundary } from '../components/ErrorBoundary';

const PdfTools = lazy(() => import('../pdf-tools/PdfTools').then((m) => ({ default: m.PdfTools })));
const ImageTools = lazy(() => import('../image-tools/ImageTools').then((m) => ({ default: m.ImageTools })));
const WatermarkTool = lazy(() => import('../watermark/WatermarkTool').then((m) => ({ default: m.WatermarkTool })));
const FaviconGenerator = lazy(() => import('../favicon-generator/FaviconTool').then((m) => ({ default: m.FaviconGenerator })));
const ChecksumTool = lazy(() => import('../checksum/ChecksumTool').then((m) => ({ default: m.ChecksumTool })));
const OcrTool = lazy(() => import('../ocr/OcrTool').then((m) => ({ default: m.OcrTool })));

type AppTab = 'converter' | 'pdf' | 'image' | 'watermark' | 'favicon' | 'checksum' | 'ocr';

const TABS: { id: AppTab; icon: string; label: string }[] = [
  { id: 'converter', icon: '🔄', label: 'Converter'   },
  { id: 'pdf',       icon: '📄', label: 'PDF Tools'   },
  { id: 'image',     icon: '✨', label: 'Image Tools' },
  { id: 'watermark', icon: '💧', label: 'Watermark'   },
  { id: 'favicon',   icon: '🖼️', label: 'Favicon'     },
  { id: 'checksum',  icon: '🔐', label: 'Checksum'    },
  { id: 'ocr',       icon: '🔍', label: 'OCR'         },
];

export function FullAppPage() {
  const [tab, setTab] = useState<AppTab>('converter');
  const [checksumFile, setChecksumFile] = useState<File | null>(null);
  const [searchParams] = useSearchParams();
  const preferredFormat = searchParams.get('to') ?? undefined;

  const handleHashFile = useCallback((file: File) => {
    setChecksumFile(file);
    setTab('checksum');
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4">
      <Head>
        <title>Full File Converter — File Converter App</title>
        <meta
          name="description"
          content="Convert images, PDF, audio, video and data files directly in your browser. OCR, PDF tools, background removal, watermark — 100% local, no files uploaded."
        />
        <link rel="canonical" href={DOMAIN + '/app'} />
        <meta property="og:title" content="Full File Converter — File Converter App" />
        <meta property="og:description" content="Convert images, PDF, audio, video and data files directly in your browser. 100% local, no files ever uploaded." />
        <meta property="og:url" content={DOMAIN + '/app'} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={DOMAIN + '/apple-touch-icon.png'} />
      </Head>

      {/* Tab bar — scrollable on mobile, flex row on sm+ */}
      <div className="pt-4">
        <div className="-mx-3 sm:mx-0 overflow-x-auto scrollbar-hide px-3 sm:px-0">
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-max sm:w-auto min-w-full sm:min-w-0">
            {TABS.map(({ id, icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`shrink-0 sm:flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-3 sm:px-2 py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-colors whitespace-nowrap ${
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
      </div>

      {/* Tab content */}
      <main className="py-4 sm:py-6">
        {tab === 'converter' && (
          <ConverterTab preferredFormat={preferredFormat} onHashFile={handleHashFile} />
        )}

        <ErrorBoundary>
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
            {tab === 'ocr' && <OcrTool />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
