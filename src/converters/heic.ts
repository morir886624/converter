import type { ConversionOptions, ConverterPlugin } from '../types';

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

async function convertHeic(file: File, targetFormat: string, quality: number): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;
  const toType = MIME[targetFormat] ?? 'image/jpeg';
  try {
    const result = await (heic2any as any)({
      blob: file,
      toType,
      quality: quality / 100,
    });
    // heic2any returns Blob | Blob[] (array for animated HEIC sequences)
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    const detail = err instanceof Error ? ` (${err.message})` : '';
    throw new Error(
      `Cannot convert this HEIC file${detail}. ` +
      `Some HEIC variants (HDR, Burst, Live Photos) are not supported — try a different file.`,
    );
  }
}

export const heicConverter: ConverterPlugin = {
  name: 'heic',
  category: 'image',
  inputFormats: ['heic', 'heif'],
  outputFormats: () => ['jpg', 'png', 'webp'],
  convert: async (
    file: File,
    targetFormat: string,
    options: ConversionOptions,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> => {
    onProgress?.(10);
    const result = await convertHeic(file, targetFormat, options.quality ?? 90);
    onProgress?.(100);
    return result;
  },
};
