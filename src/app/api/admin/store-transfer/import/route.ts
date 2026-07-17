// 5 minutes ceiling for large stores

import * as Sentry from "@sentry/nextjs";

import { checkBusiness, checkBusinessMembership } from "~/lib/check-business";
import { isFeatureEnabledForBusiness } from "~/lib/features/check-flag";
import { importStoreBundle } from "~/lib/store-transfer/import";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

/**
 * Store Transfer — import route handler.
 *
 * POST /api/admin/store-transfer/import
 *
 * Accepts multipart/form-data with:
 *   file       File    — the .zip produced by the export route (required)
 *   businessId string  — target business override (PLATFORM_ADMIN only)
 *
 * Returns StoreImportResult as JSON.
 *
 * Auth: OWNER/MANAGER on the current subdomain, or PLATFORM_ADMIN (who may
 * supply an explicit businessId form field to target another business).
 *
 * Feature-gated behind the "storeTransfer" flag.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(req: Request): Promise<Response> {
  // ── Auth ─────────────────────────────────────────────────────────────────────

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  const business = await checkBusiness();
  if (!business) {
    return Response.json({ error: "Business not found" }, { status: 404 });
  }

  const isPlatformAdmin = session.user.platformRole === "PLATFORM_ADMIN";

  if (!isPlatformAdmin) {
    const membership = await checkBusinessMembership(
      business.id,
      session.user.id,
    );
    if (
      !membership ||
      (membership.role !== "OWNER" && membership.role !== "MANAGER")
    ) {
      return Response.json(
        { error: "You do not have permission to import into this business." },
        { status: 403 },
      );
    }
  }

  // ── Resolve target businessId ─────────────────────────────────────────────────

  let targetBusinessId = business.id;

  // ── Size guard (content-length header is advisory but helps fast-reject large requests)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_BYTES) {
    return Response.json(
      {
        error: `Upload exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit`,
      },
      { status: 413 },
    );
  }

  // ── Feature flag check ────────────────────────────────────────────────────────

  const featureEnabled = await isFeatureEnabledForBusiness(
    targetBusinessId,
    "storeTransfer",
  );

  if (!featureEnabled) {
    return Response.json(
      {
        error:
          "The storeTransfer feature is not enabled for this business. Enable it in Settings → Features.",
      },
      { status: 403 },
    );
  }

  // ── Parse multipart form ──────────────────────────────────────────────────────

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    return Response.json(
      { error: `Failed to parse form data: ${String(err)}` },
      { status: 400 },
    );
  }

  // PLATFORM_ADMIN may target another business via the businessId field
  if (isPlatformAdmin) {
    const inputBusinessId = form.get("businessId");
    if (typeof inputBusinessId === "string" && inputBusinessId.trim()) {
      // Verify the target business exists
      const targetBiz = await db.business.findUnique({
        where: { id: inputBusinessId.trim() },
        select: { id: true },
      });
      if (!targetBiz) {
        return Response.json(
          { error: `Target business "${inputBusinessId}" not found` },
          { status: 404 },
        );
      }
      targetBusinessId = targetBiz.id;
    }
  }

  const fileEntry = form.get("file");
  if (!(fileEntry instanceof File)) {
    return Response.json(
      { error: 'Missing or invalid "file" field — expected a file upload' },
      { status: 400 },
    );
  }

  // Post-read size guard (actual byte count)
  const zipBuffer = await fileEntry.arrayBuffer();
  if (zipBuffer.byteLength > MAX_UPLOAD_BYTES) {
    return Response.json(
      {
        error: `Upload exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit`,
      },
      { status: 413 },
    );
  }

  // ── Run import pipeline ───────────────────────────────────────────────────────

  try {
    const importResult = await importStoreBundle({
      targetBusinessId,
      zipBuffer,
    });
    return Response.json(importResult);
  } catch (err) {
    // Distinguish bad-manifest errors (user error) from unexpected failures
    const message = err instanceof Error ? err.message : String(err);
    const isManifestError =
      message.includes("Invalid store transfer manifest") ||
      message.includes("Unsupported format version") ||
      message.includes("missing manifest.json");

    Sentry.captureException(err, {
      tags: {
        route: "store-transfer-import",
        businessId: targetBusinessId,
      },
    });

    if (isManifestError) {
      return Response.json({ error: message }, { status: 400 });
    }

    return Response.json(
      { error: "Import failed due to an unexpected error. Please try again." },
      { status: 500 },
    );
  }
}
