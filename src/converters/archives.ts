import type { ConversionOptions, ConverterPlugin } from '../types';

export const archiveConverter: ConverterPlugin = {
  name: 'archives',
  category: 'archive',
  inputFormats: ['zip'],
  outputFormats: (_input: string): string[] => ['extract'],
  convert: async (
    file: File,
    _targetFormat: string,
    _options: ConversionOptions,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> => {
    // Returns the original ZIP — the UI layer handles individual file downloads
    onProgress?.(50);
    const buf = await file.arrayBuffer();
    onProgress?.(100);
    return new Blob([buf], { type: 'application/zip' });
  },
};

// Helper used by FileCard to extract and download all files from a ZIP blob
export async function extractAndDownload(zipBlob: Blob): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipBlob);
  const files = Object.entries(zip.files).filter(([, f]) => !f.dir);
  for (const [name, zipEntry] of files) {
    const blob = await zipEntry.async('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name.split('/').pop() ?? name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // Small delay to avoid browser throttling multiple downloads
    await new Promise((r) => setTimeout(r, 150));
  }
}

// Helper to list files in a ZIP without fully extracting
export async function listZipContents(zipBlob: Blob): Promise<string[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipBlob);
  return Object.entries(zip.files)
    .filter(([, f]) => !f.dir)
    .map(([name]) => name);
}