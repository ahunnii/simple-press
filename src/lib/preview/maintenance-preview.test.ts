import { describe, expect, it } from "vitest";

import {
  canPreviewStorefrontRole,
  cookieMatchesBusiness,
  resolveMaintenanceGateState,
  shouldSkipBusinessMaintenance,
} from "./maintenance-preview";

describe("canPreviewStorefrontRole", () => {
  it("allows a platform admin with no membership", () => {
    expect(
      canPreviewStorefrontRole({
        isPlatformAdmin: true,
        membershipRole: null,
      }),
    ).toBe(true);
  });

  it.each(["OWNER", "MANAGER"] as const)("allows a %s member", (role) => {
    expect(
      canPreviewStorefrontRole({
        isPlatformAdmin: false,
        membershipRole: role,
      }),
    ).toBe(true);
  });

  it("rejects STAFF", () => {
    expect(
      canPreviewStorefrontRole({
        isPlatformAdmin: false,
        membershipRole: "STAFF",
      }),
    ).toBe(false);
  });

  it("rejects anonymous visitors", () => {
    expect(
      canPreviewStorefrontRole({
        isPlatformAdmin: false,
        membershipRole: null,
      }),
    ).toBe(false);
  });
});

describe("cookieMatchesBusiness", () => {
  it("requires an exact businessId match", () => {
    expect(cookieMatchesBusiness("biz_a", "biz_a")).toBe(true);
    expect(cookieMatchesBusiness("biz_a", "biz_b")).toBe(false);
    expect(cookieMatchesBusiness(undefined, "biz_a")).toBe(false);
    expect(cookieMatchesBusiness("", "biz_a")).toBe(false);
  });
});

describe("shouldSkipBusinessMaintenance", () => {
  it("never skips platform-scope maintenance", () => {
    expect(
      shouldSkipBusinessMaintenance({
        scope: "platform",
        isStorefrontPreview: true,
        isEditorPreview: true,
      }),
    ).toBe(false);
  });

  it("skips business maintenance for a staff preview cookie", () => {
    expect(
      shouldSkipBusinessMaintenance({
        scope: "business",
        isStorefrontPreview: true,
        isEditorPreview: false,
      }),
    ).toBe(true);
  });

  it("skips business maintenance for visual-editor preview", () => {
    expect(
      shouldSkipBusinessMaintenance({
        scope: "business",
        isStorefrontPreview: false,
        isEditorPreview: true,
      }),
    ).toBe(true);
  });

  it("does not skip for visitors", () => {
    expect(
      shouldSkipBusinessMaintenance({
        scope: "business",
        isStorefrontPreview: false,
        isEditorPreview: false,
      }),
    ).toBe(false);
  });
});

describe("resolveMaintenanceGateState", () => {
  const owner = {
    canPreview: true,
    cookieMatches: false,
    isEditorPreview: false,
  };

  it("falls through to the live site when maintenance is off", () => {
    expect(
      resolveMaintenanceGateState({
        active: false,
        scope: "business",
        ...owner,
        cookieMatches: true,
        isEditorPreview: true,
      }),
    ).toEqual({
      kind: "live",
      showEnterBar: false,
      showPreviewBar: false,
    });
  });

  it("shows the takeover without a bar for anonymous visitors", () => {
    expect(
      resolveMaintenanceGateState({
        active: true,
        scope: "business",
        canPreview: false,
        cookieMatches: false,
        isEditorPreview: false,
      }),
    ).toEqual({
      kind: "takeover",
      showEnterBar: false,
      showPreviewBar: false,
    });
  });

  it("shows the takeover without a bar for STAFF even if a cookie is present", () => {
    expect(
      resolveMaintenanceGateState({
        active: true,
        scope: "business",
        canPreview: false,
        cookieMatches: true,
        isEditorPreview: false,
      }),
    ).toEqual({
      kind: "takeover",
      showEnterBar: false,
      showPreviewBar: false,
    });
  });

  it("shows the takeover with an enter bar for an owner without a cookie", () => {
    expect(
      resolveMaintenanceGateState({
        active: true,
        scope: "business",
        ...owner,
      }),
    ).toEqual({
      kind: "takeover",
      showEnterBar: true,
      showPreviewBar: false,
    });
  });

  it("ignores a cookie for the wrong business", () => {
    expect(
      resolveMaintenanceGateState({
        active: true,
        scope: "business",
        canPreview: true,
        cookieMatches: false,
        isEditorPreview: false,
      }),
    ).toEqual({
      kind: "takeover",
      showEnterBar: true,
      showPreviewBar: false,
    });
  });

  it("enters the live site with a preview bar when the owner cookie matches", () => {
    expect(
      resolveMaintenanceGateState({
        active: true,
        scope: "business",
        canPreview: true,
        cookieMatches: true,
        isEditorPreview: false,
      }),
    ).toEqual({
      kind: "live",
      showEnterBar: false,
      showPreviewBar: true,
    });
  });

  it("enters the live site without the bar inside the visual editor", () => {
    expect(
      resolveMaintenanceGateState({
        active: true,
        scope: "business",
        canPreview: true,
        cookieMatches: true,
        isEditorPreview: true,
      }),
    ).toEqual({
      kind: "live",
      showEnterBar: false,
      showPreviewBar: false,
    });
  });

  it("skips the takeover for editor preview even without the staff cookie", () => {
    expect(
      resolveMaintenanceGateState({
        active: true,
        scope: "business",
        canPreview: true,
        cookieMatches: false,
        isEditorPreview: true,
      }),
    ).toEqual({
      kind: "live",
      showEnterBar: false,
      showPreviewBar: false,
    });
  });

  it("never skips platform maintenance, even for an owner with a cookie", () => {
    expect(
      resolveMaintenanceGateState({
        active: true,
        scope: "platform",
        canPreview: true,
        cookieMatches: true,
        isEditorPreview: true,
      }),
    ).toEqual({
      kind: "takeover",
      showEnterBar: false,
      showPreviewBar: false,
    });
  });
});
