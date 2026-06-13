import SparkMD5 from 'spark-md5';

type WorkerIn = { id: string; file: File };
type WorkerOut =
  | { id: string; progress: number }
  | { id: string; result: { md5: string; sha1: string; sha256: string } }
  | { id: string; error: string };

const CHUNK = 2 * 1024 * 1024; // 2 MB

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const { id, file } = e.data;
  const post = (msg: WorkerOut) => (self as unknown as Worker).postMessage(msg);

  try {
    const buffer = await file.arrayBuffer();

    // MD5 — incremental over chunks so progress is visible
    const spark = new SparkMD5.ArrayBuffer();
    for (let offset = 0; offset < buffer.byteLength; offset += CHUNK) {
      spark.append(buffer.slice(offset, Math.min(offset + CHUNK, buffer.byteLength)));
      post({ id, progress: Math.round((Math.min(offset + CHUNK, buffer.byteLength) / buffer.byteLength) * 80) });
      // yield to allow progress messages to flush
      await new Promise((r) => setTimeout(r, 0));
    }
    const md5 = spark.end();
    post({ id, progress: 85 });

    // SHA-1 + SHA-256 via native SubtleCrypto
    const [sha1Buf, sha256Buf] = await Promise.all([
      crypto.subtle.digest('SHA-1', buffer),
      crypto.subtle.digest('SHA-256', buffer),
    ]);
    post({ id, progress: 100 });

    post({ id, result: { md5, sha1: toHex(sha1Buf), sha256: toHex(sha256Buf) } });
  } catch (err) {
    post({ id, error: err instanceof Error ? err.message : 'Unknown error' });
  }
};
