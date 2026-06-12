import type { ConversionOptions, ConverterPlugin } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp',
  bmp: 'image/bmp', gif: 'image/gif', avif: 'image/avif',
};

let _supportedFormats: string[] | null = null;

async function detectCanvasFormats(): Promise<string[]> {
  if (_supportedFormats) return _supportedFormats;
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  const supported: string[] = [];
  for (const [ext, mime] of Object.entries(MIME)) {
    if (ext === 'jpeg') continue; // dedupe with jpg
    const ok = await new Promise<boolean>((res) => {
      canvas.toBlob((b) => res(b !== null && b.size > 0), mime);
    });
    if (ok) supported.push(ext);
  }
  _supportedFormats = supported;
  return supported;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

async function imageToImage(
  file: File,
  targetExt: string,
  quality: number,
  maxWidth?: number,
): Promise<Blob> {
  const img = await loadImage(file);

  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (maxWidth && w > maxWidth) {
    h = Math.round(h * (maxWidth / w));
    w = maxWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (targetExt === 'jpg' || targetExt === 'bmp') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error(`${targetExt} export failed`)),
      MIME[targetExt] ?? 'image/png',
      quality / 100,
    );
  });
}

async function imageOrImagesToPdf(file: File): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const img = await loadImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'px', format: [w, h] });
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0);
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h);
  return pdf.output('blob');
}

async function imageToMarkdown(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const Tesseract = (await import('tesseract.js')).default;
  onProgress?.(5);
  const result = await Tesseract.recognize(file, 'fra+eng', {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        onProgress?.(Math.round(5 + m.progress * 90));
      }
    },
  });
  onProgress?.(100);
  return new Blob([result.data.text.trim()], { type: 'text/markdown' });
}

async function pdfToImages(
  file: File,
  targetExt: string,
  quality: number,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const n = doc.numPages;

  const renderPage = async (pageNum: number): Promise<Blob> => {
    const page = await doc.getPage(pageNum);
    const vp = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
    return new Promise<Blob>((res, rej) => {
      canvas.toBlob(
        (b) => b ? res(b) : rej(new Error('Render failed')),
        MIME[targetExt] ?? 'image/png',
        quality / 100,
      );
    });
  };

  if (n === 1) {
    const blob = await renderPage(1);
    onProgress?.(100);
    return blob;
  }

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (let i = 1; i <= n; i++) {
    const blob = await renderPage(i);
    zip.file(`page-${String(i).padStart(3, '0')}.${targetExt}`, await blob.arrayBuffer());
    onProgress?.((i / n) * 100);
  }
  return zip.generateAsync({ type: 'blob' });
}

export const imageConverter: ConverterPlugin = {
  name: 'images',
  category: 'image',
  inputFormats: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'avif', 'pdf'],
  outputFormats: async (input: string) => {
    if (input === 'pdf') return ['jpg', 'png', 'webp'];
    const supported = await detectCanvasFormats();
    // Keep 'png' even when input is already png: allows lossless resize without format change.
    return [...supported.filter((f) => f !== input || f === 'png'), 'pdf', 'md'];
  },
  convert: async (
    file: File,
    targetFormat: string,
    options: ConversionOptions,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> => {
    const input = file.name.split('.').pop()?.toLowerCase() ?? '';
    const quality = options.quality ?? 90;
    if (input === 'pdf') return pdfToImages(file, targetFormat, quality, onProgress);
    if (targetFormat === 'pdf') return imageOrImagesToPdf(file);
    if (targetFormat === 'md') return imageToMarkdown(file, onProgress);
    onProgress?.(50);
    const result = await imageToImage(file, targetFormat, quality, options.maxWidth);
    onProgress?.(100);
    return result;
  },
};
