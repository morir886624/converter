import type { ConversionOptions, ConverterPlugin } from '../types';

// ── DOCX ─────────────────────────────────────────────────────────────────────

async function docxToHtml(file: File): Promise<Blob> {
  const mammoth = (await import('mammoth')).default;
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${value}</body></html>`;
  return new Blob([html], { type: 'text/html' });
}

async function docxToText(file: File): Promise<Blob> {
  const mammoth = (await import('mammoth')).default;
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return new Blob([value], { type: 'text/plain' });
}

async function docxToMarkdown(file: File): Promise<Blob> {
  const mammoth = (await import('mammoth')).default;
  const TurndownService = (await import('turndown')).default;
  const buf = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  return new Blob([td.turndown(html)], { type: 'text/markdown' });
}

// ── HTML ──────────────────────────────────────────────────────────────────────

async function htmlToMarkdown(file: File): Promise<Blob> {
  const TurndownService = (await import('turndown')).default;
  const text = await file.text();
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  return new Blob([td.turndown(text)], { type: 'text/markdown' });
}

async function htmlToText(file: File): Promise<Blob> {
  const blob = await htmlToMarkdown(file);
  const md = await blob.text();
  const { marked } = await import('marked');
  const html = String(marked.parse(md));
  const plain = stripHtml(html);
  return new Blob([plain], { type: 'text/plain' });
}

// ── TXT ───────────────────────────────────────────────────────────────────────

async function textToPdf(file: File): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const text = await file.text();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, 180) as string[];
  let y = 20;
  for (const line of lines) {
    if (y > 280) { doc.addPage(); y = 20; }
    doc.text(line, 15, y);
    y += 6;
  }
  return doc.output('blob');
}

async function txtToMarkdown(file: File): Promise<Blob> {
  const text = await file.text();
  return new Blob([text], { type: 'text/markdown' });
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function pdfToText(file: File): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return new Blob([parts.join('\n\n')], { type: 'text/plain' });
}

async function pdfToMarkdown(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist');
  const pdfWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter(
      (item): item is typeof item & { str: string; height: number; transform: number[] } => 'str' in item,
    );

    if (!items.length) continue;

    // Group text items into lines by Y position (sort descending by y so top-of-page comes first)
    const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);
    const lines: { text: string; height: number }[] = [];
    let prevY: number | null = null;
    let curLine = '';
    let curHeight = 0;

    for (const item of sorted) {
      const y = Math.round(item.transform[5]);
      const h = Math.round((item as any).height ?? 0);
      if (prevY !== null && Math.abs(y - prevY) > 2) {
        if (curLine.trim()) lines.push({ text: curLine.trim(), height: curHeight });
        curLine = '';
        curHeight = 0;
      }
      curLine += item.str;
      curHeight = Math.max(curHeight, h);
      prevY = y;
    }
    if (curLine.trim()) lines.push({ text: curLine.trim(), height: curHeight });

    // Determine body font size (median of non-zero heights)
    const heights = lines.map((l) => l.height).filter((h) => h > 0).sort((a, b) => a - b);
    const bodyH = heights[Math.floor(heights.length / 2)] ?? 12;

    const formatted = lines.map(({ text, height }) => {
      if (height > bodyH * 1.5) return `# ${text}`;
      if (height > bodyH * 1.2) return `## ${text}`;
      return text;
    });

    parts.push(formatted.join('\n'));
    onProgress?.(Math.round((i / pdf.numPages) * 90));
  }

  const md = parts.join('\n\n---\n\n');
  if (!md.trim()) {
    throw new Error(
      "This PDF contains no extractable text. If it is a scanned PDF, " +
      "first convert the page to an image (PDF → JPG), then use Image → Markdown (OCR).",
    );
  }
  return new Blob([md], { type: 'text/markdown' });
}

// ── MARKDOWN → other ─────────────────────────────────────────────────────────

async function markdownToHtml(file: File): Promise<Blob> {
  const { marked } = await import('marked');
  const text = await file.text();
  const body = String(marked.parse(text));
  const full = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Document</title>
<style>
body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#24292e;line-height:1.6}
h1,h2{border-bottom:1px solid #eaecef;padding-bottom:.3em}
h1{font-size:2em;margin:.67em 0}h2{font-size:1.5em}h3{font-size:1.25em}
code{background:#f6f8fa;border-radius:3px;padding:.2em .4em;font-family:monospace;font-size:.9em}
pre{background:#f6f8fa;border-radius:6px;padding:16px;overflow:auto}
pre code{background:none;padding:0}
blockquote{border-left:4px solid #dfe2e5;color:#6a737d;padding:0 1em;margin:0}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #dfe2e5;padding:6px 13px}
th{background:#f6f8fa;font-weight:600}
tr:nth-child(even){background:#f6f8fa}
a{color:#0366d6;text-decoration:none}img{max-width:100%}
</style>
</head>
<body>${body}</body>
</html>`;
  return new Blob([full], { type: 'text/html' });
}

async function markdownToText(file: File): Promise<Blob> {
  const { marked } = await import('marked');
  const text = await file.text();
  const html = String(marked.parse(text));
  return new Blob([stripHtml(html)], { type: 'text/plain' });
}

// Renders MD as styled HTML → PDF via html2canvas (text becomes rasterized/non-selectable)
async function markdownToPdf(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const { marked } = await import('marked');
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;

  const text = await file.text();
  const htmlContent = String(marked.parse(text));
  onProgress?.(15);

  const div = document.createElement('div');
  div.style.cssText =
    'position:fixed;left:-9999px;top:0;width:794px;padding:48px;' +
    'background:white;font-family:Arial,sans-serif;font-size:14px;' +
    'line-height:1.6;color:#000;box-sizing:border-box';
  div.innerHTML =
    '<style>' +
    'h1{font-size:24px;border-bottom:1px solid #ccc;padding-bottom:8px;margin:20px 0 12px}' +
    'h2{font-size:20px;border-bottom:1px solid #eee;padding-bottom:6px;margin:18px 0 10px}' +
    'h3{font-size:16px;margin:16px 0 8px}' +
    'pre{background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px}' +
    'code{background:#f5f5f5;padding:2px 4px;border-radius:3px;font-family:monospace;font-size:12px}' +
    'blockquote{border-left:3px solid #ccc;padding-left:16px;color:#666;margin:8px 0}' +
    'table{border-collapse:collapse;width:100%;margin:12px 0}' +
    'th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}' +
    'th{background:#f5f5f5;font-weight:bold}' +
    'ul,ol{padding-left:24px}li{margin:4px 0}' +
    '</style>' +
    htmlContent;
  document.body.appendChild(div);

  try {
    onProgress?.(30);
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, logging: false });
    onProgress?.(80);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgW = 210;
    const imgH = (canvas.height / canvas.width) * imgW;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageH = 297;
    let y = 0;
    while (y < imgH) {
      if (y > 0) doc.addPage();
      doc.addImage(imgData, 'JPEG', 0, -y, imgW, imgH);
      y += pageH;
    }
    onProgress?.(100);
    return doc.output('blob');
  } finally {
    document.body.removeChild(div);
  }
}

async function markdownToDocx(file: File): Promise<Blob> {
  const { marked } = await import('marked');
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table,
    TableRow, TableCell, WidthType, AlignmentType, LevelFormat,
  } = await import('docx');

  const text = await file.text();
  const tokens = marked.lexer(text);

  function flatText(token: any): string {
    if (typeof token.text === 'string') return token.text;
    if (Array.isArray(token.tokens)) return token.tokens.map(flatText).join('');
    return '';
  }

  interface RunOpts {
    text: string; bold?: boolean; italics?: boolean; strike?: boolean;
    font?: string; size?: number; color?: string;
    underline?: Record<string, unknown>; break?: number;
  }

  function inlineToRunOpts(toks: any[], base: Partial<RunOpts> = {}): RunOpts[] {
    const out: RunOpts[] = [];
    for (const t of toks ?? []) {
      if (t.type === 'text' || t.type === 'escape') {
        out.push({ text: t.text ?? '', ...base });
      } else if (t.type === 'strong') {
        out.push(...inlineToRunOpts(t.tokens ?? [{ type: 'text', text: t.text }], { ...base, bold: true }));
      } else if (t.type === 'em') {
        out.push(...inlineToRunOpts(t.tokens ?? [{ type: 'text', text: t.text }], { ...base, italics: true }));
      } else if (t.type === 'del') {
        out.push(...inlineToRunOpts(t.tokens ?? [{ type: 'text', text: t.text }], { ...base, strike: true }));
      } else if (t.type === 'codespan') {
        out.push({ text: t.text ?? '', font: 'Courier New', size: 20 });
      } else if (t.type === 'link') {
        out.push({ ...base, text: flatText(t), color: '0563C1', underline: {} });
      } else if (t.type === 'br') {
        out.push({ text: '', break: 1 });
      } else {
        const s = flatText(t);
        if (s) out.push({ text: s, ...base });
      }
    }
    return out;
  }

  function makeRuns(toks: any[]) {
    return inlineToRunOpts(toks).map((o) => new TextRun(o as any));
  }

  const HEADING_LEVELS = [
    HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
  ];

  function blockToDocx(token: any): any[] {
    if (token.type === 'heading') {
      return [new Paragraph({
        heading: HEADING_LEVELS[Math.min(token.depth - 1, 5)],
        children: makeRuns(token.tokens ?? [{ type: 'text', text: token.text }]),
      })];
    }
    if (token.type === 'paragraph') {
      return [new Paragraph({ children: makeRuns(token.tokens ?? []) })];
    }
    if (token.type === 'list') {
      return (token.items as any[]).flatMap((item) => {
        const inlineToks = item.tokens?.flatMap((t: any) =>
          t.type === 'paragraph' ? (t.tokens ?? []) : [{ type: 'text', text: flatText(t) }],
        ) ?? [{ type: 'text', text: item.text }];
        return [new Paragraph({
          children: makeRuns(inlineToks),
          numbering: { reference: token.ordered ? 'ordered-list' : 'bullet-list', level: 0 },
        })];
      });
    }
    if (token.type === 'code') {
      return (token.text as string).split('\n').map((line: string) =>
        new Paragraph({ children: [new TextRun({ text: line, font: 'Courier New', size: 18 })] }),
      );
    }
    if (token.type === 'table') {
      const t = token as any;
      return [new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          new TableRow({
            tableHeader: true,
            children: (t.header as any[]).map((h: any) =>
              new TableCell({
                shading: { fill: 'F0F0F0' } as any,
                children: [new Paragraph({ children: [new TextRun({ text: flatText(h), bold: true })] })],
              }),
            ),
          }),
          ...(t.rows as any[][]).map((row) =>
            new TableRow({
              children: row.map((cell: any) =>
                new TableCell({
                  children: [new Paragraph({ children: makeRuns(cell.tokens ?? [{ type: 'text', text: flatText(cell) }]) })],
                }),
              ),
            }),
          ),
        ],
      })];
    }
    if (token.type === 'blockquote') {
      return (token.tokens as any[]).flatMap((t: any) =>
        t.type === 'paragraph'
          ? [new Paragraph({ children: makeRuns(t.tokens ?? []), indent: { left: 720 } })]
          : blockToDocx(t),
      );
    }
    if (token.type === 'hr') {
      return [new Paragraph({ thematicBreak: true })];
    }
    if (token.type === 'space') return [];
    const s = flatText(token);
    return s ? [new Paragraph({ text: s })] : [];
  }

  const children: any[] = tokens.flatMap(blockToDocx);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullet-list',
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        {
          reference: 'ordered-list',
          levels: [{
            level: 0, format: LevelFormat.DECIMAL, text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

async function markdownToPng(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const { marked } = await import('marked');
  const html2canvas = (await import('html2canvas')).default;

  const text = await file.text();
  const htmlContent = String(marked.parse(text));
  onProgress?.(10);

  const div = document.createElement('div');
  div.style.cssText =
    'position:fixed;left:-9999px;top:0;width:800px;padding:40px;' +
    'background:white;font-family:system-ui,sans-serif;font-size:16px;' +
    'line-height:1.6;color:#24292e;box-sizing:border-box';
  div.innerHTML =
    '<style>' +
    'h1,h2{border-bottom:1px solid #eaecef;padding-bottom:.3em}' +
    'h1{font-size:2em;margin:.67em 0}h2{font-size:1.5em}h3{font-size:1.25em}' +
    'code{background:#f6f8fa;border-radius:3px;padding:.2em .4em;font-family:monospace;font-size:.85em}' +
    'pre{background:#f6f8fa;border-radius:6px;padding:16px}pre code{background:none;padding:0}' +
    'blockquote{border-left:4px solid #dfe2e5;color:#6a737d;padding:0 1em;margin:0}' +
    'table{border-collapse:collapse;width:100%}th,td{border:1px solid #dfe2e5;padding:6px 13px}' +
    'th{background:#f6f8fa;font-weight:600}' +
    '</style>' +
    htmlContent;
  document.body.appendChild(div);

  try {
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, logging: false });
    onProgress?.(90);
    return new Promise<Blob>((res, rej) => {
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG export failed'))), 'image/png');
    });
  } finally {
    document.body.removeChild(div);
  }
}

// ── Markdown table extraction ─────────────────────────────────────────────────

function flatTextFromToken(token: any): string {
  if (typeof token.text === 'string') return token.text;
  if (Array.isArray(token.tokens)) return token.tokens.map(flatTextFromToken).join('');
  return '';
}

async function extractMdTables(text: string): Promise<{ header: string[]; rows: string[][] }[]> {
  const { marked } = await import('marked');
  const tokens = marked.lexer(text);
  const tables: { header: string[]; rows: string[][] }[] = [];
  for (const token of tokens) {
    if (token.type === 'table') {
      const t = token as any;
      tables.push({
        header: (t.header as any[]).map(flatTextFromToken),
        rows: (t.rows as any[][]).map((row) => row.map(flatTextFromToken)),
      });
    }
  }
  return tables;
}

async function markdownToCsv(file: File): Promise<Blob> {
  const text = await file.text();
  const tables = await extractMdTables(text);
  if (!tables.length) {
    throw new Error(
      'No Markdown table found. The file must contain at least one table (syntax: | col | col |).',
    );
  }
  const XLSX = (await import('xlsx')).default;
  const { header, rows } = tables[0];
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  return new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv' });
}

async function markdownToXlsx(file: File): Promise<Blob> {
  const text = await file.text();
  const tables = await extractMdTables(text);
  if (!tables.length) {
    throw new Error(
      'No Markdown table found. The file must contain at least one table (syntax: | col | col |).',
    );
  }
  const XLSX = (await import('xlsx')).default;
  const wb = XLSX.utils.book_new();
  tables.forEach(({ header, rows }, i) => {
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, `Tableau ${i + 1}`);
  });
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  return new Blob([buf.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

async function markdownToJson(file: File): Promise<Blob> {
  const { marked } = await import('marked');
  const text = await file.text();
  const tokens = marked.lexer(text);

  function simplify(token: any): any {
    const out: any = { type: token.type };
    if (token.depth !== undefined) out.depth = token.depth;
    if (typeof token.text === 'string') out.text = token.text;
    if (token.lang) out.lang = token.lang;
    if (token.ordered !== undefined) out.ordered = token.ordered;
    if (Array.isArray(token.tokens) && token.tokens.length) out.children = token.tokens.map(simplify);
    if (Array.isArray(token.items)) {
      out.items = token.items.map((item: any) => ({
        text: item.text,
        children: (item.tokens ?? []).map(simplify),
      }));
    }
    if (Array.isArray(token.header)) {
      out.header = (token.header as any[]).map(flatTextFromToken);
      out.rows = ((token.rows ?? []) as any[][]).map((row) => row.map(flatTextFromToken));
    }
    return out;
  }

  const structure = { type: 'document', children: tokens.filter((t) => t.type !== 'space').map(simplify) };
  return new Blob([JSON.stringify(structure, null, 2)], { type: 'application/json' });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ── Converter plugin ──────────────────────────────────────────────────────────

const DOCX_OUTPUTS = ['html', 'txt', 'md'];
const MD_OUTPUTS = ['html', 'txt', 'pdf', 'docx', 'csv', 'xlsx', 'json', 'png'];
const HTML_OUTPUTS = ['md', 'txt'];
const TXT_OUTPUTS = ['pdf', 'md'];
const PDF_DOC_OUTPUTS = ['txt', 'md'];

export const documentConverter: ConverterPlugin = {
  name: 'documents',
  category: 'document',
  inputFormats: ['docx', 'doc', 'md', 'html', 'htm', 'txt', 'pdf'],
  outputFormats: (input: string): string[] => {
    switch (input) {
      case 'docx':
      case 'doc': return DOCX_OUTPUTS;
      case 'md': return MD_OUTPUTS;
      case 'html':
      case 'htm': return HTML_OUTPUTS;
      case 'txt': return TXT_OUTPUTS;
      case 'pdf': return PDF_DOC_OUTPUTS;
      default: return [];
    }
  },
  convert: async (
    file: File,
    targetFormat: string,
    _options: ConversionOptions,
    onProgress?: (pct: number) => void,
  ): Promise<Blob> => {
    onProgress?.(10);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    let result: Blob;

    if ((ext === 'docx' || ext === 'doc') && targetFormat === 'html') result = await docxToHtml(file);
    else if ((ext === 'docx' || ext === 'doc') && targetFormat === 'txt') result = await docxToText(file);
    else if ((ext === 'docx' || ext === 'doc') && targetFormat === 'md') result = await docxToMarkdown(file);
    else if (ext === 'md' && targetFormat === 'html') result = await markdownToHtml(file);
    else if (ext === 'md' && targetFormat === 'txt') result = await markdownToText(file);
    else if (ext === 'md' && targetFormat === 'pdf') result = await markdownToPdf(file, onProgress);
    else if (ext === 'md' && targetFormat === 'docx') result = await markdownToDocx(file);
    else if (ext === 'md' && targetFormat === 'csv') result = await markdownToCsv(file);
    else if (ext === 'md' && targetFormat === 'xlsx') result = await markdownToXlsx(file);
    else if (ext === 'md' && targetFormat === 'json') result = await markdownToJson(file);
    else if (ext === 'md' && targetFormat === 'png') result = await markdownToPng(file, onProgress);
    else if ((ext === 'html' || ext === 'htm') && targetFormat === 'md') result = await htmlToMarkdown(file);
    else if ((ext === 'html' || ext === 'htm') && targetFormat === 'txt') result = await htmlToText(file);
    else if (ext === 'txt' && targetFormat === 'pdf') result = await textToPdf(file);
    else if (ext === 'txt' && targetFormat === 'md') result = await txtToMarkdown(file);
    else if (ext === 'pdf' && targetFormat === 'txt') result = await pdfToText(file);
    else if (ext === 'pdf' && targetFormat === 'md') result = await pdfToMarkdown(file, onProgress);
    else throw new Error(`Unsupported conversion: ${ext} → ${targetFormat}`);

    onProgress?.(100);
    return result;
  },
};
