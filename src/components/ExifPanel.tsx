import { useState, useEffect } from 'react';
import type { ExifData } from '../utils/exif';
import { readExif } from '../utils/exif';

const EXIF_EXTENSIONS = new Set(['jpg', 'jpeg', 'tiff', 'tif']);

interface Props {
  file: File;
  extension: string;
  canClean: boolean;
  isCleaned: boolean;
  onClean: () => void;
}

function formatCoord(deg: number, posDir: string, negDir: string): string {
  const dir = deg >= 0 ? posDir : negDir;
  return `${Math.abs(deg).toFixed(5)}° ${dir}`;
}

export function ExifPanel({ file, extension, canClean, isCleaned, onClean }: Props) {
  const [open, setOpen] = useState(false);
  const [exif, setExif] = useState<ExifData | null | 'loading'>('loading');

  useEffect(() => {
    setExif('loading');
    setOpen(false);
    readExif(file).then((data) => {
      setExif(data);
      if (data?.gps) setOpen(true);
    });
  }, [file]);

  if (!EXIF_EXTENSIONS.has(extension)) return null;

  const hasGps = typeof exif === 'object' && exif !== null && !!exif.gps;

  const summaryContent = (
    <span className="flex items-center gap-2 flex-wrap">
      <span className="font-medium text-slate-700 dark:text-slate-200 text-xs">
        Métadonnées EXIF
      </span>
      {isCleaned && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
          ✓ Supprimées
        </span>
      )}
      {!isCleaned && hasGps && (
        <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
          ⚠ Localisation GPS incluse
        </span>
      )}
      {exif === 'loading' && (
        <span className="text-xs text-slate-400 dark:text-slate-500 italic">lecture…</span>
      )}
    </span>
  );

  return (
    <div className="mt-1 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 overflow-hidden">
      <details
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        className="group"
      >
        <summary className="
          flex items-center gap-2 px-3 py-2 cursor-pointer select-none list-none
          hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors
          [&::-webkit-details-marker]:hidden
        ">
          <span
            className="text-slate-400 dark:text-slate-500 text-[10px] transition-transform group-open:rotate-90"
            aria-hidden
          >
            ▶
          </span>
          {summaryContent}
        </summary>

        <div className="px-3 pb-3 space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-2">
          {isCleaned ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <span aria-hidden>✓</span>
              L'image nettoyée ne contient aucune métadonnée EXIF.
            </p>
          ) : exif === 'loading' ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">Analyse en cours…</p>
          ) : exif === null ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">Aucune métadonnée EXIF trouvée.</p>
          ) : (
            <dl className="space-y-1">
              {(exif.make || exif.model) && (
                <Row icon="📷" label="Appareil" value={[exif.make, exif.model].filter(Boolean).join(' · ')} />
              )}
              {exif.dateTaken && (
                <Row icon="📅" label="Date" value={exif.dateTaken} />
              )}
              {exif.gps && (
                <div className="flex items-start gap-2">
                  <span className="w-4 shrink-0 text-center" aria-hidden>📍</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500">Localisation</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {formatCoord(exif.gps.lat, 'N', 'S')}, {formatCoord(exif.gps.lon, 'E', 'O')}
                    </span>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${exif.gps.lat}&mlon=${exif.gps.lon}&zoom=15`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 dark:text-brand-400 underline hover:no-underline w-fit"
                    >
                      Voir sur OpenStreetMap
                    </a>
                  </div>
                </div>
              )}
              {exif.width && exif.height && (
                <Row icon="📐" label="Dimensions" value={`${exif.width} × ${exif.height} px`} />
              )}
              {exif.software && (
                <Row icon="💻" label="Logiciel" value={exif.software} />
              )}
              {exif.orientation && exif.orientation !== 1 && (
                <Row icon="🔄" label="Orientation" value={`${exif.orientation} (correction auto)`} />
              )}
            </dl>
          )}

          {canClean && !isCleaned && exif !== 'loading' && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              {hasGps && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1 mb-2 border border-amber-100 dark:border-amber-800/30">
                  ⚠ Cette photo contient votre localisation GPS. Supprimez-la avant de la partager.
                </p>
              )}
              <button
                type="button"
                onClick={onClean}
                className="btn-ghost text-xs px-3 py-1.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/50 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                🧹 Supprimer toutes les métadonnées
              </button>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-4 shrink-0 text-center" aria-hidden>{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-slate-400 dark:text-slate-500">{label}</span>
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 break-words">{value}</span>
      </div>
    </div>
  );
}
