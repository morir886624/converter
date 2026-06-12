import { useState } from 'react';
import { ImageBgRemoval } from './ImageBgRemoval';
import { ImageCompress } from './ImageCompress';
import { ImageResize } from './ImageResize';
import { ImageExifCleaner } from './ImageExifCleaner';

type Tab = 'bg-removal' | 'compress' | 'resize' | 'exif';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'bg-removal', label: 'Remove background', icon: '✨' },
  { id: 'compress',   label: 'Compress',           icon: '🗜️' },
  { id: 'resize',     label: 'Resize',             icon: '↔️' },
  { id: 'exif',       label: 'EXIF / Vie privée',  icon: '🔒' },
];

export function ImageTools() {
  const [tab, setTab] = useState<Tab>('bg-removal');

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
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
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden text-xs">{label.split(' ').slice(-1)[0]}</span>
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
        {tab === 'bg-removal' && <ImageBgRemoval />}
        {tab === 'compress'   && <ImageCompress />}
        {tab === 'resize'     && <ImageResize />}
        {tab === 'exif'       && <ImageExifCleaner />}
      </div>
    </div>
  );
}
