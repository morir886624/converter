export type WatermarkPosition = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';
export type WatermarkType = 'text' | 'image';

export interface WatermarkOptions {
  type: WatermarkType;
  text: string;
  fontFamily: string;   // CSS font-family string
  fontSize: number;     // px (for text)
  color: string;        // hex (for text)
  opacity: number;      // 0–100
  position: WatermarkPosition;
  rotation: number;     // degrees
  tile: boolean;
  sizePercent: number;  // logo width as % of canvas/page width
  logoFile?: File;
  pageRange?: string;   // e.g. "all", "1-3, 5"
}

export interface WatermarkFile {
  id: string;
  file: File;
  kind: 'image' | 'pdf';
  status: 'idle' | 'processing' | 'done' | 'error';
  resultBlob: Blob | null;
  error: string | null;
}

export const FONT_OPTIONS = [
  { label: 'Arial',       css: 'Arial, sans-serif',        pdf: 'Helvetica'     },
  { label: 'Georgia',     css: 'Georgia, serif',           pdf: 'TimesRoman'    },
  { label: 'Courier New', css: '"Courier New", monospace', pdf: 'Courier'       },
  { label: 'Impact',      css: 'Impact, fantasy',          pdf: 'HelveticaBold' },
] as const;

export const DEFAULT_WATERMARK_OPTIONS: WatermarkOptions = {
  type: 'text',
  text: 'CONFIDENTIEL',
  fontFamily: 'Arial, sans-serif',
  fontSize: 60,
  color: '#000000',
  opacity: 30,
  position: 'mc',
  rotation: -45,
  tile: false,
  sizePercent: 20,
};
