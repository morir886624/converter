import { useState, useEffect } from 'react';

const LOSSY = new Set(['jpg', 'jpeg', 'webp', 'avif']);

export interface SizeEstimate {
  original: number;
  estimated: number;
  isLoading: boolean;
}

export function useImageEstimate(
  file: File | null,
  targetExt: string,
  quality: number,
  maxWidth: number | undefined,
): SizeEstimate | null {
  const [est, setEst] = useState<SizeEstimate | null>(null);

  useEffect(() => {
    if (!file || !LOSSY.has(targetExt)) {
      setEst(null);
      return;
    }

    setEst((prev) =>
      prev
        ? { ...prev, isLoading: true }
        : { original: file.size, estimated: file.size, isLoading: true },
    );

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const estimated = await sampleEncode(file, targetExt, quality, maxWidth);
        if (!cancelled) setEst({ original: file.size, estimated, isLoading: false });
      } catch {
        if (!cancelled) setEst(null);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [file, targetExt, quality, maxWidth]);

  return est;
}

async function sampleEncode(
  file: File,
  targetExt: string,
  quality: number,
  maxWidth?: number,
): Promise<number> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(url); res(i); };
    i.onerror = () => { URL.revokeObjectURL(url); rej(new Error('load')); };
    i.src = url;
  });

  let outW = img.naturalWidth;
  let outH = img.naturalHeight;
  if (maxWidth && outW > maxWidth) {
    outH = Math.round(outH * (maxWidth / outW));
    outW = maxWidth;
  }

  // Sample at ≤200px to estimate quickly
  const scale = Math.min(1, 200 / Math.max(outW, outH));
  const sW = Math.max(1, Math.round(outW * scale));
  const sH = Math.max(1, Math.round(outH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = sW;
  canvas.height = sH;
  const ctx = canvas.getContext('2d')!;

  if (targetExt === 'jpg' || targetExt === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sW, sH);
  }
  // Draw the cropped/resized area
  ctx.drawImage(img, 0, 0, outW, outH, 0, 0, sW, sH);

  const mime = targetExt === 'webp' ? 'image/webp' : targetExt === 'avif' ? 'image/avif' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, quality / 100));
  if (!blob) return 0;

  // Scale sample size proportionally to actual output pixel area
  const areaRatio = (outW * outH) / (sW * sH);
  return Math.round(blob.size * areaRatio);
}
