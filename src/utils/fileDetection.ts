import type { FileCategory } from '../types';

const EXT_CATEGORY: Record<string, FileCategory> = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image',
  bmp: 'image', gif: 'image', avif: 'image', tiff: 'image', tif: 'image',
  heic: 'image', heif: 'image',
  mp3: 'audio', wav: 'audio', ogg: 'audio', aac: 'audio', flac: 'audio', m4a: 'audio',
  mp4: 'video', webm: 'video', avi: 'video', mov: 'video', mkv: 'video',
  pdf: 'document', docx: 'document', doc: 'document',
  txt: 'document', md: 'document', html: 'document', htm: 'document',
  xlsx: 'data', xls: 'data', csv: 'data', json: 'data', yaml: 'data', yml: 'data', xml: 'data',
  zip: 'archive',
};

// Magic byte signatures: [offset, bytes]
const MAGIC: Array<{ sig: number[]; offset: number; ext: string }> = [
  { sig: [0xff, 0xd8, 0xff], offset: 0, ext: 'jpg' },
  { sig: [0x89, 0x50, 0x4e, 0x47], offset: 0, ext: 'png' },
  { sig: [0x47, 0x49, 0x46, 0x38], offset: 0, ext: 'gif' },
  { sig: [0x42, 0x4d], offset: 0, ext: 'bmp' },
  { sig: [0x25, 0x50, 0x44, 0x46], offset: 0, ext: 'pdf' },
  { sig: [0x50, 0x4b, 0x03, 0x04], offset: 0, ext: 'zip' },
  { sig: [0x4f, 0x67, 0x67, 0x53], offset: 0, ext: 'ogg' },
  { sig: [0x49, 0x44, 0x33], offset: 0, ext: 'mp3' },
  // WAV: RIFF....WAVE
  { sig: [0x52, 0x49, 0x46, 0x46], offset: 0, ext: 'wav' },
  // HEIC/HEIF: ftyp box at offset 4, brand at offset 8
  // "ftyp" + "heic"
  { sig: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], offset: 4, ext: 'heic' },
  // "ftyp" + "heis"
  { sig: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x73], offset: 4, ext: 'heic' },
  // "ftyp" + "heif"
  { sig: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x66], offset: 4, ext: 'heif' },
  // "ftyp" + "mif1" (HEIF multi-image)
  { sig: [0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31], offset: 4, ext: 'heif' },
];

function fromMagic(buf: Uint8Array): string | null {
  for (const { sig, offset, ext } of MAGIC) {
    if (sig.every((b, i) => buf[offset + i] === b)) return ext;
  }
  return null;
}

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function detectFile(file: File): { category: FileCategory; extension: string } {
  const ext = getExtension(file.name);
  const category = EXT_CATEGORY[ext] ?? 'unknown';
  return { category, extension: ext };
}

export async function detectFileWithMagic(file: File): Promise<{ category: FileCategory; extension: string }> {
  const slice = file.slice(0, 16);
  const buf = new Uint8Array(await slice.arrayBuffer());
  const magicExt = fromMagic(buf);
  const ext = magicExt ?? getExtension(file.name);
  const category = EXT_CATEGORY[ext] ?? 'unknown';
  return { category, extension: ext };
}

export const CATEGORY_LABEL: Record<FileCategory, string> = {
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
  document: 'Document',
  data: 'Data',
  archive: 'Archive',
  unknown: 'Unknown',
};

export const CATEGORY_ICON: Record<FileCategory, string> = {
  image: '🖼️',
  audio: '🎵',
  video: '🎬',
  document: '📄',
  data: '📊',
  archive: '📦',
  unknown: '❓',
};