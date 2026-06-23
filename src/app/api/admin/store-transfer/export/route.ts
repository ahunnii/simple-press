/**
 * Store Transfer — Export route handler.
 *
 * GET /api/admin/store-transfer/export
 *   ?businessId=<id>   (PLATFORM_ADMIN only — target any business)
 *
 * Auth: OWNER/MANAGER of the resolved business, or PLATFORM_ADMIN.
 * Feature gate: storeTransfer feature flag must be enabled for the target business.
 *
 * Returns a ZIP archive containing:
 *   manifest.json   — versioned content payload (all store data as DTOs)
 *   media/…         — every S3 object under {businessId}/, numbered + flat
 */

import path from "path";
import * as Sentry from "@sentry/nextjs";
import JSZip from "jszip";

import type {
  StoreTransferManifest,
  StoreTransferMediaEntry,
} from "~/lib/store-transfer/types";
import pkg from "../../../../../../package.json";
import { checkBusiness, checkBusinessMembership } from "~/lib/check-business";
import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "~/lib/features/registry";
import { s3Client } from "~/lib/s3/client";
import { listBusinessObjects } from "~/lib/s3/list";
import { keyToPublicUrl, STORAGE_BASE, STORAGE_BUCKET } from "~/lib/s3/url";
import { collectStoreContent } from "~/lib/store-transfer/export";
import { STORE_TRANSFER_FORMAT_VERSION } from "~/lib/store-transfer/types";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

// Package version — resolved from package.json via resolveJsonModule
const APP_VERSION: string = pkg.version;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Bounded-concurrency helper ───────────────────────────────────────────────

/**
 * Process an array in chunks of `concurrency`, awaiting each chunk before
 * starting the next. Preserves order of results.
 */
async function chunkedAsync<T, R>(
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

// ─── Feature-flag check (by businessId, not from headers) ────────────────────

async function isStoreTransferEnabled(businessId: string): Promise<boolean> {
  const row = await db.business.findUnique({
    where: { id: businessId },
    select: { featureFlags: true },
  });
  const defaults = getDefaultFlags();
  const stored = (row?.featureFlags as Record<string, boolean>) ?? {};
  const merged = { ...defaults, ...stored };
  const disabledByDependency = getDisabledDueToDependency(merged);
  if (disabledByDependency.has("storeTransfer")) return false;
  return (
    merged.storeTransfer ??
    FEATURE_REGISTRY.storeTransfer?.enabledByDefault ??
    false
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  let resolvedBusinessId: string | undefined;

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const isPlatformAdmin = session.user.platformRole === "PLATFORM_ADMIN";

    // Resolve the target business:
    //   - PLATFORM_ADMIN may pass ?businessId= to target any business
    //   - everyone else is scoped to the hostname-resolved business
    const urlObj = new URL(req.url);
    const queryBusinessId = urlObj.searchParams.get("businessId") ?? undefined;

    let targetBusinessId: string;

    if (isPlatformAdmin && queryBusinessId) {
      // PLATFORM_ADMIN targeting a specific business
      const biz = await db.business.findUnique({
        where: { id: queryBusinessId },
        select: { id: true },
      });
      if (!biz) {
        return new Response("Business not found", { status: 404 });
      }
      targetBusinessId = biz.id;
    } else {
      // Resolve from hostname (same as upload/route.ts requireBusinessManager)
      const business = await checkBusiness();
      if (!business) {
        return new Response("Business not found", { status: 404 });
      }
      targetBusinessId = business.id;

      if (!isPlatformAdmin) {
        const membership = await checkBusinessMembership(
          targetBusinessId,
          session.user.id,
        );
        if (
          !membership ||
          (membership.role !== "OWNER" && membership.role !== "MANAGER")
        ) {
          return new Response("Forbidden", { status: 403 });
        }
      }
    }

    resolvedBusinessId = targetBusinessId;

    // ── 2. Feature gate ──────────────────────────────────────────────────────
    const featureEnabled = await isStoreTransferEnabled(targetBusinessId);
    if (!featureEnabled) {
      return new Response(
        "The Store Transfer feature is not enabled for this business.",
        { status: 403 },
      );
    }

    // ── 3. Collect store content ─────────────────────────────────────────────
    const { manifestContent, templateId, businessSlug } =
      await collectStoreContent(targetBusinessId);

    // ── 4. Enumerate media objects ───────────────────────────────────────────
    const listedObjects = await listBusinessObjects(targetBusinessId);

    // ── 5. Fetch media bytes (bounded concurrency = 5) ───────────────────────
    const bucketBase = s3Client.buildBucketUrl(STORAGE_BUCKET);

    const mediaEntries = await chunkedAsync(
      listedObjects,
      5,
      async (
        obj,
        idx,
      ): Promise<{
        entry: StoreTransferMediaEntry;
        buffer: ArrayBuffer | null;
      }> => {
        const seq = String(idx + 1).padStart(4, "0");
        const basename = path.basename(obj.key);
        const zipPath = `media/${seq}-${basename}`;

        let buffer: ArrayBuffer | null = null;
        let missing = false;
        let contentType: string | undefined;

        try {
          const res = await s3Client.s3.fetch(`${bucketBase}/${obj.key}`, {
            method: "GET",
          });
          if (!res.ok) {
            missing = true;
          } else {
            contentType = res.headers.get("content-type") ?? undefined;
            buffer = await res.arrayBuffer();
          }
        } catch {
          missing = true;
        }

        const entry: StoreTransferMediaEntry = {
          originalUrl: keyToPublicUrl(obj.key),
          originalKey: obj.key,
          zipPath,
          kind: obj.kind,
          ...(contentType !== undefined ? { contentType } : {}),
          bytes: buffer !== null ? buffer.byteLength : obj.size,
          ...(missing ? { missing: true } : {}),
        };

        return { entry, buffer };
      },
    );

    // ── 6. Build manifest ────────────────────────────────────────────────────
    const manifest: StoreTransferManifest = {
      formatVersion: STORE_TRANSFER_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      source: {
        formatVersion: STORE_TRANSFER_FORMAT_VERSION,
        appVersion: APP_VERSION,
        businessId: targetBusinessId,
        businessSlug,
        templateId,
        storageBase: STORAGE_BASE,
      },
      media: mediaEntries.map((m) => m.entry),
      content: manifestContent,
    };

    // ── 7. Assemble ZIP ──────────────────────────────────────────────────────
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    for (const { entry, buffer } of mediaEntries) {
      if (buffer !== null && !entry.missing) {
        zip.file(entry.zipPath, buffer);
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // ── 8. Return ZIP ────────────────────────────────────────────────────────
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", "-")
      .replace(":", "");

    const filename = `store-transfer-${businessSlug}-${timestamp}.zip`;

    // Convert Buffer → Uint8Array so Response constructor accepts it
    const responseBody = new Uint8Array(zipBuffer);

    return new Response(responseBody, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(responseBody.byteLength),
      },
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: {
        route: "store-transfer-export",
        businessId: resolvedBusinessId ?? "unknown",
      },
    });
    console.error("[store-transfer-export]", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
