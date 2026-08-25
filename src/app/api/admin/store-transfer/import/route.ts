// 5 minutes ceiling for large stores

import * as Sentry from "@sentry/nextjs";

import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { checkBusiness } from "~/lib/check-business";
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
 *   businessId string  — target business override (defaults to the host's)
 *
 * Returns StoreImportResult as JSON.
 *
 * Auth: PLATFORM_ADMIN only. Store Transfer is an internal tool (staging→prod
 * moves, site duplication) and is not exposed to business owners or managers,
 * so there is no feature flag for it.
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

  if (!(await isPlatformAdmin(session.user.id))) {
    return Response.json(
      { error: "You do not have permission to import into this business." },
      { status: 403 },
    );
  }

  const business = await checkBusiness();
  if (!business) {
    return Response.json({ error: "Business not found" }, { status: 404 });
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

  // The caller may target another business via the businessId field
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
