import { useState, useEffect, type ReactNode } from 'react';
import DOMPurify from 'dompurify';
import type { FileItem } from '../types';

interface Props {
  item: FileItem;
}

function TextPreview({ file }: { file: File }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    file.text().then((t) => { if (!cancelled) setText(t.slice(0, 1500)); });
    return () => { cancelled = true; };
  }, [file]);

  if (text === null) {
    return <p className="text-xs text-slate-400 dark:text-slate-500 italic">Loading…</p>;
  }
  return (
    <pre className="
      text-xs font-mono whitespace-pre-wrap break-words
      max-h-36 overflow-auto
      p-2.5 rounded-lg
      bg-slate-100 dark:bg-slate-800
      text-slate-700 dark:text-slate-300
      border border-slate-200 dark:border-slate-700
    ">
      {text}{text.length >= 1500 ? '\n…' : ''}
    </pre>
  );
}

function MarkdownPreview({ file }: { file: File }) {
  const [html, setHtml] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [tab, setTab] = useState<'render' | 'source'>('render');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const text = await file.text();
      if (cancelled) return;
      setSource(text.slice(0, 3000));
      const { marked } = await import('marked');
      const rendered = DOMPurify.sanitize(String(marked.parse(text)));
      if (!cancelled) setHtml(rendered);
    })();
    return () => { cancelled = true; };
  }, [file]);

  const tabBtn = (id: 'render' | 'source', label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`text-xs px-2 py-0.5 rounded transition-colors ${
        tab === id
          ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-medium'
          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex gap-1 mb-1.5">
        {tabBtn('render', 'Rendered')}
        {tabBtn('source', 'Source')}
      </div>
      {tab === 'render' ? (
        html === null ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">Loading…</p>
        ) : (
          <div
            className="
              max-h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600
              p-3 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200
              [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-2
              [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-2
              [&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-1
              [&_p]:mb-2
              [&_code]:bg-slate-100 [&_code]:dark:bg-slate-700 [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs
              [&_pre]:bg-slate-100 [&_pre]:dark:bg-slate-700 [&_pre]:p-2.5 [&_pre]:rounded [&_pre]:overflow-auto [&_pre]:mb-2 [&_pre]:text-xs
              [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:dark:border-slate-600 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_blockquote]:my-1
              [&_table]:border-collapse [&_table]:w-full [&_table]:mb-2 [&_table]:text-xs
              [&_th]:border [&_th]:border-slate-300 [&_th]:dark:border-slate-600 [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold [&_th]:bg-slate-50 [&_th]:dark:bg-slate-700/50
              [&_td]:border [&_td]:border-slate-300 [&_td]:dark:border-slate-600 [&_td]:px-2 [&_td]:py-1
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
              [&_li]:mb-0.5
              [&_a]:text-brand-600 [&_a]:dark:text-brand-400 [&_a]:underline
              [&_hr]:border-slate-200 [&_hr]:dark:border-slate-600 [&_hr]:my-2
            "
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      ) : (
        <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-36 overflow-auto p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {source === null ? '…' : source}
          {source !== null && source.length >= 3000 ? '\n…' : ''}
        </pre>
      )}
    </div>
  );
}

function PreviewLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
      {children}
    </p>
  );
}

export function Preview({ item }: Props) {
  const isPreviewable = item.category === 'image' || item.category === 'document';
  if (!isPreviewable) return null;

  const showBefore = !!(item.previewUrl || item.category === 'document');
  const showAfter = item.status === 'done' && !!(item.resultPreviewUrl || item.category === 'document');

  if (!showBefore && !showAfter) return null;

  const both = showBefore && showAfter;
  const isMdInput = item.extension === 'md';
  const isMdOutput = item.targetFormat === 'md';

  return (
    <div className={`mt-3 ${both ? 'grid grid-cols-2 gap-3' : ''}`}>
      {showBefore && (
        <div>
          <PreviewLabel>Original</PreviewLabel>
          {item.previewUrl ? (
            <img
              src={item.previewUrl}
              alt="original preview"
              className="max-h-36 w-full object-contain rounded-lg border border-slate-200 dark:border-slate-600 bg-[#f8f8f8] dark:bg-slate-700"
            />
          ) : isMdInput ? (
            <MarkdownPreview file={item.file} />
          ) : (
            <TextPreview file={item.file} />
          )}
        </div>
      )}
      {showAfter && item.result && (
        <div>
          <PreviewLabel>Result</PreviewLabel>
          {item.resultPreviewUrl ? (
            <img
              src={item.resultPreviewUrl}
              alt="result preview"
              className={`max-h-36 w-full object-contain rounded-lg border border-slate-200 dark:border-slate-600 ${
                item.targetFormat === 'png-nobg'
                  ? 'bg-checkerboard'
                  : 'bg-[#f8f8f8] dark:bg-slate-700'
              }`}
            />
          ) : isMdOutput ? (
            <MarkdownPreview
              file={new File([item.result], `result.md`, { type: 'text/markdown' })}
            />
          ) : (
            <TextPreview
              file={new File(
                [item.result],
                `result.${item.targetFormat ?? 'txt'}`,
                { type: item.result.type },
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
