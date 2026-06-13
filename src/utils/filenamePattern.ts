export interface PatternContext {
  n: number;
  name: string;
  ext: string;
  date: string;
}

export const DEFAULT_PATTERN = '{name}.{ext}';

/**
 * Applies a filename pattern with variable substitution.
 *
 * Variables:
 *   {n}    – sequential number (1, 2, 3…)
 *   {n:3}  – zero-padded to 3 digits (001, 002, 003…)
 *   {name} – original filename without extension
 *   {ext}  – output extension (without leading dot)
 *   {date} – today's date YYYY-MM-DD
 */
export function applyFilenamePattern(pattern: string, ctx: PatternContext): string {
  return pattern
    .replace(/\{n(?::(\d+))?\}/g, (_, pad) =>
      pad ? String(ctx.n).padStart(parseInt(pad, 10), '0') : String(ctx.n),
    )
    .replace(/\{name\}/g, ctx.name)
    .replace(/\{ext\}/g, ctx.ext)
    .replace(/\{date\}/g, ctx.date);
}

/** Strips the extension from a filename. */
export function getBaseName(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

// Mirrors VIRTUAL_EXTENSIONS in download.ts — keep in sync.
const VIRTUAL_EXT_MAP: Record<string, string> = {
  'png-nobg': 'png',
  'jpg-clean': 'jpg',
};

/**
 * Resolves a targetFormat key (including virtual ones) to a real file extension.
 * For 'trim-copy' the output keeps the source extension, so pass the original filename.
 */
export function getOutputExt(targetFormat: string, originalFilename = ''): string {
  if (targetFormat === 'trim-copy') {
    const dot = originalFilename.lastIndexOf('.');
    return dot >= 0 ? originalFilename.slice(dot + 1) : '';
  }
  return VIRTUAL_EXT_MAP[targetFormat] ?? targetFormat;
}

/** Returns today's date as YYYY-MM-DD. */
export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}
