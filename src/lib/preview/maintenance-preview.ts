/**
 * Pure decision helpers for the staff storefront preview while a business is
 * in maintenance / coming-soon. Cookie name lives here so the route handler
 * and the server gate share one spelling; authorization still happens on the
 * server (see `maintenance-preview-context.ts`).
 *
 * Deliberately separate from `sp_preview` / `?__preview=1`. That path swaps
 * unpublished drafts into the storefront; this path must show the published
 * site so an owner can QA what will go live.
 */

export const MAINTENANCE_PREVIEW_COOKIE = "sp_maintenance_preview";

export type MaintenancePreviewScope = "platform" | "business";

export type MaintenanceGateState = {
  kind: "live" | "takeover";
  showEnterBar: boolean;
  showPreviewBar: boolean;
};

export function maintenancePreviewCookieOptions(): {
  path: "/";
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

/**
 * OWNER / MANAGER of this business, or a platform admin. STAFF and anonymous
 * visitors never get the switch.
 */
export function canPreviewStorefrontRole(args: {
  isPlatformAdmin: boolean;
  membershipRole: string | null | undefined;
}): boolean {
  if (args.isPlatformAdmin) return true;
  return args.membershipRole === "OWNER" || args.membershipRole === "MANAGER";
}

export function cookieMatchesBusiness(
  cookieValue: string | undefined,
  businessId: string,
): boolean {
  return !!cookieValue && cookieValue === businessId;
}

/**
 * Skip the public takeover only for business-scoped maintenance, and only
 * when the staff preview cookie is authorized or the visual editor's own
 * preview gate already passed. Platform-wide maintenance is never skipped.
 */
export function shouldSkipBusinessMaintenance(args: {
  scope: MaintenancePreviewScope;
  isStorefrontPreview: boolean;
  isEditorPreview: boolean;
}): boolean {
  if (args.scope === "platform") return false;
  return args.isStorefrontPreview || args.isEditorPreview;
}

export function resolveMaintenanceGateState(args: {
  active: boolean;
  scope: MaintenancePreviewScope;
  canPreview: boolean;
  cookieMatches: boolean;
  isEditorPreview: boolean;
}): MaintenanceGateState {
  if (!args.active) {
    return { kind: "live", showEnterBar: false, showPreviewBar: false };
  }

  const isStorefrontPreview = args.canPreview && args.cookieMatches;
  const skip = shouldSkipBusinessMaintenance({
    scope: args.scope,
    isStorefrontPreview,
    isEditorPreview: args.isEditorPreview,
  });

  if (skip) {
    return {
      kind: "live",
      showEnterBar: false,
      // Editor iframe already has its own chrome; don't stack this bar in it.
      showPreviewBar: isStorefrontPreview && !args.isEditorPreview,
    };
  }

  return {
    kind: "takeover",
    showEnterBar: args.scope === "business" && args.canPreview,
    showPreviewBar: false,
  };
}
