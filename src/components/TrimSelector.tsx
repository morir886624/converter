import { useState, useRef, useEffect, useCallback } from 'react';

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function parseTimecode(t: string): number | null {
  const m = t.match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (!m) return null;
  const min = parseInt(m[1]);
  const sec = parseInt(m[2]);
  if (sec >= 60) return null;
  const ms = m[3] ? parseInt(m[3].padEnd(3, '0')) : 0;
  return min * 60 + sec + ms / 1000;
}

interface Props {
  file: File;
  start: number;
  end: number | undefined;
  onChange: (start: number, end: number) => void;
}

export function TrimSelector({ file, start, end, onChange }: Props) {
  const [duration, setDuration] = useState<number | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [startText, setStartText] = useState(fmt(start));
  const [endText, setEndText] = useState(end != null ? fmt(end) : '');
  const [previewing, setPreviewing] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const previewHandlerRef = useRef<(() => void) | null>(null);

  // Stable refs so callbacks don't capture stale closure values
  const onChangeRef = useRef(onChange);
  const startRef = useRef(start);
  const endRef = useRef(end);
  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => { startRef.current = start; });
  useEffect(() => { endRef.current = end; });

  const isVideo = /^video\//.test(file.type) || /\.(mp4|webm|avi|mov|mkv)$/i.test(file.name);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleLoadedMetadata = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (isFinite(el.duration) && el.duration > 0) {
      const d = el.duration;
      setDuration(d);
      if (endRef.current === undefined) onChangeRef.current(startRef.current, d);
    } else if (!isFinite(el.duration)) {
      // VBR MP3 / headerless streams report Infinity until we seek past the end
      el.currentTime = 1e9;
    }
  }, []); // stable — reads values via refs

  const handleDurationChange = useCallback(() => {
    const el = mediaRef.current;
    if (!el || !isFinite(el.duration) || el.duration <= 0) return;
    const d = el.duration;
    setDuration(d);
    if (el.currentTime > d) el.currentTime = 0; // reset after seek trick
    if (endRef.current === undefined) onChangeRef.current(startRef.current, d);
  }, []); // stable — reads values via refs

  useEffect(() => { setStartText(fmt(start)); }, [start]);
  useEffect(() => { if (end !== undefined) setEndText(fmt(end)); }, [end]);

  const d = duration ?? 1;
  const effectiveEnd = end ?? duration ?? d;
  const startPct = Math.max(0, Math.min(100, (start / d) * 100));
  const endPct = Math.max(0, Math.min(100, (effectiveEnd / d) * 100));

  const getValFromX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(d, ((clientX - rect.left) / rect.width) * d));
  }, [d]);

  // Start handle drag via pointer capture
  const handleStartPD = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleStartPM = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const val = getValFromX(e.clientX);
    onChange(Math.max(0, Math.min(val, effectiveEnd - 0.05)), effectiveEnd);
  };

  // End handle drag via pointer capture
  const handleEndPD = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleEndPM = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const val = getValFromX(e.clientX);
    onChange(start, Math.min(d, Math.max(val, start + 0.05)));
  };

  // Timecode field commit
  const handleStartBlur = () => {
    const p = parseTimecode(startText);
    if (p !== null && p >= 0 && p < effectiveEnd) onChange(p, effectiveEnd);
    else setStartText(fmt(start));
  };
  const handleEndBlur = () => {
    const p = parseTimecode(endText);
    if (p !== null && p > start && p <= d) onChange(start, p);
    else setEndText(fmt(effectiveEnd));
  };

  // Preview
  const clearPreview = useCallback(() => {
    const el = mediaRef.current;
    if (el && previewHandlerRef.current) {
      el.removeEventListener('timeupdate', previewHandlerRef.current);
    }
    previewHandlerRef.current = null;
    setPreviewing(false);
  }, []);

  const handlePreview = useCallback(() => {
    const el = mediaRef.current;
    if (!el || duration === null) return;
    if (previewing) { clearPreview(); el.pause(); return; }
    clearPreview();
    const eff = endRef.current ?? duration;
    const handler = () => {
      if (el.currentTime >= eff) { el.pause(); clearPreview(); }
    };
    previewHandlerRef.current = handler;
    el.addEventListener('timeupdate', handler);
    el.currentTime = startRef.current;
    el.play().catch(() => {});
    setPreviewing(true);
  }, [previewing, duration, clearPreview]);

  useEffect(() => () => { clearPreview(); }, [clearPreview]);

  const TIMECODE_CLS = 'w-24 font-mono text-xs text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400 dark:focus:ring-brand-500';

  return (
    <div className="space-y-2.5 pt-1">
      {/* Media element (hidden for audio, visible for video) */}
      {objectUrl && (
        isVideo ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={objectUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={handleDurationChange}
            preload="metadata"
            className="w-full rounded-md bg-black"
            style={{ maxHeight: '160px', objectFit: 'contain' }}
          />
        ) : (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={objectUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={handleDurationChange}
            preload="metadata"
          />
        )
      )}

      {duration === null && (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">Reading duration…</p>
      )}

      {duration !== null && (
        <>
          {/* Timeline track */}
          <div
            ref={trackRef}
            className="relative h-5 rounded-full bg-slate-200 dark:bg-slate-600 select-none overflow-visible"
          >
            {/* Selected region highlight */}
            <div
              className="absolute top-0 bottom-0 bg-brand-400/50 dark:bg-brand-500/40"
              style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
            />
            {/* Start thumb */}
            <div
              onPointerDown={handleStartPD}
              onPointerMove={handleStartPM}
              className="absolute top-0 bottom-0 w-3 bg-brand-600 dark:bg-brand-400 rounded-l-full cursor-ew-resize touch-none z-10 hover:brightness-125"
              style={{ left: `${startPct}%` }}
              title="Drag to set start point"
            />
            {/* End thumb */}
            <div
              onPointerDown={handleEndPD}
              onPointerMove={handleEndPM}
              className="absolute top-0 bottom-0 w-3 bg-brand-600 dark:bg-brand-400 rounded-r-full cursor-ew-resize touch-none z-10 hover:brightness-125"
              style={{ left: `calc(${endPct}% - 0.75rem)` }}
              title="Drag to set end point"
            />
          </div>

          {/* Timecodes + preview button */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 dark:text-slate-500 shrink-0">From</span>
            <input
              value={startText}
              onChange={(e) => setStartText(e.target.value)}
              onBlur={handleStartBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleStartBlur()}
              className={TIMECODE_CLS}
              title="mm:ss.ms"
            />
            <span className="text-slate-400 dark:text-slate-500 shrink-0">to</span>
            <input
              value={endText}
              onChange={(e) => setEndText(e.target.value)}
              onBlur={handleEndBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleEndBlur()}
              className={TIMECODE_CLS}
              title="mm:ss.ms"
            />
            <button
              onClick={handlePreview}
              className={`ml-auto btn-ghost text-xs px-2.5 py-1 shrink-0 ${previewing ? 'text-brand-600 dark:text-brand-400' : ''}`}
            >
              {previewing ? '⏹ Stop' : '▶ Preview'}
            </button>
          </div>

          {/* Duration info */}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {fmt(Math.max(0, effectiveEnd - start))} selected / {fmt(duration)} total
          </p>
        </>
      )}
    </div>
  );
}
