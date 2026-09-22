import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import type { MaintenanceGateState } from "./maintenance-preview";
import type { StorefrontMaintenance } from "~/lib/maintenance";
import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";

import {
  canPreviewStorefrontRole,
  cookieMatchesBusiness,
  MAINTENANCE_PREVIEW_COOKIE,
  resolveMaintenanceGateState,
} from "./maintenance-preview";
import { getAuthorizedPreviewBusinessId } from "./preview-context";

export {
  MAINTENANCE_PREVIEW_COOKIE,
  maintenancePreviewCookieOptions,
} from "./maintenance-preview";

/**
 * True when the current session may switch into the published storefront
 * while this business is in maintenance / coming soon.
 */
export const canPreviewStorefront = cache(
  async (businessId: string): Promise<boolean> => {
    const session = await getSession();
    if (!session?.user) return false;
    if (await isPlatformAdmin(session.user.id)) {
      return canPreviewStorefrontRole({
        isPlatformAdmin: true,
        membershipRole: null,
      });
    }
    const membership = await db.businessMembership.findUnique({
      where: {
        userId_businessId: {
          userId: session.user.id,
          businessId,
        },
      },
      select: { role: true },
    });
    return canPreviewStorefrontRole({
      isPlatformAdmin: false,
      membershipRole: membership?.role,
    });
  },
);

/**
 * Cookie matches this business AND the session is allowed to preview it.
 */
export const isStorefrontPreview = cache(
  async (businessId: string): Promise<boolean> => {
    const cookieStore = await cookies();
    if (
      !cookieMatchesBusiness(
        cookieStore.get(MAINTENANCE_PREVIEW_COOKIE)?.value,
        businessId,
      )
    ) {
      return false;
    }
    return canPreviewStorefront(businessId);
  },
);

export type ResolvedMaintenanceGate = MaintenanceGateState & {
  variant: "maintenance" | "coming_soon";
};

/**
 * Single decision used by both storefront gates (`layout.tsx` and `page.tsx`).
 * Never skips `scope: "platform"` maintenance.
 */
export async function resolveMaintenanceGate(
  businessId: string,
  maintenance: StorefrontMaintenance,
): Promise<ResolvedMaintenanceGate> {
  if (!maintenance.active) {
    return {
      kind: "live",
      showEnterBar: false,
      showPreviewBar: false,
      variant: "maintenance",
    };
  }

  const [canPreview, cookieStore, editorPreviewId] = await Promise.all([
    canPreviewStorefront(businessId),
    cookies(),
    getAuthorizedPreviewBusinessId(businessId),
  ]);

  const state = resolveMaintenanceGateState({
    active: true,
    scope: maintenance.scope,
    canPreview,
    cookieMatches: cookieMatchesBusiness(
      cookieStore.get(MAINTENANCE_PREVIEW_COOKIE)?.value,
      businessId,
    ),
    isEditorPreview: editorPreviewId !== null,
  });

  return { ...state, variant: maintenance.variant };
}

/**
 * Checkout stays blocked while the owner is previewing a store that is still
 * in business-scoped maintenance. Returns the variant so the notice can name
 * coming-soon vs maintenance; `null` means checkout may proceed (subject to
 * Stripe / other guards).
 */
export async function getMaintenancePreviewCheckoutBlock(
  businessId: string,
): Promise<"maintenance" | "coming_soon" | null> {
  if (!(await isStorefrontPreview(businessId))) return null;
  const row = await db.business.findUnique({
    where: { id: businessId },
    select: { maintenanceMode: true, maintenanceVariant: true },
  });
  if (!row?.maintenanceMode) return null;
  return row.maintenanceVariant === "coming_soon"
    ? "coming_soon"
    : "maintenance";
}
