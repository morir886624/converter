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
  'loading tesseract core':    'Chargement du moteur OCR…',
  'initializing tesseract':    'Initialisation…',
  'loading language traineddata': 'Chargement du modèle de langue…',
  'initializing api':          'Préparation…',
  'recognizing text':          'Reconnaissance en cours…',
};

function mapPct(status: string, progress: number): number {
  if (status === 'loading tesseract core')       return Math.round(progress * 10);
  if (status === 'initializing tesseract')        return Math.round(10 + progress * 5);
  if (status === 'loading language traineddata')  return Math.round(15 + progress * 25);
  if (status === 'initializing api')              return Math.round(40 + progress * 5);
  if (status === 'recognizing text')              return Math.round(45 + progress * 52);
  return 0;
}

// Tesseract.js processes images in its own built-in Web Worker;
// calling recognize() here only awaits a Promise — the main thread is never blocked.
export async function recognizeImage(
  file: File,
  lang: OcrLangCode,
  onProgress: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const { default: Tesseract } = await import('tesseract.js');
  const result = await Tesseract.recognize(file, lang, {
    logger: (m: { status: string; progress: number }) => {
      onProgress({
        pct: mapPct(m.status, m.progress ?? 0),
        status: STATUS_LABELS[m.status] ?? m.status,
      });
    },
  });
  return {
    text: result.data.text.trim(),
    confidence: Math.round(result.data.confidence),
  };
}
