export interface PageRange {
  start: number;
  end: number;
  label: string;
}

export function parsePageRanges(input: string, maxPage: number): PageRange[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const m = part.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
      if (!m) return [];
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : start;
      if (start < 1 || end < start || start > maxPage || end > maxPage) return [];
      return [{ start, end, label: start === end ? `Page ${start}` : `Pages ${start}–${end}` }];
    });
}
