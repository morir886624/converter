/**
 * Copies @ffmpeg/core UMD dist files (JS + WASM) to public/ffmpeg/
 * so they are served same-origin and can be precached by the service worker.
 * Runs automatically via the "postinstall" npm script.
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const dest = resolve(__dirname, '../public/ffmpeg');

try {
  // Resolve via main CJS entry → dist/umd/ffmpeg-core.js
  const mainFile = require.resolve('@ffmpeg/core');
  const src = dirname(mainFile);
  mkdirSync(dest, { recursive: true });
  for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
    const srcFile = resolve(src, file);
    if (existsSync(srcFile)) {
      copyFileSync(srcFile, resolve(dest, file));
      console.log(`[copy-ffmpeg] ${file} → public/ffmpeg/`);
    } else {
      console.warn(`[copy-ffmpeg] Warning: ${srcFile} not found`);
    }
  }
} catch (err) {
  console.warn('[copy-ffmpeg] Could not copy @ffmpeg/core files:', err.message);
}
