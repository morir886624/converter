/**
 * Plausible Analytics — privacy-respecting, no cookies, no personal data.
 * Only anonymous conversion-type metadata is sent (e.g. "jpg-to-pdf").
 * No file names, file contents, or user-identifiable information ever leave the device.
 *
 * Fails silently when Plausible is not loaded (dev mode, ad blocker, SSR).
 */

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

function send(event: string, props?: Record<string, string>): void {
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // Script not loaded or blocked — silently ignored
  }
}

/** Normalise a format key to a human-readable tag (no personal data). */
function formatType(from: string, to: string): string {
  return `${from.toLowerCase()}-to-${to.toLowerCase()}`;
}

export function trackConversionStarted(from: string, to: string): void {
  send('Conversion Started', { type: formatType(from, to) });
}

export function trackConversionSuccess(from: string, to: string): void {
  send('Conversion Success', { type: formatType(from, to) });
}

export function trackConversionError(from: string, to: string): void {
  send('Conversion Error', { type: formatType(from, to) });
}
