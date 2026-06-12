import { useRef } from 'react';
import type { WatermarkOptions, WatermarkPosition } from './types';
import { FONT_OPTIONS } from './types';

const POSITIONS: WatermarkPosition[] = [
  'tl', 'tc', 'tr',
  'ml', 'mc', 'mr',
  'bl', 'bc', 'br',
];

const POS_LABELS: Record<WatermarkPosition, string> = {
  tl: '↖', tc: '↑', tr: '↗',
  ml: '←', mc: '·', mr: '→',
  bl: '↙', bc: '↓', br: '↘',
};

const ROW = 'flex items-center gap-3';
const LBL = 'text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0';

interface Props {
  opts: WatermarkOptions;
  onChange: (opts: WatermarkOptions) => void;
  hasPdf: boolean;
}

export function WatermarkConfig({ opts, onChange, hasPdf }: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof WatermarkOptions>(key: K, value: WatermarkOptions[K]) =>
    onChange({ ...opts, [key]: value });

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {(['text', 'image'] as const).map((t) => (
          <button
            key={t}
            onClick={() => set('type', t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              opts.type === t
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t === 'text' ? '✏️ Texte' : '🖼️ Logo'}
          </button>
        ))}
      </div>

      {opts.type === 'text' ? (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
          {/* Text input */}
          <div className={ROW}>
            <span className={LBL}>Texte</span>
            <input
              type="text"
              value={opts.text}
              onChange={(e) => set('text', e.target.value)}
              placeholder="CONFIDENTIEL"
              className="select-field-sm flex-1"
              maxLength={120}
            />
          </div>

          {/* Font */}
          <div className={ROW}>
            <span className={LBL}>Police</span>
            <select
              value={opts.fontFamily}
              onChange={(e) => set('fontFamily', e.target.value)}
              className="select-field-sm flex-1"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.css} value={f.css} style={{ fontFamily: f.css }}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font size */}
          <div className={ROW}>
            <span className={LBL}>Taille (px)</span>
            <input
              type="range" min={10} max={200} step={2}
              value={opts.fontSize}
              onChange={(e) => set('fontSize', Number(e.target.value))}
              className="flex-1 accent-brand-500 h-2 cursor-pointer"
            />
            <span className="text-xs font-mono w-10 text-right text-slate-700 dark:text-slate-300">
              {opts.fontSize}
            </span>
          </div>

          {/* Color */}
          <div className={ROW}>
            <span className={LBL}>Couleur</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={opts.color}
                onChange={(e) => set('color', e.target.value)}
                className="h-7 w-10 rounded border border-slate-300 dark:border-slate-600 cursor-pointer bg-transparent"
              />
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{opts.color}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
          {/* Logo upload */}
          <div className={ROW}>
            <span className={LBL}>Logo (PNG)</span>
            <div className="flex-1 min-w-0">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                {opts.logoFile ? opts.logoFile.name : '📂 Choisir une image'}
              </button>
              {opts.logoFile && (
                <button
                  onClick={() => set('logoFile', undefined)}
                  className="ml-2 text-xs text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) set('logoFile', f);
                  (e.target as HTMLInputElement).value = '';
                }}
              />
            </div>
          </div>

          {/* Logo size */}
          <div className={ROW}>
            <span className={LBL}>Taille (%)</span>
            <input
              type="range" min={2} max={60} step={1}
              value={opts.sizePercent}
              onChange={(e) => set('sizePercent', Number(e.target.value))}
              className="flex-1 accent-brand-500 h-2 cursor-pointer"
            />
            <span className="text-xs font-mono w-10 text-right text-slate-700 dark:text-slate-300">
              {opts.sizePercent}%
            </span>
          </div>
        </div>
      )}

      {/* Common options */}
      <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
        {/* Opacity */}
        <div className={ROW}>
          <span className={LBL}>Opacité</span>
          <input
            type="range" min={5} max={100} step={5}
            value={opts.opacity}
            onChange={(e) => set('opacity', Number(e.target.value))}
            className="flex-1 accent-brand-500 h-2 cursor-pointer"
          />
          <span className="text-xs font-mono w-10 text-right text-slate-700 dark:text-slate-300">
            {opts.opacity}%
          </span>
        </div>

        {/* Rotation */}
        <div className={ROW}>
          <span className={LBL}>Rotation</span>
          <input
            type="range" min={-180} max={180} step={5}
            value={opts.rotation}
            onChange={(e) => set('rotation', Number(e.target.value))}
            className="flex-1 accent-brand-500 h-2 cursor-pointer"
          />
          <span className="text-xs font-mono w-10 text-right text-slate-700 dark:text-slate-300">
            {opts.rotation}°
          </span>
        </div>

        {/* Tile toggle */}
        <label className={`${ROW} cursor-pointer select-none`}>
          <span className={LBL}>Mosaïque</span>
          <button
            type="button"
            role="switch"
            aria-checked={opts.tile}
            onClick={() => set('tile', !opts.tile)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              opts.tile ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                opts.tile ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {opts.tile ? 'Répétition activée' : 'Position unique'}
          </span>
        </label>

        {/* Position grid — hidden when tile is active */}
        {!opts.tile && (
          <div className={ROW}>
            <span className={LBL}>Position</span>
            <div className="grid grid-cols-3 gap-1">
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  onClick={() => set('position', pos)}
                  title={pos}
                  className={`w-8 h-8 flex items-center justify-center rounded text-base transition-colors border ${
                    opts.position === pos
                      ? 'bg-brand-500 text-white border-brand-600'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-brand-400 hover:text-brand-500'
                  }`}
                >
                  {POS_LABELS[pos]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Page range — PDF only */}
      {hasPdf && (
        <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className={ROW}>
            <span className={LBL}>Pages PDF</span>
            <input
              type="text"
              value={opts.pageRange ?? 'all'}
              onChange={(e) => set('pageRange', e.target.value)}
              placeholder='all  ou  "1-3, 5, 8-10"'
              className="select-field-sm flex-1"
            />
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 pl-[6.5rem]">
            Exemples : <code>all</code> · <code>1-3</code> · <code>1, 3, 5-8</code>
          </p>
        </div>
      )}
    </div>
  );
}
