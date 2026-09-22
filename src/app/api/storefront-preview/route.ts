import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { checkBusiness } from "~/lib/check-business";
import {
  canPreviewStorefront,
  MAINTENANCE_PREVIEW_COOKIE,
  maintenancePreviewCookieOptions,
} from "~/lib/preview/maintenance-preview-context";

export const runtime = "nodejs";

/**
 * Toggle the HttpOnly staff-preview cookie for the current tenant.
 *
 * Bound to the host's business — the client does not send a businessId.
 * POST enters the published storefront; DELETE returns to the visitor takeover.
 */
export async function POST() {
  const business = await checkBusiness();
  if (!business) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }
  if (!(await canPreviewStorefront(business.id))) {
    return NextResponse.json(
      { error: "You don't have permission to preview this store." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(
    MAINTENANCE_PREVIEW_COOKIE,
    business.id,
    maintenancePreviewCookieOptions(),
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const business = await checkBusiness();
  if (!business) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }
  if (!(await canPreviewStorefront(business.id))) {
    return NextResponse.json(
      { error: "You don't have permission to preview this store." },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(MAINTENANCE_PREVIEW_COOKIE, "", {
    ...maintenancePreviewCookieOptions(),
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
