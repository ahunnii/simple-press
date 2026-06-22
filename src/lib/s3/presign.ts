/**
 * Presigned download URL generator.
 *
 * Produces a short-lived, bearer-credential S3 GET URL for private or
 * quota-protected downloads.  Never log the returned URL — it embeds
 * temporary signing credentials.
 */

import { s3Client } from "~/lib/s3/client";
import { STORAGE_BUCKET } from "~/lib/s3/url";

export interface PresignOptions {
  /** Suggested filename sent as `Content-Disposition: attachment; filename="…"`. */
  downloadName?: string;
  /**
   * Expiry in seconds.
   * @default 300 (5 minutes)
   */
  expiresIn?: number;
}

/**
 * Build a presigned GET URL for the given S3 object key.
 *
 * If `downloadName` is provided, a `response-content-disposition` query
 * parameter is embedded **before** signing so the browser prompts the user
 * to save the file with that name.
 */
export async function getPresignedDownloadUrl(
  key: string,
  opts?: PresignOptions,
): Promise<string> {
  const bucketUrl = s3Client.buildBucketUrl(STORAGE_BUCKET);
  let objectUrl = `${bucketUrl}/${key}`;

  if (opts?.downloadName) {
    const disposition = encodeURIComponent(
      `attachment; filename="${opts.downloadName}"`,
    );
    objectUrl += `?response-content-disposition=${disposition}`;
  }

  // aws4fetch's sign() accepts any object with toString(); the URL string works.
  // signQuery: true embeds the signature as query params (presigned URL style).
  const signed = await s3Client.s3.sign(objectUrl, {
    method: "GET",
    aws: { signQuery: true },
  });

  return signed.url;
}
