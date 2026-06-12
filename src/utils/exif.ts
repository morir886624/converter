export interface ExifData {
  make?: string;
  model?: string;
  dateTaken?: string;
  gps?: { lat: number; lon: number };
  width?: number;
  height?: number;
  orientation?: number;
  software?: string;
}

export async function readExif(file: File): Promise<ExifData | null> {
  try {
    const exifr = await import('exifr');
    const data = await exifr.parse(file, { gps: true });
    if (!data) return null;

    let gps: { lat: number; lon: number } | undefined;
    if (data.latitude != null && data.longitude != null) {
      gps = { lat: data.latitude, lon: data.longitude };
    }

    let dateTaken: string | undefined;
    const raw = data.DateTimeOriginal ?? data.DateTime;
    if (raw instanceof Date) {
      dateTaken = raw.toISOString().slice(0, 19).replace('T', ' ');
    } else if (typeof raw === 'string') {
      dateTaken = raw;
    }

    const width = data.ImageWidth ?? data.PixelXDimension ?? data.ExifImageWidth;
    const height = data.ImageHeight ?? data.PixelYDimension ?? data.ExifImageHeight;

    return {
      make: data.Make,
      model: data.Model,
      dateTaken,
      gps,
      width,
      height,
      orientation: typeof data.Orientation === 'number' ? data.Orientation : undefined,
      software: data.Software,
    };
  } catch {
    return null;
  }
}
