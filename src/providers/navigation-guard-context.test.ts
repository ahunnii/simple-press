import { describe, expect, it } from "vitest";

import { computeNavigationIntercept } from "./navigation-guard-context";

const CURRENT = "https://admin.example.com/admin/products/123";

function base(
  overrides: Partial<Parameters<typeof computeNavigationIntercept>[0]> = {},
) {
  return {
    hasActiveBlocker: true,
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: null,
    hasDownload: false,
    href: "https://admin.example.com/admin/products",
    currentHref: CURRENT,
    ...overrides,
  };
}

describe("computeNavigationIntercept", () => {
  it("intercepts a plain same-origin link to a different path", () => {
    const decision = computeNavigationIntercept(base());
    expect(decision).toEqual({ intercept: true, path: "/admin/products" });
  });

  it("does not intercept when no blocker is active", () => {
    const decision = computeNavigationIntercept(
      base({ hasActiveBlocker: false }),
    );
    expect(decision).toEqual({ intercept: false });
  });

  it("does not intercept when the event's default was already prevented", () => {
    const decision = computeNavigationIntercept(
      base({ defaultPrevented: true }),
    );
    expect(decision.intercept).toBe(false);
  });

  it("does not intercept non-primary mouse buttons", () => {
    expect(computeNavigationIntercept(base({ button: 1 })).intercept).toBe(
      false,
    );
    expect(computeNavigationIntercept(base({ button: 2 })).intercept).toBe(
      false,
    );
  });

  it.each(["metaKey", "ctrlKey", "shiftKey", "altKey"] as const)(
    "does not intercept when %s is held",
    (key) => {
      const decision = computeNavigationIntercept(base({ [key]: true }));
      expect(decision.intercept).toBe(false);
    },
  );

  it("does not intercept links with a download attribute", () => {
    const decision = computeNavigationIntercept(base({ hasDownload: true }));
    expect(decision.intercept).toBe(false);
  });

  it.each(["_blank", "_parent", "_top", "some-named-frame"])(
    "does not intercept target=%s",
    (target) => {
      const decision = computeNavigationIntercept(base({ target }));
      expect(decision.intercept).toBe(false);
    },
  );

  it.each([null, ""])("treats target=%s as in-page navigation", (target) => {
    const decision = computeNavigationIntercept(base({ target }));
    expect(decision.intercept).toBe(true);
  });

  it("does not intercept anchors with no href", () => {
    const decision = computeNavigationIntercept(base({ href: null }));
    expect(decision.intercept).toBe(false);
  });

  it("does not intercept cross-origin links", () => {
    const decision = computeNavigationIntercept(
      base({ href: "https://other.example.com/admin/products" }),
    );
    expect(decision.intercept).toBe(false);
  });

  it.each(["mailto:owner@example.com", "tel:+15551234567"])(
    "does not intercept non-http scheme links (%s)",
    (href) => {
      // new URL("mailto:...").origin is "null", which fails the same-origin
      // check — pin that behavior so a refactor can't regress it.
      const decision = computeNavigationIntercept(base({ href }));
      expect(decision.intercept).toBe(false);
    },
  );

  it("does not intercept a hash-only link on the same path+search", () => {
    const decision = computeNavigationIntercept(
      base({
        currentHref: "https://admin.example.com/admin/products?tab=all",
        href: "https://admin.example.com/admin/products?tab=all#section-2",
      }),
    );
    expect(decision.intercept).toBe(false);
  });

  it("does not intercept an identical full URL (no-op passthrough)", () => {
    const decision = computeNavigationIntercept(
      base({ href: CURRENT, currentHref: CURRENT }),
    );
    expect(decision.intercept).toBe(false);
  });

  it("intercepts when only the search string differs on the same path", () => {
    const decision = computeNavigationIntercept(
      base({
        currentHref: "https://admin.example.com/admin/products?page=1",
        href: "https://admin.example.com/admin/products?page=2",
      }),
    );
    expect(decision).toEqual({
      intercept: true,
      path: "/admin/products?page=2",
    });
  });

  it("resolves a relative href against the current location", () => {
    const decision = computeNavigationIntercept(
      base({ href: "/admin/orders", currentHref: CURRENT }),
    );
    expect(decision).toEqual({ intercept: true, path: "/admin/orders" });
  });

  it("preserves search and hash on the intercepted path", () => {
    const decision = computeNavigationIntercept(
      base({ href: "/admin/orders?status=open#top", currentHref: CURRENT }),
    );
    expect(decision).toEqual({
      intercept: true,
      path: "/admin/orders?status=open#top",
    });
  });
});
