export interface ManifestMeta {
  name: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
}

export interface SizeEntry {
  size: number;
  filename: string;
}

export const ALL_SIZES: SizeEntry[] = [
  { size: 16,  filename: 'favicon-16x16.png' },
  { size: 32,  filename: 'favicon-32x32.png' },
  { size: 48,  filename: 'favicon-48x48.png' },
  { size: 180, filename: 'apple-touch-icon.png' },
  { size: 192, filename: 'android-chrome-192x192.png' },
  { size: 512, filename: 'android-chrome-512x512.png' },
];

const ICO_SIZES = [16, 32, 48];

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Image load failed'));
    img.src = src;
  });
}

export async function rasterizeSource(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const svg = doc.documentElement;
      let w = parseFloat(svg.getAttribute('width') || '0');
      let h = parseFloat(svg.getAttribute('height') || '0');
      if (!w || !h) {
        const vb = svg.getAttribute('viewBox');
        if (vb) {
          const parts = vb.trim().split(/[\s,]+/).map(Number);
          if (parts.length === 4) { w = parts[2]; h = parts[3]; }
        }
      }
      if (!w) w = 512;
      if (!h) h = 512;
      const scale = 512 / Math.max(w, h);
      const rw = Math.round(w * scale);
      const rh = Math.round(h * scale);
      svg.setAttribute('width', String(rw));
      svg.setAttribute('height', String(rh));
      const svgStr = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(blob);
      try {
        const img = await loadImg(svgUrl);
        const canvas = document.createElement('canvas');
        canvas.width = rw;
        canvas.height = rh;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        return canvas;
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    } else {
      const img = await loadImg(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      return canvas;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

function renderAtSize(src: HTMLCanvasElement, x: number, y: number, cropSize: number, outputSize: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  canvas.getContext('2d')!.drawImage(src, x, y, cropSize, cropSize, 0, 0, outputSize, outputSize);
  return new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas export failed'))), 'image/png');
  });
}

async function buildIco(pngBlobs: Blob[]): Promise<Blob> {
  const buffers = await Promise.all(pngBlobs.map((b) => b.arrayBuffer()));
  const N = buffers.length;
  const headerSize = 6 + 16 * N;
  let totalSize = headerSize;
  for (const buf of buffers) totalSize += buf.byteLength;

  const result = new ArrayBuffer(totalSize);
  const view = new DataView(result);

  // ICONDIR header
  view.setUint16(0, 0, true);  // reserved
  view.setUint16(2, 1, true);  // type = 1 (ICO)
  view.setUint16(4, N, true);  // image count

  let imageOffset = headerSize;
  for (let i = 0; i < N; i++) {
    const sz = ICO_SIZES[i];
    const base = 6 + i * 16;
    view.setUint8(base + 0, sz);                              // width
    view.setUint8(base + 1, sz);                              // height
    view.setUint8(base + 2, 0);                               // colorCount
    view.setUint8(base + 3, 0);                               // reserved
    view.setUint16(base + 4, 1, true);                        // planes
    view.setUint16(base + 6, 32, true);                       // bitCount
    view.setUint32(base + 8, buffers[i].byteLength, true);    // bytesInRes
    view.setUint32(base + 12, imageOffset, true);             // imageOffset
    imageOffset += buffers[i].byteLength;
  }

  const bytes = new Uint8Array(result);
  let pos = headerSize;
  for (const buf of buffers) {
    bytes.set(new Uint8Array(buf), pos);
    pos += buf.byteLength;
  }

  return new Blob([result], { type: 'image/x-icon' });
}

function buildManifest(meta: ManifestMeta): string {
  return JSON.stringify(
    {
      name: meta.name || 'My App',
      short_name: meta.shortName || meta.name || 'App',
      icons: [
        { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: meta.themeColor,
      background_color: meta.backgroundColor,
      display: 'standalone',
    },
    null,
    2,
  );
}

export function buildHtmlSnippet(): string {
  return [
    '<link rel="icon" type="image/x-icon" href="/favicon.ico">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join('\n');
}

export interface FaviconPackResult {
  previews: { size: number; filename: string; url: string }[];
  zipBlob: Blob;
  htmlSnippet: string;
  manifestJson: string;
}

export async function generateFaviconPack(
  sourceCanvas: HTMLCanvasElement,
  cropX: number,
  cropY: number,
  cropSize: number,
  meta: ManifestMeta,
): Promise<FaviconPackResult> {
  const pngBlobs = await Promise.all(
    ALL_SIZES.map((entry) => renderAtSize(sourceCanvas, cropX, cropY, cropSize, entry.size)),
  );

  const icoBlobs = pngBlobs.slice(0, ICO_SIZES.length);
  const icoBlob = await buildIco(icoBlobs);

  const manifestJson = buildManifest(meta);
  const htmlSnippet = buildHtmlSnippet();

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file('favicon.ico', icoBlob);
  zip.file('site.webmanifest', manifestJson);
  for (let i = 0; i < ALL_SIZES.length; i++) {
    zip.file(ALL_SIZES[i].filename, pngBlobs[i]);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  const previews = ALL_SIZES.map((entry, i) => ({
    size: entry.size,
    filename: entry.filename,
    url: URL.createObjectURL(pngBlobs[i]),
  }));

  return { previews, zipBlob, htmlSnippet, manifestJson };
}
