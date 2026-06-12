import * as XLSX from 'xlsx';
import yaml from 'js-yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

type WorkerMessage = {
  id: string;
  op: string;
  input: ArrayBuffer;
  opts: { delimiter?: string; mdMode?: 'code' | 'table' };
};

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, op, input, opts } = e.data;
  try {
    const result = await runOp(op, input, opts);
    (self as unknown as Worker).postMessage({ id, result }, [result]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: (err as Error).message });
  }
};

function aoaToMdTable(aoa: unknown[][]): string {
  const escape = (s: unknown) =>
    String(s ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  const header = (aoa[0] ?? []).map(escape);
  const rows = aoa.slice(1);
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => {
      const cells = Array.from({ length: header.length }, (_, i) => escape(row[i]));
      return `| ${cells.join(' | ')} |`;
    }),
  ].join('\n');
}

async function runOp(
  op: string,
  input: ArrayBuffer,
  opts: { delimiter?: string; mdMode?: 'code' | 'table' },
): Promise<ArrayBuffer> {
  const delimiter = opts.delimiter ?? ',';

  // ── XLSX ──────────────────────────────────────────────────────────────────
  if (op === 'xlsx-to-csv') {
    const wb = XLSX.read(input, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return encode(XLSX.utils.sheet_to_csv(ws, { FS: delimiter }));
  }
  if (op === 'xlsx-to-json') {
    const wb = XLSX.read(input, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return encode(JSON.stringify(XLSX.utils.sheet_to_json(ws), null, 2));
  }
  if (op === 'xlsx-to-md') {
    const wb = XLSX.read(input, { type: 'array' });
    const parts: string[] = [];
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
      if (aoa.length) parts.push(`## ${name}\n\n${aoaToMdTable(aoa)}`);
    }
    return encode(parts.join('\n\n'));
  }
  if (op === 'csv-to-xlsx') {
    const text = new TextDecoder().decode(input);
    const ws = XLSX.utils.aoa_to_sheet(
      text.split('\n').map((row) => row.split(delimiter)),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return (XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array).buffer as ArrayBuffer;
  }
  if (op === 'json-to-xlsx') {
    const text = new TextDecoder().decode(input);
    const data = JSON.parse(text);
    const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return (XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array).buffer as ArrayBuffer;
  }

  // ── CSV ↔ JSON / MD ───────────────────────────────────────────────────────
  if (op === 'csv-to-json') {
    const text = new TextDecoder().decode(input);
    const wb = XLSX.read(text, { type: 'string' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return encode(JSON.stringify(XLSX.utils.sheet_to_json(ws), null, 2));
  }
  if (op === 'csv-to-md') {
    const text = new TextDecoder().decode(input);
    const wb = XLSX.read(text, { type: 'string' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    return encode(aoa.length ? aoaToMdTable(aoa) : '');
  }
  if (op === 'json-to-csv') {
    const text = new TextDecoder().decode(input);
    const data = JSON.parse(text);
    const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
    return encode(XLSX.utils.sheet_to_csv(ws, { FS: delimiter }));
  }

  // ── JSON ↔ YAML / XML / MD ───────────────────────────────────────────────
  if (op === 'json-to-yaml') {
    const text = new TextDecoder().decode(input);
    return encode(yaml.dump(JSON.parse(text)));
  }
  if (op === 'json-to-xml') {
    const text = new TextDecoder().decode(input);
    const builder = new XMLBuilder({ format: true, indentBy: '  ' });
    return encode(builder.build({ root: JSON.parse(text) }));
  }
  if (op === 'json-to-md') {
    const text = new TextDecoder().decode(input);
    const data = JSON.parse(text);
    if (
      opts.mdMode === 'table' &&
      Array.isArray(data) &&
      data.length > 0 &&
      data[0] !== null &&
      typeof data[0] === 'object' &&
      !Array.isArray(data[0])
    ) {
      const keys = Object.keys(data[0] as object);
      const aoa = [
        keys,
        ...(data as Record<string, unknown>[]).map((row) => keys.map((k) => row[k])),
      ];
      return encode(aoaToMdTable(aoa));
    }
    return encode(`\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``);
  }

  // ── YAML ↔ JSON / XML / MD ───────────────────────────────────────────────
  if (op === 'yaml-to-json') {
    const text = new TextDecoder().decode(input);
    return encode(JSON.stringify(yaml.load(text), null, 2));
  }
  if (op === 'yaml-to-xml') {
    const text = new TextDecoder().decode(input);
    const obj = yaml.load(text);
    const builder = new XMLBuilder({ format: true, indentBy: '  ' });
    return encode(builder.build({ root: obj }));
  }
  if (op === 'yaml-to-md') {
    return encode(`\`\`\`yaml\n${new TextDecoder().decode(input).trim()}\n\`\`\``);
  }

  // ── XML ↔ JSON / YAML / MD ───────────────────────────────────────────────
  if (op === 'xml-to-json') {
    const text = new TextDecoder().decode(input);
    const parser = new XMLParser({ ignoreAttributes: false });
    return encode(JSON.stringify(parser.parse(text), null, 2));
  }
  if (op === 'xml-to-yaml') {
    const text = new TextDecoder().decode(input);
    const parser = new XMLParser({ ignoreAttributes: false });
    return encode(yaml.dump(parser.parse(text)));
  }
  if (op === 'xml-to-md') {
    return encode(`\`\`\`xml\n${new TextDecoder().decode(input).trim()}\n\`\`\``);
  }

  throw new Error(`Unknown operation: ${op}`);
}

function encode(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}
