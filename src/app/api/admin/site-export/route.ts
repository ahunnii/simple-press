/**
 * Download your site — route handler.
 *
 * GET /api/admin/site-export
 *   ?businessId=<id>   (PLATFORM_ADMIN only — target any business, any status)
 *
 * Auth matrix:
 *   - no session                      → 401
 *   - PLATFORM_ADMIN (+ ?businessId=) → any business, including suspended
 *   - PLATFORM_ADMIN (no query)       → host-resolved business, any status
 *   - OWNER of the host business      → allowed
 *   - MANAGER / other / non-member    → 403
 *
 * Managers are deliberately excluded: the export contains customer and order
 * records, which makes it an owner-level action (matching the Owner-only gate
 * on /admin/settings/data). There is no feature flag — owners always have it.
 *
 * Returns a ZIP archive built by `buildSiteExport` / `zipSiteExportStream`
 * (see `~/lib/site-export/build`). Runs in-request, like Store Transfer.
 */

import * as Sentry from "@sentry/nextjs";

import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import {
  checkBusiness,
  checkBusinessAnyStatus,
  checkBusinessMembership,
} from "~/lib/check-business";
import { buildSiteExport, zipSiteExportStream } from "~/lib/site-export/build";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Photos are fetched and zipped in-request; large sites can take a while.
export const maxDuration = 300;

/** Header-safe fallback for `filename="..."`: no non-ASCII, quotes or slashes. */
function asciiFilename(filename: string): string {
  const cleaned = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\/;]/g, "_")
    .trim();
  return cleaned || "site-export.zip";
}

export async function GET(req: Request): Promise<Response> {
  let resolvedBusinessId: string | undefined;

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const platformAdmin = await isPlatformAdmin(session.user.id);

    const queryBusinessId =
      new URL(req.url).searchParams.get("businessId") ?? undefined;

    let targetBusinessId: string;

    if (platformAdmin && queryBusinessId) {
      // Look up by id directly — suspended stores must still export.
      const biz = await db.business.findUnique({
        where: { id: queryBusinessId },
        select: { id: true },
      });
      if (!biz) {
        return new Response("Business not found", { status: 404 });
      }
      targetBusinessId = biz.id;
    } else if (platformAdmin) {
      const business = await checkBusinessAnyStatus();
      if (!business) {
        return new Response("Business not found", { status: 404 });
      }
      targetBusinessId = business.id;
    } else {
      const business = await checkBusiness();
      if (!business) {
        return new Response("Business not found", { status: 404 });
      }
      targetBusinessId = business.id;

      const membership = await checkBusinessMembership(
        targetBusinessId,
        session.user.id,
      );
      if (membership?.role !== "OWNER") {
        return new Response("Forbidden", { status: 403 });
      }
    }

    resolvedBusinessId = targetBusinessId;

    // ── 2. Build + zip ───────────────────────────────────────────────────────
    const { filename, files } = await buildSiteExport(targetBusinessId);

    // ── 3. Respond ───────────────────────────────────────────────────────────
    // Streamed so the archive is never buffered twice in memory. Errors past
    // this point surface as a truncated download, not a 500.
    return new Response(zipSiteExportStream(files), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: {
        route: "site-export",
        businessId: resolvedBusinessId ?? "unknown",
      },
    });
    console.error("[site-export]", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
