export type FileCategory = 'image' | 'audio' | 'video' | 'document' | 'data' | 'archive' | 'unknown';

export type ConversionStatus = 'idle' | 'converting' | 'done' | 'error';

export interface ConversionOptions {
  quality?: number;    // 1-100, images
  bitrate?: string;    // e.g. '128k', audio
  resolution?: string; // e.g. '1280x720', video
  frameRate?: number;  // fps for GIF output
  delimiter?: string;  // CSV delimiter
  maxWidth?: number;   // px — resize only if larger (image compression)
  mdMode?: 'code' | 'table'; // JSON → md: output as code block or table
  trimEnabled?: boolean;
  trimStart?: number;  // seconds
  trimEnd?: number;    // seconds
}

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  extension: string;
  availableFormats: string[];
  targetFormat: string | null;
  options: ConversionOptions;
  status: ConversionStatus;
  progress: number;
  result: Blob | null;
  error: string | null;
  previewUrl: string | null;
  resultPreviewUrl: string | null;
}

export interface HistoryEntry {
  id: string;
  fileName: string;
  outputFileName: string;
  inputFormat: string;
  outputFormat: string;
  inputSize: number;
  outputSize: number | null;
  category: FileCategory;
  timestamp: number;
  status: 'success' | 'error';
  error?: string;
  blob: Blob | null;
}

export interface ConverterPlugin {
  name: string;
  category: FileCategory;
  inputFormats: string[];
  outputFormats: (input: string) => Promise<string[]> | string[];
  convert: (
    file: File,
    targetFormat: string,
    options: ConversionOptions,
    onProgress?: (pct: number) => void,
  ) => Promise<Blob>;
}