/**
 * Per-process LRU of rendered icons, keyed `${sourceUrl}|${variant}`. Source
 * URLs change on re-upload (`?v=` on favicons, fresh keys for logos), so an
 * entry never goes stale — eviction is purely about memory.
 *
 * Failures are remembered briefly too, so a store whose favicon can't be
 * decoded (e.g. a BMP-only ICO) doesn't re-download it on every request.
 */

export type CachedIcon = { body: Buffer; contentType: string; etag: string };

const MAX_ENTRIES = 200;
const FAILURE_TTL_MS = 5 * 60_000;

type Entry = CachedIcon | { failedUntil: number };

const entries = new Map<string, Entry>();

function touch(key: string, entry: Entry) {
  entries.delete(key);
  entries.set(key, entry);
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
}

/** A cached icon, `"failed"` for a recent failure, or undefined on a miss. */
export function getCachedIcon(key: string): CachedIcon | "failed" | undefined {
  const entry = entries.get(key);
  if (!entry) return undefined;
  if ("failedUntil" in entry) {
    if (entry.failedUntil > Date.now()) return "failed";
    entries.delete(key);
    return undefined;
  }
  touch(key, entry);
  return entry;
}

export function setCachedIcon(key: string, icon: CachedIcon) {
  touch(key, icon);
}

export function markIconFailed(key: string) {
  touch(key, { failedUntil: Date.now() + FAILURE_TTL_MS });
}

/** Test hook. */
export function clearIconCache() {
  entries.clear();
}
