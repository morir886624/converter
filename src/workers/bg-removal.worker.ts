import { removeBackground } from '@imgly/background-removal';

self.onmessage = async (e: MessageEvent) => {
  const { id, buffer, mimeType } = e.data as {
    id: string;
    buffer: ArrayBuffer;
    mimeType: string;
  };

  try {
    const image = new Blob([buffer], { type: mimeType || 'image/jpeg' });
    let maxPct = 2;

    const result = await removeBackground(image, {
      progress: (_key: string, current: number, total: number) => {
        if (total > 0) {
          const pct = Math.round(2 + (current / total) * 93);
          if (pct > maxPct) {
            maxPct = pct;
            (self as unknown as Worker).postMessage({ id, type: 'progress', pct });
          }
        }
      },
    });

    const resultBuffer = await result.arrayBuffer();
    (self as unknown as Worker).postMessage(
      { id, type: 'done', buffer: resultBuffer, mimeType: result.type },
      [resultBuffer],
    );
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      type: 'error',
      message:
        err instanceof Error
          ? err.message
          : "Background removal error",
    });
  }
};
