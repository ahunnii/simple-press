/**
 * Best-effort S3/MinIO object deletion helper.
 *
 * Parses stored public URLs back to their S3 object key and issues a signed
 * DELETE request using the same `s3Client` used for uploads.  Failures are
 * reported to Sentry but never thrown to the caller — this is intentionally
 * non-fatal so that DB mutations are never blocked by storage errors.
 *
 * URL shape (set by the `images` route in /api/upload):
 *   https://{NEXT_PUBLIC_STORAGE_URL}/{NEXT_PUBLIC_STORAGE_BUCKET_NAME}/{key}
 * where `key` = `{businessId}/image-{hex}.{ext}`.
 */

import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { s3Client } from "~/lib/s3/client";

/**
 * Derive the S3 object key from a stored public URL.
 *
 * Returns `null` if the URL doesn't match the expected shape.
 */
function urlToKey(url: string): string | null {
  const storageBase = `https://${env.NEXT_PUBLIC_STORAGE_URL}/${env.NEXT_PUBLIC_STORAGE_BUCKET_NAME}/`;
  if (!url.startsWith(storageBase)) return null;
  const key = url.slice(storageBase.length);
  return key.length > 0 ? key : null;
}

/**
 * Delete one S3 object by its public URL.
 *
 * Issues a signed `DELETE {bucketUrl}/{key}` request via the `aws4fetch`
 * AwsClient that backs `s3Client`.  Best-effort: errors are caught, logged to
 * Sentry, and swallowed.
 */
async function deleteOneObject(url: string): Promise<void> {
  const key = urlToKey(url);
  if (!key) {
    // URL doesn't match expected shape — log but don't throw
    Sentry.captureException(
      new Error(`deleteStoredObjects: unrecognised URL shape: ${url}`),
      { tags: { service: "s3", operation: "delete" } },
    );
    return;
  }

  const bucketUrl = s3Client.buildBucketUrl(
    env.NEXT_PUBLIC_STORAGE_BUCKET_NAME,
  );
  const objectUrl = `${bucketUrl}/${key}`;

  const res = await s3Client.s3.fetch(objectUrl, { method: "DELETE" });

  // S3 DELETE returns 204 on success, 404 when already gone — both are OK
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `S3 DELETE failed: HTTP ${res.status} for key "${key}" — ${body}`,
    );
  }
}

/**
 * Delete one or more S3 objects by their stored public URLs.
 *
 * Best-effort: all errors are caught per-object, reported to Sentry, and
 * never re-thrown.  Empty / null URLs are silently skipped.
 */
export async function deleteStoredObjects(urls: string[]): Promise<void> {
  await Promise.all(
    urls
      .filter((u) => !!u)
      .map((url) =>
        deleteOneObject(url).catch((err: unknown) => {
          Sentry.captureException(err, {
            tags: { service: "s3", operation: "delete" },
            extra: { url },
          });
        }),
      ),
  );
}
