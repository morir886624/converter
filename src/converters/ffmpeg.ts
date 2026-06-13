import type { ConversionOptions, ConverterPlugin } from '../types';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let _ffmpeg: FFmpeg | null = null;
let _loading: Promise<void> | null = null;

// Self-hosted files (copied to public/ffmpeg/ by scripts/copy-ffmpeg.mjs)
// Same-origin → no CORS issues, precached by the service worker for offline use
const CORE_BASE = '/ffmpeg';

async function loadFFmpeg(onProgress?: (pct: number) => void): Promise<FFmpeg> {
  if (_ffmpeg?.loaded) return _ffmpeg;

  if (!_loading) {
    _loading = (async () => {
      _ffmpeg = new FFmpeg();
      _ffmpeg.on('progress', ({ progress }) => {
        onProgress?.(Math.round(progress * 90));
      });
      await _ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    })();
  }

  await _loading;
  return _ffmpeg!;
}

const AUDIO_INPUTS = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
const VIDEO_INPUTS = ['mp4', 'webm', 'avi', 'mov', 'mkv'];

const AUDIO_OUTPUTS = ['mp3', 'wav', 'ogg', 'aac'];
const VIDEO_OUTPUTS_FROM_VIDEO = ['mp4', 'webm', 'mp3', 'gif'];
const VIDEO_OUTPUTS_FROM_VIDEO_OBJ: Record<string, string[]> = {
  mp4: VIDEO_OUTPUTS_FROM_VIDEO,
  webm: VIDEO_OUTPUTS_FROM_VIDEO,
  avi: VIDEO_OUTPUTS_FROM_VIDEO,
  mov: VIDEO_OUTPUTS_FROM_VIDEO,
  mkv: VIDEO_OUTPUTS_FROM_VIDEO,
};

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac',
  mp4: 'video/mp4', webm: 'video/webm', gif: 'image/gif',
};

const SIZE_WARN_MB = 150;

// Returns {before, after} args for trim. before goes before -i (fast seek);
// after goes before the output filename (duration limiter, always unambiguous).
function buildTrimArgs(opts: ConversionOptions): { before: string[]; after: string[] } {
  if (!opts.trimEnabled) return { before: [], after: [] };
  const start = opts.trimStart ?? 0;
  const end = opts.trimEnd;
  const before: string[] = [];
  const after: string[] = [];
  if (start > 0.001) before.push('-ss', start.toFixed(6));
  if (end !== undefined) {
    const dur = end - start;
    if (dur > 0.001) after.push('-t', dur.toFixed(6));
  }
  return { before, after };
}

function buildAudioArgs(input: string, output: string, opts: ConversionOptions): string[] {
  const { before, after } = buildTrimArgs(opts);
  const args = [...before, '-i', `input.${input}`];
  const bitrate = opts.bitrate ?? '128k';
  if (output === 'mp3') args.push('-c:a', 'libmp3lame', '-b:a', bitrate);
  else if (output === 'ogg') args.push('-c:a', 'libvorbis', '-b:a', bitrate);
  else if (output === 'aac') args.push('-c:a', 'aac', '-b:a', bitrate);
  else if (output === 'wav') args.push('-c:a', 'pcm_s16le');
  args.push(...after, `output.${output}`);
  return args;
}

function buildVideoArgs(input: string, output: string, opts: ConversionOptions): string[] {
  const { before, after } = buildTrimArgs(opts);
  const args = [...before, '-i', `input.${input}`];
  const scale = opts.resolution ? `-vf scale=${opts.resolution.replace('x', ':')}` : null;

  if (output === 'mp3') {
    args.push('-vn', '-c:a', 'libmp3lame', '-b:a', opts.bitrate ?? '128k');
  } else if (output === 'gif') {
    const fps = opts.frameRate ?? 15;
    const vf = scale ? `${scale.slice(4)},fps=${fps},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse` : `fps=${fps},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
    args.push('-vf', vf, '-loop', '0');
  } else {
    if (output === 'mp4') args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac');
    if (output === 'webm') args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '33', '-c:a', 'libopus');
    if (scale) args.push('-vf', scale.slice(4));
  }
  args.push(...after, `output.${output}`);
  return args;
}

export const ffmpegConverter: ConverterPlugin = {
  name: 'ffmpeg',
  category: 'audio',
  inputFormats: [...AUDIO_INPUTS, ...VIDEO_INPUTS],
  outputFormats: (input: string): string[] => {
    // 'trim-copy' appended last so it's never the auto-selected default format
    if (AUDIO_INPUTS.includes(input)) return [...AUDIO_OUTPUTS.filter((f) => f !== input), 'trim-copy'];
    const videoOuts = VIDEO_OUTPUTS_FROM_VIDEO_OBJ[input];
    if (videoOuts) return [...videoOuts.filter((f) => f !== input), 'trim-copy'];
    return [];
  },
  convert: async (
    file: File,
    targetFormat: string,
    options: ConversionOptions,
    onProgress?: (pct: number) => void,
    signal?: AbortSignal,
  ): Promise<Blob> => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const sizeMb = file.size / (1024 * 1024);

    if (sizeMb > SIZE_WARN_MB) {
      console.warn(`Large file (${sizeMb.toFixed(0)} MB) — conversion may require a lot of RAM`);
    }

    onProgress?.(5);
    const ff = await loadFFmpeg(onProgress);
    onProgress?.(15);

    const inputName = `input.${ext}`;
    // For trim-copy, output keeps the same extension as the source
    const actualFormat = targetFormat === 'trim-copy' ? ext : targetFormat;
    const outputName = `output.${actualFormat}`;

    await ff.writeFile(inputName, await fetchFile(file));
    onProgress?.(25);

    let args: string[];
    if (targetFormat === 'trim-copy') {
      const { before, after } = buildTrimArgs(options);
      // -avoid_negative_ts make_zero prevents frozen first segment when
      // keyframe offset produces negative timestamps (common in MP4 stream copy)
      args = [...before, '-i', inputName, ...after, '-avoid_negative_ts', 'make_zero', '-c', 'copy', outputName];
    } else {
      const isAudio = AUDIO_INPUTS.includes(ext);
      args = isAudio
        ? buildAudioArgs(ext, targetFormat, options)
        : buildVideoArgs(ext, targetFormat, options);
    }

    try {
      // Race against abort signal: if signal fires, terminate the worker immediately
      const abortPromise = signal
        ? new Promise<never>((_, reject) => {
            signal.addEventListener('abort', () => {
              _ffmpeg?.terminate();
              _ffmpeg = null;
              _loading = null;
              reject(new DOMException('Conversion cancelled', 'AbortError'));
            }, { once: true });
          })
        : null;
      await (abortPromise ? Promise.race([ff.exec(args), abortPromise]) : ff.exec(args));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('No such file') || msg.includes('Invalid data') || msg.includes('moov atom')) {
        throw new Error('Invalid or corrupted file — unable to read the source file.');
      }
      if (msg.includes('Encoder') || msg.includes('codec') || msg.includes('Unknown encoder')) {
        throw new Error('Output format not supported in this browser. Try MP4 or MP3.');
      }
      if (msg.includes('Out of memory') || msg.includes('Cannot allocate')) {
        throw new Error('Not enough memory. Close other tabs or try a smaller file.');
      }
      if (msg.includes('Permission denied') || msg.includes('Operation not permitted')) {
        throw new Error('File access error. Reload the page and try again.');
      }
      throw new Error(`Conversion failed: ${msg.split('\n')[0]}`);
    }
    onProgress?.(95);

    const data = await ff.readFile(outputName);
    await ff.deleteFile(inputName);
    await ff.deleteFile(outputName);

    onProgress?.(100);
    const mime = MIME[actualFormat] ?? 'application/octet-stream';
    return new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: mime });
  },
};