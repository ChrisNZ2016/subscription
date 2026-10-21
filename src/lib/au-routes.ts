import { isAuSite } from './site';

/**
 * Paths for the Australian demand test.
 *
 * On the AU build (`VITE_SITE=au`) the test owns the whole origin, so it sits at
 * `/` and `/sold-out`. On the NZ build the same pages stay reachable under `/au`
 * so they can be previewed on an NZ deploy — with NZ env values, which is why
 * that preview must never be the thing an ad points at.
 */
export const AU_BASE = isAuSite() ? '' : '/au';

export const AU_LANDING_PATH = AU_BASE || '/';
export const AU_SOLD_OUT_PATH = `${AU_BASE}/sold-out`;

function normalize(path: string): string {
  return path.replace(/\/+$/, '') || '/';
}

/** Does this path belong to the AU test at all? Always true on the AU build. */
export function isAuPath(path: string): boolean {
  if (isAuSite()) return true;
  const p = normalize(path);
  return p === '/au' || p.startsWith('/au/');
}

export function isSoldOutPath(path: string): boolean {
  return normalize(path) === normalize(AU_SOLD_OUT_PATH);
}

/** Keeps the campaign's query string (UTMs, click ids) across the CTA hop. */
export function withSearch(path: string): string {
  return `${path}${window.location.search}`;
}
