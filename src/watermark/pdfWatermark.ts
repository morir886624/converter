import { PDFDocument, rgb, degrees, StandardFonts, type PDFPage, type PDFFont, type PDFImage } from 'pdf-lib';
import type { WatermarkOptions, WatermarkPosition } from './types';
import { FONT_OPTIONS } from './types';

function parsePageRange(input: string, total: number): number[] {
  if (input.trim().toLowerCase() === 'all' || !input.trim()) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  for (const part of input.split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const from = Math.max(1, parseInt(m[1], 10));
    const to = m[2] ? Math.min(total, parseInt(m[2], 10)) : from;
    for (let p = from; p <= to; p++) pages.add(p);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) ?? ['', '00', '00', '00'];
  return rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255);
}

// Anchor (x,y) for pdf-lib so the element's center lands at (targetCx, targetCy)
// after pdf-lib rotates around (x,y). Rotation is in radians (positive = CCW in PDF space).
function anchorForCenter(
  targetCx: number, targetCy: number,
  wW: number, wH: number,
  rotRad: number,
): [number, number] {
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  const x = targetCx - (wW / 2) * cos + (wH / 2) * sin;
  const y = targetCy - (wW / 2) * sin - (wH / 2) * cos;
  return [x, y];
}

function calcCenter(
  pos: WatermarkPosition,
  W: number, H: number,
  wW: number, wH: number,
): [number, number] {
  const pad = Math.min(W, H) * 0.03;
  const map: Record<WatermarkPosition, [number, number]> = {
    // In PDF coords: (0,0) bottom-left, y increases upward
    tl: [pad + wW / 2, H - pad - wH / 2],
    tc: [W / 2, H - pad - wH / 2],
    tr: [W - pad - wW / 2, H - pad - wH / 2],
    ml: [pad + wW / 2, H / 2],
    mc: [W / 2, H / 2],
    mr: [W - pad - wW / 2, H / 2],
    bl: [pad + wW / 2, pad + wH / 2],
    bc: [W / 2, pad + wH / 2],
    br: [W - pad - wW / 2, pad + wH / 2],
  };
  return map[pos];
}

function drawTiledText(
  page: PDFPage,
  W: number, H: number,
  text: string,
  wW: number, wH: number,
  opts: WatermarkOptions,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
) {
  const rotRad = (opts.rotation * Math.PI) / 180;
  const diagW = Math.abs(wW * Math.cos(rotRad)) + Math.abs(wH * Math.sin(rotRad));
  const diagH = Math.abs(wW * Math.sin(rotRad)) + Math.abs(wH * Math.cos(rotRad));
  const spacingX = Math.max(diagW * 1.6, 20);
  const spacingY = Math.max(diagH * 1.6, 20);

  for (let row = -1; row * spacingY < H + spacingY; row++) {
    const offsetX = (((row % 2) + 2) % 2) * (spacingX / 2);
    for (let col = -1; col * spacingX + offsetX < W + spacingX; col++) {
      const cx = col * spacingX + offsetX;
      const cy = row * spacingY;
      const [ax, ay] = anchorForCenter(cx, cy, wW, wH, rotRad);
      page.drawText(text, {
        x: ax,
        y: ay,
        size: opts.fontSize,
        font,
        color,
        opacity: opts.opacity / 100,
        rotate: degrees(opts.rotation),
      });
    }
  }
}

function drawTiledImage(
  page: PDFPage,
  W: number, H: number,
  pdfImage: PDFImage,
  wW: number, wH: number,
  opts: WatermarkOptions,
) {
  const rotRad = (opts.rotation * Math.PI) / 180;
  const diagW = Math.abs(wW * Math.cos(rotRad)) + Math.abs(wH * Math.sin(rotRad));
  const diagH = Math.abs(wW * Math.sin(rotRad)) + Math.abs(wH * Math.cos(rotRad));
  const spacingX = Math.max(diagW * 1.6, 20);
  const spacingY = Math.max(diagH * 1.6, 20);

  for (let row = -1; row * spacingY < H + spacingY; row++) {
    const offsetX = (((row % 2) + 2) % 2) * (spacingX / 2);
    for (let col = -1; col * spacingX + offsetX < W + spacingX; col++) {
      const cx = col * spacingX + offsetX;
      const cy = row * spacingY;
      const [ax, ay] = anchorForCenter(cx, cy, wW, wH, rotRad);
      page.drawImage(pdfImage, {
        x: ax,
        y: ay,
        width: wW,
        height: wH,
        opacity: opts.opacity / 100,
        rotate: degrees(opts.rotation),
      });
    }
  }
}

export async function convert(
  file: File,
  _targetFormat: string,
  opts: WatermarkOptions,
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf);
  const allPages = pdfDoc.getPages();
  const targetPages = parsePageRange(opts.pageRange ?? 'all', allPages.length);

  const fontEntry = FONT_OPTIONS.find((f) => f.css === opts.fontFamily);
  const stdFontName = (fontEntry?.pdf ?? 'Helvetica') as keyof typeof StandardFonts;
  const font = await pdfDoc.embedFont(StandardFonts[stdFontName]);

  let pdfImage: PDFImage | null = null;
  if (opts.type === 'image' && opts.logoFile) {
    const logoBytes = await opts.logoFile.arrayBuffer();
    const isJpeg = opts.logoFile.type === 'image/jpeg' || opts.logoFile.type === 'image/jpg';
    pdfImage = isJpeg ? await pdfDoc.embedJpg(logoBytes) : await pdfDoc.embedPng(logoBytes);
  }

  const color = hexToRgb(opts.color);
  const rotRad = (opts.rotation * Math.PI) / 180;

  for (const pageNum of targetPages) {
    const page = allPages[pageNum - 1];
    const { width: W, height: H } = page.getSize();

    if (opts.type === 'text') {
      const wW = font.widthOfTextAtSize(opts.text, opts.fontSize);
      const wH = opts.fontSize;

      if (opts.tile) {
        drawTiledText(page, W, H, opts.text, wW, wH, opts, font, color);
      } else {
        const [cx, cy] = calcCenter(opts.position, W, H, wW, wH);
        const [ax, ay] = anchorForCenter(cx, cy, wW, wH, rotRad);
        page.drawText(opts.text, {
          x: ax,
          y: ay,
          size: opts.fontSize,
          font,
          color,
          opacity: opts.opacity / 100,
          rotate: degrees(opts.rotation),
        });
      }
    } else if (pdfImage) {
      const wW = W * (opts.sizePercent / 100);
      const wH = wW * (pdfImage.height / pdfImage.width);

      if (opts.tile) {
        drawTiledImage(page, W, H, pdfImage, wW, wH, opts);
      } else {
        const [cx, cy] = calcCenter(opts.position, W, H, wW, wH);
        const [ax, ay] = anchorForCenter(cx, cy, wW, wH, rotRad);
        page.drawImage(pdfImage, {
          x: ax,
          y: ay,
          width: wW,
          height: wH,
          opacity: opts.opacity / 100,
          rotate: degrees(opts.rotation),
        });
      }
    }
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
