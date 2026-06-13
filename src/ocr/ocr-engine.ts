export const OCR_LANGUAGES = [
  { code: 'fra', label: 'Français',  flag: '🇫🇷' },
  { code: 'eng', label: 'English',   flag: '🇬🇧' },
  { code: 'spa', label: 'Español',   flag: '🇪🇸' },
  { code: 'deu', label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'por', label: 'Português', flag: '🇵🇹' },
] as const;

export type OcrLangCode = (typeof OCR_LANGUAGES)[number]['code'];

export interface OcrProgress {
  pct: number;
  status: string;
}

export interface OcrResult {
  text: string;
  confidence: number; // 0-100
}

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core':       'Loading OCR engine…',
  'initializing tesseract':       'Initializing…',
  'loading language traineddata': 'Loading language model…',
  'initializing api':             'Preparing…',
  'recognizing text':             'Recognizing text…',
};

function mapPct(status: string, progress: number): number {
  if (status === 'loading tesseract core')       return Math.round(progress * 10);
  if (status === 'initializing tesseract')        return Math.round(10 + progress * 5);
  if (status === 'loading language traineddata')  return Math.round(15 + progress * 25);
  if (status === 'initializing api')              return Math.round(40 + progress * 5);
  if (status === 'recognizing text')              return Math.round(45 + progress * 52);
  return 0;
}

// Persistent worker — reused across calls for the same language to avoid
// re-downloading the language model on every recognition.
type TesseractWorker = Awaited<ReturnType<Awaited<typeof import('tesseract.js')>['createWorker']>>;
let _worker: TesseractWorker | null = null;
let _workerLang: OcrLangCode | null = null;
const _progressRef = { current: (_m: { status: string; progress: number }) => {} };

async function getWorker(lang: OcrLangCode): Promise<TesseractWorker> {
  const { createWorker } = await import('tesseract.js');
  if (_worker && _workerLang === lang) return _worker;
  if (_worker) { await _worker.terminate(); _worker = null; }
  _worker = await createWorker(lang, 1, {
    logger: (m: { status: string; progress: number }) => _progressRef.current(m),
  });
  _workerLang = lang;
  return _worker;
}

export async function recognizeImage(
  file: File | Blob,
  lang: OcrLangCode,
  onProgress: (p: OcrProgress) => void,
): Promise<OcrResult> {
  _progressRef.current = (m) => onProgress({
    pct: mapPct(m.status, m.progress ?? 0),
    status: STATUS_LABELS[m.status] ?? m.status,
  });
  const worker = await getWorker(lang);
  const result = await worker.recognize(file);
  _progressRef.current = () => {};
  return {
    text: result.data.text.trim(),
    confidence: Math.round(result.data.confidence),
  };
}

// Render a PDF page to a PNG Blob via pdfjs-dist
async function pdfPageToBlob(
  pdf: Awaited<ReturnType<typeof import('pdfjs-dist')['getDocument']>['promise']>,
  pageNum: number,
  scale = 2,
): Promise<Blob> {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport }).promise;
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
  });
}

// OCR a multi-page PDF: rasterize each page then recognize text on it
export async function recognizePdf(
  file: File,
  lang: OcrLangCode,
  onProgress: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  const pageTexts: string[] = [];
  let totalConfidence = 0;

  for (let i = 1; i <= numPages; i++) {
    onProgress({
      pct: Math.round(((i - 1) / numPages) * 95),
      status: `Page ${i} / ${numPages} — rendering…`,
    });
    const blob = await pdfPageToBlob(pdf, i);
    const pageResult = await recognizeImage(blob, lang, ({ pct, status }) => {
      const globalPct = Math.round(((i - 1 + pct / 100) / numPages) * 95);
      onProgress({ pct: globalPct, status: `Page ${i} / ${numPages} — ${status.toLowerCase()}` });
    });
    pageTexts.push(numPages > 1 ? `--- Page ${i} ---\n${pageResult.text}` : pageResult.text);
    totalConfidence += pageResult.confidence;
  }

  onProgress({ pct: 100, status: 'Done' });
  return {
    text: pageTexts.join('\n\n'),
    confidence: Math.round(totalConfidence / numPages),
  };
}
