import type { ConverterPlugin } from '../types';

let _worker: Worker | null = null;

function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(
      new URL('../workers/bg-removal.worker.ts', import.meta.url),
      { type: 'module' },
    );
    _worker.addEventListener('error', () => {
      // Reset on crash so the next conversion respawns a fresh worker
      _worker = null;
    });
  }
  return _worker;
}

export const backgroundRemovalConverter: ConverterPlugin = {
  name: 'background-removal',
  category: 'image',
  inputFormats: ['jpg', 'jpeg', 'png', 'webp'],
  outputFormats: () => ['png-nobg'],
  convert: async (
    file: File,
    _targetFormat: string,
    _options,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> => {
    const worker = getWorker();
    const buffer = await file.arrayBuffer();
    onProgress?.(2);

    return new Promise<Blob>((resolve, reject) => {
      const id = crypto.randomUUID();

      const handler = (ev: MessageEvent) => {
        const msg = ev.data as {
          id: string;
          type: 'progress' | 'done' | 'error';
          pct?: number;
          buffer?: ArrayBuffer;
          mimeType?: string;
          message?: string;
        };
        if (msg.id !== id) return;

        if (msg.type === 'progress') {
          onProgress?.(msg.pct!);
        } else if (msg.type === 'done') {
          worker.removeEventListener('message', handler);
          onProgress?.(100);
          resolve(new Blob([msg.buffer!], { type: msg.mimeType ?? 'image/png' }));
        } else if (msg.type === 'error') {
          worker.removeEventListener('message', handler);
          reject(new Error(msg.message ?? 'Erreur inconnue'));
        }
      };

      worker.addEventListener('message', handler);
      // Transfer the buffer (zero-copy); original becomes detached
      worker.postMessage({ id, buffer, mimeType: file.type }, [buffer]);
    });
  },
};
