export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Maps virtual format keys (used in dropdowns) to real file extensions for download
const VIRTUAL_EXTENSIONS: Record<string, string> = {
  'png-nobg': 'png',
  'jpg-clean': 'jpg',
};

export function replaceExtension(filename: string, newExt: string): string {
  const dot = filename.lastIndexOf('.');
  const base = dot >= 0 ? filename.slice(0, dot) : filename;
  const ext = VIRTUAL_EXTENSIONS[newExt] ?? newExt;
  return `${base}.${ext}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}