/**
 * Export to WordPress — route handler.
 *
 * GET /api/admin/wordpress-export
 *   ?businessId=<id>   (PLATFORM_ADMIN only — target any business)
 *
 * Auth: OWNER of the resolved business, or PLATFORM_ADMIN. Managers are
 * deliberately excluded — a full store export (including customer records) is
 * an owner-level action, matching the Owner-only gate on
 * /admin/settings/data.
 * Feature gate: wordpressExport feature flag must be enabled for the target business.
 *
 * Returns a ZIP archive containing README.md, content.wxr.xml, products.csv,
 * data.json, and records/*.csv — see `collectWordPressExport` for details.
 */

import * as Sentry from "@sentry/nextjs";
import JSZip from "jszip";

import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { checkBusiness, checkBusinessMembership } from "~/lib/check-business";
import { isFeatureEnabledForBusiness } from "~/lib/features/check-flag";
import { collectWordPressExport } from "~/lib/wordpress/export";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  let resolvedBusinessId: string | undefined;

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const platformAdmin = await isPlatformAdmin(session.user.id);

    // Resolve the target business:
    //   - PLATFORM_ADMIN may pass ?businessId= to target any business
    //   - everyone else is scoped to the hostname-resolved business
    const urlObj = new URL(req.url);
    const queryBusinessId = urlObj.searchParams.get("businessId") ?? undefined;

    let targetBusinessId: string;

    if (platformAdmin && queryBusinessId) {
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

      if (!platformAdmin) {
        const membership = await checkBusinessMembership(
          targetBusinessId,
          session.user.id,
        );
        if (membership?.role !== "OWNER") {
          return new Response("Forbidden", { status: 403 });
        }
      }
    }

    resolvedBusinessId = targetBusinessId;

    // ── 2. Feature gate ──────────────────────────────────────────────────────
    const featureEnabled = await isFeatureEnabledForBusiness(
      targetBusinessId,
      "wordpressExport",
    );
    if (!featureEnabled) {
      return new Response(
        "The Export to WordPress feature is not enabled for this business.",
        { status: 403 },
      );
    }

    // ── 3. Collect export content ────────────────────────────────────────────
    const { businessSlug, files } =
      await collectWordPressExport(targetBusinessId);

    // ── 4. Assemble ZIP ──────────────────────────────────────────────────────
    const zip = new JSZip();
    for (const f of files) {
      zip.file(f.path, f.contents);
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // ── 5. Return ZIP ────────────────────────────────────────────────────────
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", "-")
      .replace(":", "");

    const filename = `wordpress-export-${businessSlug}-${timestamp}.zip`;

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
        route: "wordpress-export",
        businessId: resolvedBusinessId ?? "unknown",
      },
    });
    console.error("[wordpress-export]", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
