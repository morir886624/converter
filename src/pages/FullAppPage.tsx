import { useCallback, useState, lazy, Suspense } from 'react';
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
const QrTool = lazy(() => import('../qr/QrTool').then((m) => ({ default: m.QrTool })));
const FormatterTool = lazy(() => import('../formatter/FormatterTool').then((m) => ({ default: m.FormatterTool })));

export type AppTab = 'converter' | 'pdf' | 'image' | 'watermark' | 'favicon' | 'checksum' | 'ocr' | 'qr' | 'formatter';

const USAGE_GUIDES: Record<AppTab, { title: string; steps: string[] }> = {
  converter: {
    title: 'How to convert a file',
    steps: [
      'Drop one or more files into the zone, or click to browse your files.',
      'Select the output format from the dropdown on each file card.',
      'Click Convert. The file is processed entirely in your browser — nothing is uploaded.',
      'Download each file individually, or use Download All to get everything as a ZIP.',
    ],
  },
  pdf: {
    title: 'How to use PDF Tools',
    steps: [
      'Merge: add your PDFs, drag them to reorder, then click Merge to combine them into a single file.',
      'Split: enter page ranges like "1-3, 5, 8-10" to extract specific pages as separate PDFs or a ZIP.',
      'Compress: reduces file size by rasterizing pages — note that text becomes non-selectable in the output.',
    ],
  },
  image: {
    title: 'How to use Image Tools',
    steps: [
      'Background Removal: upload a photo and AI instantly removes the background, entirely in your browser.',
      'Compression: adjust the quality slider to reduce file size while keeping acceptable visual quality.',
      'Resize: set new width and height values, then download the resized image.',
      'Crop: draw a selection rectangle over the area you want to keep, then download.',
      'EXIF Cleaner: drop images to strip all metadata (GPS location, camera model, timestamps) before sharing.',
    ],
  },
  watermark: {
    title: 'How to add a watermark',
    steps: [
      'Upload the image or PDF you want to watermark.',
      'Type your watermark text, or upload a logo image to use instead.',
      'Adjust position, opacity, size and rotation to your liking.',
      'Click Download to save your watermarked file.',
    ],
  },
  favicon: {
    title: 'How to generate a favicon',
    steps: [
      'Upload a square image — 512×512 px or larger is recommended for best quality.',
      'Click Generate to create all standard favicon sizes (.ico, .png, manifest icons).',
      'Download the ZIP and place the files in the root directory of your website.',
      'Add the provided HTML <link> tags inside your <head> to activate the favicons.',
    ],
  },
  checksum: {
    title: 'How to verify a file checksum',
    steps: [
      'Drop the file you want to verify — SHA-256, MD5 and SHA-1 hashes are computed instantly in your browser.',
      'Compare the displayed hash to the one provided by the original source.',
      'Or paste the expected hash into the comparison field — a green checkmark confirms the file is authentic and unmodified.',
    ],
  },
  ocr: {
    title: 'How to extract text from an image or PDF',
    steps: [
      'Upload a scanned image (PNG, JPG, WEBP…) or a PDF containing scanned pages.',
      'Select the document language for improved recognition accuracy.',
      'Click Extract text — the tool reads the image and outputs all detected text.',
      'Copy the result or download it as a .txt file.',
    ],
  },
  qr: {
    title: 'How to create a QR code',
    steps: [
      'Type a URL or any text in the input field.',
      'Optionally adjust size, foreground and background colors.',
      'Your QR code is generated live as you type — no button needed.',
      'Click Download PNG or Download SVG to save it and share or print it anywhere.',
    ],
  },
  formatter: {
    title: 'How to format code',
    steps: [
      'Paste your code directly into the editor, or drop a file (JSON, YAML, XML, SQL, HTML…).',
      'The formatter auto-detects the language and applies correct indentation and syntax highlighting.',
      'Use the Copy button to grab the formatted output.',
      'Ideal for debugging minified data or making config files human-readable.',
    ],
  },
};

function UsageGuide({ tab }: { tab: AppTab }) {
  const guide = USAGE_GUIDES[tab];
  return (
    <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
        <span aria-hidden>💡</span>
        {guide.title}
      </h2>
      <ol className="space-y-2">
        {guide.steps.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-xs text-slate-600 dark:text-slate-300 leading-snug">
            <span className="shrink-0 mt-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-bold text-[10px]">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FullAppPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = ((searchParams.get('tab') as AppTab) || 'converter');
  const [checksumFile, setChecksumFile] = useState<File | null>(null);
  const preferredFormat = searchParams.get('to') ?? undefined;

  const handleHashFile = useCallback((file: File) => {
    setChecksumFile(file);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'checksum');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Full File Converter — File Converter App" />
        <meta name="twitter:description" content="50+ conversions — images, PDF, audio, video, data. OCR, QR Code, Watermark, Favicon. 100% in your browser." />
        <meta name="twitter:image" content={DOMAIN + '/apple-touch-icon.png'} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'File Converter',
          url: DOMAIN + '/app',
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Web',
          description: 'Convert images, PDF, audio, video and data files directly in your browser. OCR, QR Code, Watermark, Favicon, Checksum — 100% local, no files ever uploaded.',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        })}</script>
      </Head>

      <div className="py-4 sm:py-6">
        {tab === 'converter' && (
          <ConverterTab preferredFormat={preferredFormat} onHashFile={handleHashFile} />
        )}

        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>}>
            {tab === 'pdf'       && <PdfTools />}
            {tab === 'image'     && <ImageTools />}
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
            {tab === 'checksum'  && <ChecksumTool initialFile={checksumFile} />}
            {tab === 'ocr'       && <OcrTool />}
            {tab === 'qr'        && <QrTool />}
            {tab === 'formatter' && <FormatterTool />}
          </Suspense>
        </ErrorBoundary>

        <UsageGuide tab={tab} />
      </div>
    </div>
  );
}
