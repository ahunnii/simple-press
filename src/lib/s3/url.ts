/**
 * Centralised URL ↔ S3 key conversion helpers.
 *
 * All storage helpers (delete, list, presign, usage scanner) import from here
 * so that the URL shape is defined in exactly one place.
 *
 * Public URL shape:
 *   https://{NEXT_PUBLIC_STORAGE_URL}/{NEXT_PUBLIC_STORAGE_BUCKET_NAME}/{key}
 */

import { env } from "~/env";

export const STORAGE_BUCKET = env.NEXT_PUBLIC_STORAGE_BUCKET_NAME;

export const STORAGE_BASE = `https://${env.NEXT_PUBLIC_STORAGE_URL}/${STORAGE_BUCKET}/`;

/**
 * Convert an S3 object key to its canonical public URL.
 */
export function keyToPublicUrl(key: string): string {
  return STORAGE_BASE + key;
}

/**
 * Convert a stored public URL back to its S3 object key.
 *
 * Returns `null` if the URL doesn't match the expected storage base.
 */
export function publicUrlToKey(url: string): string | null {
  if (!url.startsWith(STORAGE_BASE)) return null;
  const key = url.slice(STORAGE_BASE.length);
  return key.length > 0 ? key : null;
}

/**
 * Returns true when the URL points to our own storage bucket.
 *
 * Use this to filter out external / OAuth avatar URLs from the usage index.
 */
export function isStorageUrl(url: string): boolean {
  return url.startsWith(STORAGE_BASE);
}
