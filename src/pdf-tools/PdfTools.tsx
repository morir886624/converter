import { useState } from 'react';
import { PdfMerge } from './PdfMerge';
import { PdfSplit } from './PdfSplit';
import { PdfCompress } from './PdfCompress';
import { PdfRotate } from './PdfRotate';

type Tab = 'merge' | 'split' | 'compress' | 'rotate';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'merge',    label: 'Merge',    icon: '🔗' },
  { id: 'split',    label: 'Split',    icon: '✂️' },
  { id: 'compress', label: 'Compress', icon: '🗜️' },
  { id: 'rotate',   label: 'Rotate',   icon: '🔄' },
];

export function PdfTools() {
  const [tab, setTab] = useState<Tab>('merge');

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span aria-hidden>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
        {tab === 'merge'    && <PdfMerge />}
        {tab === 'split'    && <PdfSplit />}
        {tab === 'compress' && <PdfCompress />}
        {tab === 'rotate'   && <PdfRotate />}
      </div>
    </div>
  );
}
