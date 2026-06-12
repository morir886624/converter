import type { WatermarkOptions, WatermarkPosition } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

function calcPosition(
  pos: WatermarkPosition,
  W: number, H: number,
  wW: number, wH: number,
): [number, number] {
  const pad = Math.min(W, H) * 0.03;
  const map: Record<WatermarkPosition, [number, number]> = {
    tl: [pad, pad],
    tc: [(W - wW) / 2, pad],
    tr: [W - wW - pad, pad],
    ml: [pad, (H - wH) / 2],
    mc: [(W - wW) / 2, (H - wH) / 2],
    mr: [W - wW - pad, (H - wH) / 2],
    bl: [pad, H - wH - pad],
    bc: [(W - wW) / 2, H - wH - pad],
    br: [W - wW - pad, H - wH - pad],
  };
  return map[pos];
}

function drawTiled(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  wW: number, wH: number,
  rotRad: number,
  drawItem: (ctx: CanvasRenderingContext2D) => void,
) {
  const diagW = Math.abs(wW * Math.cos(rotRad)) + Math.abs(wH * Math.sin(rotRad));
  const diagH = Math.abs(wW * Math.sin(rotRad)) + Math.abs(wH * Math.cos(rotRad));
  const spacingX = Math.max(diagW * 1.6, 20);
  const spacingY = Math.max(diagH * 1.6, 20);

  for (let row = -1; row * spacingY < H + spacingY; row++) {
    const offsetX = (((row % 2) + 2) % 2) * (spacingX / 2);
    for (let col = -1; col * spacingX + offsetX < W + spacingX; col++) {
      const cx = col * spacingX + offsetX;
      const cy = row * spacingY;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotRad);
      drawItem(ctx);
      ctx.restore();
    }
  }
}

export function drawWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  opts: WatermarkOptions,
  logoImg: HTMLImageElement | null,
): void {
  ctx.save();
  ctx.globalAlpha = opts.opacity / 100;

  const rotRad = (opts.rotation * Math.PI) / 180;

  if (opts.type === 'text') {
    const font = `bold ${opts.fontSize}px ${opts.fontFamily}`;
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.color;
    const wW = ctx.measureText(opts.text).width;
    const wH = opts.fontSize * 1.2;

    if (opts.tile) {
      drawTiled(ctx, W, H, wW, wH, rotRad, (c) => {
        c.font = font;
        c.textBaseline = 'middle';
        c.fillStyle = opts.color;
        c.fillText(opts.text, -wW / 2, 0);
      });
    } else {
      const [x, y] = calcPosition(opts.position, W, H, wW, wH);
      ctx.save();
      ctx.translate(x + wW / 2, y + wH / 2);
      ctx.rotate(rotRad);
      ctx.fillText(opts.text, -wW / 2, 0);
      ctx.restore();
    }
  } else if (logoImg) {
    const wW = W * (opts.sizePercent / 100);
    const wH = wW * (logoImg.naturalHeight / logoImg.naturalWidth);

    if (opts.tile) {
      drawTiled(ctx, W, H, wW, wH, rotRad, (c) => {
        c.drawImage(logoImg, -wW / 2, -wH / 2, wW, wH);
      });
    } else {
      const [x, y] = calcPosition(opts.position, W, H, wW, wH);
      ctx.save();
      ctx.translate(x + wW / 2, y + wH / 2);
      ctx.rotate(rotRad);
      ctx.drawImage(logoImg, -wW / 2, -wH / 2, wW, wH);
      ctx.restore();
    }
  }

  ctx.restore();
}

export async function convert(
  file: File,
  _targetFormat: string,
  opts: WatermarkOptions,
): Promise<Blob> {
  const srcUrl = URL.createObjectURL(file);
  const logoUrl = opts.logoFile ? URL.createObjectURL(opts.logoFile) : null;

  try {
    const [srcImg, logoImg] = await Promise.all([
      loadImage(srcUrl),
      logoUrl ? loadImage(logoUrl) : Promise.resolve(null),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = srcImg.naturalWidth;
    canvas.height = srcImg.naturalHeight;
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(srcImg, 0, 0);
    drawWatermarkOnCanvas(ctx, canvas.width, canvas.height, opts, logoImg);

    const mime = file.type || 'image/jpeg';
    const quality = mime === 'image/jpeg' || mime === 'image/webp' ? 0.92 : undefined;

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
        mime,
        quality,
      );
    });
  } finally {
    URL.revokeObjectURL(srcUrl);
    if (logoUrl) URL.revokeObjectURL(logoUrl);
  }
}
