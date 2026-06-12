import type { ConversionOptions, ConverterPlugin } from '../types';

// Singleton worker — created on first use
let _worker: Worker | null = null;
function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL('../workers/data.worker.ts', import.meta.url), { type: 'module' });
  }
  return _worker;
}

function runInWorker(
  op: string,
  input: ArrayBuffer,
  opts: { delimiter?: string; mdMode?: 'code' | 'table' },
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const worker = getWorker();
    const handler = (e: MessageEvent<{ id: string; result?: ArrayBuffer; error?: string }>) => {
      if (e.data.id !== id) return;
      worker.removeEventListener('message', handler);
      if (e.data.error) reject(new Error(e.data.error));
      else if (e.data.result) resolve(e.data.result);
      else reject(new Error('Empty response from worker'));
    };
    worker.addEventListener('message', handler);
    // Transfer ownership of ArrayBuffer to worker
    worker.postMessage({ id, op, input, opts }, [input]);
  });
}

const OUTPUTS: Record<string, string[]> = {
  xlsx: ['csv', 'json', 'md'],
  xls: ['csv', 'json', 'md'],
  csv: ['xlsx', 'json', 'md'],
  json: ['xlsx', 'csv', 'yaml', 'xml', 'md'],
  yaml: ['json', 'xml', 'md'],
  yml: ['json', 'xml', 'md'],
  xml: ['json', 'yaml', 'md'],
};

function opKey(input: string, target: string): string {
  const norm = (s: string) => (s === 'yml' ? 'yaml' : s === 'xls' ? 'xlsx' : s);
  return `${norm(input)}-to-${norm(target)}`;
}

const MIME: Record<string, string> = {
  csv: 'text/csv',
  json: 'application/json',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  xml: 'application/xml',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  md: 'text/markdown',
};

export const dataConverter: ConverterPlugin = {
  name: 'data',
  category: 'data',
  inputFormats: ['xlsx', 'xls', 'csv', 'json', 'yaml', 'yml', 'xml'],
  outputFormats: (input: string): string[] => OUTPUTS[input] ?? [],
  convert: async (
    file: File,
    targetFormat: string,
    options: ConversionOptions,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const input = await file.arrayBuffer();

    onProgress?.(20);

    const op = opKey(ext, targetFormat);
    const result = await runInWorker(op, input, {
      delimiter: options.delimiter,
      mdMode: options.mdMode,
    });
    onProgress?.(100);

    const mime = MIME[targetFormat] ?? 'application/octet-stream';
    return new Blob([result], { type: mime });
  },
};
