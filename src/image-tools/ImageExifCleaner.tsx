import { useState, useEffect } from 'react';
import { ToolDropZone } from './ToolDropZone';
import { ProgressBar } from '../components/ProgressBar';
import { downloadBlob, formatBytes } from '../utils/download';
import { readExif } from '../utils/exif';
import type { ExifData } from '../utils/exif';
import { exifCleanerConverter } from '../converters/exifCleaner';

type State = 'idle' | 'processing' | 'done' | 'error';

function formatCoord(deg: number, posDir: string, negDir: string): string {
  return `${Math.abs(deg).toFixed(5)}° ${deg >= 0 ? posDir : negDir}`;
}

function ExifRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-4 shrink-0 text-center" aria-hidden>{icon}</span>
      <span className="text-slate-400 dark:text-slate-500 w-20 shrink-0">{label}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200 break-words min-w-0">{value}</span>
    </div>
  );
}

export function ImageExifCleaner() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [exif, setExif] = useState<ExifData | null | 'loading'>(null);
  const [state, setState] = useState<State>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResultUrl(null);
    setResultBlob(null);
    setState('idle');
    setError(null);
    setProgress(0);
    setExif('loading');
    readExif(f).then(setExif);
  };

  const clean = async () => {
    if (!file) return;
    setState('processing');
    setProgress(0);
    setError(null);
    try {
      const blob = await exifCleanerConverter.convert(file, 'jpg-clean', {}, setProgress);
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setState('done');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const download = () => {
    if (!resultBlob || !file) return;
    const base = file.name.replace(/\.[^.]+$/, '');
    downloadBlob(resultBlob, `${base}-clean.jpg`);
  };

  const hasGps = typeof exif === 'object' && exif !== null && !!exif.gps;
  const hasExif = typeof exif === 'object' && exif !== null;

  return (
    <div className="space-y-4">
      <ToolDropZone
        file={file}
        onFile={handleFile}
        accept="image/jpeg"
        acceptLabel="JPEG / JPG"
        icon="🔒"
        disabled={state === 'processing'}
      />

      {/* EXIF display */}
      {file && exif === 'loading' && (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center">
          Lecture des métadonnées…
        </p>
      )}

      {file && hasGps && state !== 'done' && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3.5 py-3">
          <span className="text-lg shrink-0" aria-hidden>⚠️</span>
          <div className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
            <p className="font-semibold">Cette photo contient votre localisation GPS.</p>
            <p className="text-amber-700 dark:text-amber-400">Supprimez les métadonnées avant de la partager en ligne.</p>
          </div>
        </div>
      )}

      {file && hasExif && (
        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
            Métadonnées trouvées
          </p>
          {(exif.make || exif.model) && (
            <ExifRow icon="📷" label="Appareil" value={[exif.make, exif.model].filter(Boolean).join(' · ')} />
          )}
          {exif.dateTaken && (
            <ExifRow icon="📅" label="Date" value={exif.dateTaken} />
          )}
          {exif.gps && (
            <div className="flex items-start gap-2 text-xs">
              <span className="w-4 shrink-0 text-center" aria-hidden>📍</span>
              <span className="text-slate-400 dark:text-slate-500 w-20 shrink-0">Localisation</span>
              <div className="min-w-0">
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {formatCoord(exif.gps.lat, 'N', 'S')}, {formatCoord(exif.gps.lon, 'E', 'O')}
                </p>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${exif.gps.lat}&mlon=${exif.gps.lon}&zoom=15`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 dark:text-brand-400 underline hover:no-underline"
                >
                  Voir sur la carte
                </a>
              </div>
            </div>
          )}
          {exif.width && exif.height && (
            <ExifRow icon="📐" label="Dimensions" value={`${exif.width} × ${exif.height} px`} />
          )}
          {exif.software && (
            <ExifRow icon="💻" label="Logiciel" value={exif.software} />
          )}
        </div>
      )}

      {file && exif !== 'loading' && !hasExif && state === 'idle' && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Aucune métadonnée EXIF détectée dans ce fichier.
        </p>
      )}

      {/* Action */}
      {file && state !== 'processing' && (
        <button
          onClick={state === 'done' ? () => { setResultUrl(null); setResultBlob(null); setState('idle'); } : clean}
          className={state === 'done' ? 'btn-ghost' : 'btn-primary'}
        >
          {state === 'done' ? '↺ Recommencer' : '🧹 Supprimer toutes les métadonnées'}
        </button>
      )}

      {state === 'processing' && (
        <div className="space-y-1">
          <ProgressBar value={progress} />
          <p className="text-right text-xs text-slate-400 dark:text-slate-500">{progress}%</p>
        </div>
      )}

      {state === 'error' && error && (
        <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border border-red-100 dark:border-red-800/30">
          {error}
        </p>
      )}

      {/* Before / After */}
      {(previewUrl || resultUrl) && (
        <div className={`grid gap-3 ${previewUrl && resultUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {previewUrl && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
                Original
              </p>
              <img
                src={previewUrl}
                alt="original"
                className="w-full max-h-56 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f8f8] dark:bg-slate-700"
              />
              {file && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center">
                  {formatBytes(file.size)}
                </p>
              )}
            </div>
          )}

          {resultUrl && resultBlob && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1.5">
                ✓ Sans métadonnées
              </p>
              <img
                src={resultUrl}
                alt="nettoyé"
                className="w-full max-h-56 object-contain rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-[#f8f8f8] dark:bg-slate-700"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-center">
                {formatBytes(resultBlob.size)} · 0 métadonnée
              </p>
              <button onClick={download} className="btn-success mt-2 w-full text-sm">
                ⬇ Télécharger
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
