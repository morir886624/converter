import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export function usePdfThumbnail(file: File | null, scale = 0.4): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setUrl(null); return; }
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      const buf = await file.arrayBuffer();
      if (cancelled) return;
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      const page = await doc.getPage(1);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
      if (cancelled) return;
      canvas.toBlob((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }, 'image/jpeg', 0.75);
    })().catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, scale]);

  return url;
}
