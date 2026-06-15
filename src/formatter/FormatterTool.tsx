import { useState, useCallback } from 'react';

type Lang = 'json' | 'xml' | 'sql';
type Mode = 'pretty' | 'minify';

const LANGS: { id: Lang; label: string }[] = [
  { id: 'json', label: 'JSON' },
  { id: 'xml',  label: 'XML'  },
  { id: 'sql',  label: 'SQL'  },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function formatJson(input: string, mode: Mode): string {
  const parsed = JSON.parse(input);
  return mode === 'pretty'
    ? JSON.stringify(parsed, null, 2)
    : JSON.stringify(parsed);
}

async function formatXml(input: string, mode: Mode): Promise<string> {
  const { XMLParser, XMLBuilder } = await import('fast-xml-parser');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const obj = parser.parse(input);
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: mode === 'pretty',
    indentBy: '  ',
    suppressEmptyNode: false,
  });
  return builder.build(obj) as string;
}

async function formatSql(input: string, mode: Mode): Promise<string> {
  const { format } = await import('sql-formatter');
  if (mode === 'minify') {
    return input.replace(/\s+/g, ' ').trim();
  }
  return format(input, { language: 'sql', tabWidth: 2, keywordCase: 'upper' });
}

async function run(lang: Lang, mode: Mode, input: string): Promise<string> {
  switch (lang) {
    case 'json': return formatJson(input, mode);
    case 'xml':  return formatXml(input, mode);
    case 'sql':  return formatSql(input, mode);
  }
}

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn-ghost text-xs px-3 py-1.5"
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const PLACEHOLDERS: Record<Lang, string> = {
  json: '{\n  "name": "example",\n  "value": 42\n}',
  xml:  '<root><item id="1"><name>Example</name></item></root>',
  sql:  'SELECT id, name FROM users WHERE active = 1 ORDER BY name',
};

export function FormatterTool() {
  const [lang, setLang] = useState<Lang>('json');
  const [mode, setMode] = useState<Mode>('pretty');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async () => {
    if (!input.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const result = await run(lang, mode, input.trim());
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Formatting failed');
      setOutput('');
    } finally {
      setRunning(false);
    }
  }, [lang, mode, input]);

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Code Formatter</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Pretty-print or minify JSON, XML and SQL — 100% local
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Language */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
          {LANGS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setLang(id); setOutput(''); setError(null); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                lang === id
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mode */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
          {(['pretty', 'minify'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                mode === m
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button onClick={handleClear} className="btn-ghost text-xs px-3 py-1.5 ml-auto">
          🗑 Clear
        </button>
      </div>

      {/* Two-column editor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Input */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Input</p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={14}
            spellCheck={false}
            placeholder={PLACEHOLDERS[lang]}
            className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 resize-y focus:outline-none focus:ring-2 focus:ring-brand-400 dark:focus:ring-brand-500 leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Output</p>
            {output && <CopyButton text={output} />}
          </div>
          <textarea
            value={output}
            readOnly
            rows={14}
            spellCheck={false}
            placeholder="Result will appear here…"
            className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 resize-y focus:outline-none focus:ring-2 focus:ring-brand-300 leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30 font-mono break-all">
          {error}
        </p>
      )}

      <button
        onClick={handleRun}
        disabled={!input.trim() || running}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {running ? '⏳ Formatting…' : `⚡ ${mode === 'pretty' ? 'Prettify' : 'Minify'}`}
      </button>
    </div>
  );
}
