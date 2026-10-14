/**
 * Bounded-concurrency download of listed storage objects.
 *
 * Shared by the Store Transfer export route and the "Download your site"
 * export (src/lib/site-export/media.ts). Uses the same signed
 * `s3Client.s3.fetch` GET as the rest of src/lib/s3/*, so private buckets work
 * too. Never throws for a single object: a failed GET (non-2xx or network
 * error) yields `buffer: null` and the caller decides how to report it.
 */

import type { ListedObject } from "~/lib/s3/list";
import { s3Client } from "~/lib/s3/client";
import { STORAGE_BUCKET } from "~/lib/s3/url";

// ─── Bounded-concurrency helper ───────────────────────────────────────────────

/**
 * Process an array in chunks of `concurrency`, awaiting each chunk before
 * starting the next. Preserves order of results.
 */
export async function chunkedAsync<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((item, j) => fn(item, i + j)),
    );
    results.push(...chunkResults);
  }
  return results;
}

// ─── downloadStoredObjects ────────────────────────────────────────────────────

export interface DownloadedObject {
  obj: ListedObject;
  /** File bytes, or null when the GET failed (non-2xx or network error). */
  buffer: ArrayBuffer | null;
  /**
   * Response Content-Type, when a 2xx response was received (it can be set
   * even if reading the body then failed and `buffer` is null).
   */
  contentType?: string;
}

/**
 * Download every listed object, `concurrency` at a time. Results are in the
 * same order as `objects`. `onProgress` fires after each object settles.
 */
export async function downloadStoredObjects(
  objects: ListedObject[],
  concurrency = 5,
  onProgress?: (done: number, total: number) => void,
): Promise<DownloadedObject[]> {
  const bucketBase = s3Client.buildBucketUrl(STORAGE_BUCKET);
  const total = objects.length;
  let done = 0;

  return chunkedAsync(objects, concurrency, async (obj) => {
    let buffer: ArrayBuffer | null = null;
    let contentType: string | undefined;

    try {
      const res = await s3Client.s3.fetch(`${bucketBase}/${obj.key}`, {
        method: "GET",
      });
      if (res.ok) {
        contentType = res.headers.get("content-type") ?? undefined;
        buffer = await res.arrayBuffer();
      }
    } catch {
      buffer = null;
    }

    done++;
    onProgress?.(done, total);

    return {
      obj,
      buffer,
      ...(contentType !== undefined ? { contentType } : {}),
    };
  });
}
