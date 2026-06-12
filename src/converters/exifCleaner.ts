import type { ConverterPlugin } from '../types';

function getCanvasDimensions(orientation: number, w: number, h: number): [number, number] {
  return orientation >= 5 ? [h, w] : [w, h];
}

function applyOrientationTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number,
) {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
  }
}

export const exifCleanerConverter: ConverterPlugin = {
  name: 'exif-cleaner',
  category: 'image',
  inputFormats: ['jpg', 'jpeg'],
  outputFormats: () => ['jpg-clean'],
  convert: async (file, _targetFormat, _options, onProgress) => {
    onProgress?.(10);

    let orientation = 1;
    try {
      const exifr = await import('exifr');
      const tags = await exifr.parse(file, { pick: ['Orientation'] });
      if (tags?.Orientation && typeof tags.Orientation === 'number') {
        orientation = tags.Orientation;
      }
    } catch {
      // No EXIF orientation — keep default 1
    }

    onProgress?.(30);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Impossible de charger l\'image')); };
      image.src = url;
    });

    onProgress?.(60);

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const [cw, ch] = getCanvasDimensions(orientation, w, h);

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    applyOrientationTransform(ctx, orientation, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    onProgress?.(90);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Échec de l\'export JPEG')),
        'image/jpeg',
        0.95,
      );
    });
  },
};
