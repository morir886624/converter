export interface ChecksumResult {
  md5: string;
  sha1: string;
  sha256: string;
}

// Singleton — instantiated only when first used
let _worker: Worker | null = null;
function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL('../workers/checksum.worker.ts', import.meta.url), { type: 'module' });
  }
  return _worker;
}

type WorkerOut =
  | { id: string; progress: number }
  | { id: string; result: ChecksumResult }
  | { id: string; error: string };

export function computeChecksums(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ChecksumResult> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const worker = getWorker();
    const handler = (e: MessageEvent<WorkerOut>) => {
      if (e.data.id !== id) return;
      if ('progress' in e.data) {
        onProgress?.(e.data.progress);
        return;
      }
      worker.removeEventListener('message', handler);
      if ('error' in e.data) reject(new Error(e.data.error));
      else if ('result' in e.data) resolve(e.data.result);
      else reject(new Error('Empty response from worker'));
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ id, file });
  });
}
