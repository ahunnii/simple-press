/**
 * S3/MinIO PUT and HEAD helpers for the store-transfer import pipeline.
 *
 * Mirrors the signing pattern from src/lib/s3/delete.ts (uses s3Client.s3.fetch
 * with an AwsClient-signed request against the bucket URL).
 *
 * Exports:
 *   putStoredObject  — signed PUT; returns the public URL for the uploaded key
 *   objectExists     — signed HEAD; returns true on 200, false on 404
 *   contentAddressedKey — deterministic target key for re-hosting a media file
 */

import crypto from "node:crypto";
import * as Sentry from "@sentry/nextjs";

import type { MediaKind } from "~/lib/s3/list";
import { s3Client } from "~/lib/s3/client";
import { keyToPublicUrl, STORAGE_BUCKET } from "~/lib/s3/url";

// ─── contentAddressedKey ──────────────────────────────────────────────────────

/**
 * Derive a deterministic S3 key for a re-hosted media file.
 *
 * Key layout mirrors the upload/route.ts convention:
 *
 *   image     → {targetBusinessId}/image-{sha256[:8]}{ext}
 *   gallery   → {targetBusinessId}/gallery-{sha256[:8]}{ext}
 *   video     → {targetBusinessId}/video-{sha256[:8]}{ext}
 *   testimonial → {targetBusinessId}/testimonials/{sha256[:8]}{ext}
 *   logo      → {targetBusinessId}/logo{ext}          (fixed key — always overwrite)
 *   favicon   → {targetBusinessId}/favicon{ext}       (fixed key — always overwrite)
 *   other     → {targetBusinessId}/image-{sha256[:8]}{ext}   (falls back to image-)
 *
 * Content-addressing (SHA-256 prefix) makes re-runs idempotent: identical bytes
 * always derive the same key, so HEAD-check skips redundant PUTs, and nothing
 * is orphaned when the import is retried.
 *
 * @param targetBusinessId  Target tenant's business ID (forced prefix for cross-tenant safety)
 * @param kind              Media kind from the manifest
 * @param bytes             Raw file bytes (used to compute sha256)
 * @param ext               File extension including leading dot, e.g. ".jpg"
 */
export function contentAddressedKey(
  targetBusinessId: string,
  kind: MediaKind,
  bytes: Uint8Array | Buffer | ArrayBuffer,
  ext: string,
): string {
  // Compute SHA-256 hex string
  const buf =
    bytes instanceof ArrayBuffer ? Buffer.from(bytes) : Buffer.from(bytes);
  const hash = crypto.createHash("sha256").update(buf).digest("hex");
  const shortHash = hash.slice(0, 8);

  // Fixed keys for logo/favicon — overwrite on import (same as upload route)
  if (kind === "logo") return `${targetBusinessId}/logo${ext}`;
  if (kind === "favicon") return `${targetBusinessId}/favicon${ext}`;

  // Testimonials use a nested prefix to mirror the upload route convention
  if (kind === "testimonial")
    return `${targetBusinessId}/testimonials/${shortHash}${ext}`;

  // Map kind → key prefix
  let prefix: string;
  switch (kind) {
    case "image":
      prefix = "image";
      break;
    case "gallery":
      prefix = "gallery";
      break;
    case "video":
      prefix = "video";
      break;
    default:
      // "other" or any future kind falls back to image- prefix
      prefix = "image";
      break;
  }

  return `${targetBusinessId}/${prefix}-${shortHash}${ext}`;
}

// ─── objectExists ─────────────────────────────────────────────────────────────

/**
 * Check whether an S3 object already exists via a signed HEAD request.
 *
 * Returns `true` on HTTP 200, `false` on 404.
 * Throws on any other response status (server error, auth failure, etc.).
 */
export async function objectExists(key: string): Promise<boolean> {
  const bucketUrl = s3Client.buildBucketUrl(STORAGE_BUCKET);
  const objectUrl = `${bucketUrl}/${key}`;

  const res = await s3Client.s3.fetch(objectUrl, { method: "HEAD" });

  if (res.status === 200) return true;
  if (res.status === 404) return false;

  const body = await res.text().catch(() => "");
  throw new Error(
    `S3 HEAD failed: HTTP ${res.status} for key "${key}" — ${body}`,
  );
}

// ─── putStoredObject ──────────────────────────────────────────────────────────

/**
 * Upload bytes to S3/MinIO via a signed PUT request.
 *
 * Throws on non-OK response.
 * Returns the canonical public URL for the uploaded object.
 *
 * @param key         Target S3 object key (must start with `{businessId}/`)
 * @param body        File bytes
 * @param contentType Optional MIME type (defaults to "application/octet-stream")
 */
export async function putStoredObject({
  key,
  body,
  contentType = "application/octet-stream",
}: {
  key: string;
  body: ArrayBuffer | Uint8Array | Buffer;
  contentType?: string;
}): Promise<string> {
  const bucketUrl = s3Client.buildBucketUrl(STORAGE_BUCKET);
  const objectUrl = `${bucketUrl}/${key}`;

  const buf =
    body instanceof ArrayBuffer ? Buffer.from(body) : Buffer.from(body);

  const res = await s3Client.s3.fetch(objectUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buf.length),
    },
    body: buf,
  });

  if (!res.ok) {
    const responseBody = await res.text().catch(() => "");
    const err = new Error(
      `S3 PUT failed: HTTP ${res.status} for key "${key}" — ${responseBody}`,
    );
    Sentry.captureException(err, {
      tags: { service: "s3", operation: "put" },
      extra: { key, contentType },
    });
    throw err;
  }

  return keyToPublicUrl(key);
}
