import type { ConversionOptions, ConverterPlugin } from '../types';
import { imageConverter } from './images';
import { backgroundRemovalConverter } from './backgroundRemoval';
import { exifCleanerConverter } from './exifCleaner';
import { documentConverter } from './documents';
import { dataConverter } from './data';
import { archiveConverter } from './archives';
import { heicConverter } from './heic';

// ffmpeg converter is registered lazily when first needed
let _ffmpegConverter: ConverterPlugin | null = null;
async function getFFmpegConverter(): Promise<ConverterPlugin | null> {
  if (_ffmpegConverter) return _ffmpegConverter;
  try {
    const { ffmpegConverter } = await import('./ffmpeg');
    _ffmpegConverter = ffmpegConverter;
    return _ffmpegConverter;
  } catch {
    return null;
  }
}

const STATIC_CONVERTERS: ConverterPlugin[] = [
  imageConverter,
  backgroundRemovalConverter,
  exifCleanerConverter,
  documentConverter,
  dataConverter,
  archiveConverter,
  heicConverter,
];

// Returns formats from ALL static converters that accept ext (union, deduped).
// Needed because 'pdf' is accepted by both imageConverter and documentConverter.
export async function getOutputFormats(extension: string): Promise<string[]> {
  const ext = extension.toLowerCase();
  const accepting = STATIC_CONVERTERS.filter((c) => c.inputFormats.includes(ext));
  if (accepting.length > 0) {
    const perConverter = await Promise.all(
      accepting.map(async (c) => {
        const f = c.outputFormats(ext);
        return Array.isArray(f) ? f : await f;
      }),
    );
    return [...new Set(perConverter.flat())];
  }
  const ffmpeg = await getFFmpegConverter();
  if (ffmpeg?.inputFormats.includes(ext)) {
    const formats = ffmpeg.outputFormats(ext);
    return Array.isArray(formats) ? formats : await formats;
  }
  return [];
}

// Dispatches to the first static converter that accepts ext AND supports targetFormat.
export async function convert(
  file: File,
  extension: string,
  targetFormat: string,
  options: ConversionOptions,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const ext = extension.toLowerCase();
  for (const c of STATIC_CONVERTERS) {
    if (!c.inputFormats.includes(ext)) continue;
    const f = c.outputFormats(ext);
    const formats = Array.isArray(f) ? f : await f;
    if (formats.includes(targetFormat)) {
      return c.convert(file, targetFormat, options, onProgress, signal);
    }
  }
  const ffmpeg = await getFFmpegConverter();
  if (ffmpeg?.inputFormats.includes(ext)) {
    return ffmpeg.convert(file, targetFormat, options, onProgress, signal);
  }
  throw new Error(`No converter available for .${ext} → .${targetFormat}`);
}
