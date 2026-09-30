import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOrderAccountCta } from "./use-order-account-cta";

type FakeSession = { user: { name: string; email: string } } | null;

let session: FakeSession = null;
let sessionPending = false;
vi.mock("~/lib/auth/use-hydrated-session", () => ({
  useHydratedSession: () => ({ data: session, isPending: sessionPending }),
}));

let enabledFlags = new Set<string>();
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({
    isEnabled: (key: string) => enabledFlags.has(key),
  }),
}));

const SIGNED_IN: FakeSession = {
  user: { name: "Ada", email: "ada@example.com" },
};

describe("useOrderAccountCta", () => {
  beforeEach(() => {
    session = null;
    sessionPending = false;
    enabledFlags = new Set(["orders", "customerAccounts"]);
  });

  it("links a signed-in customer to their orders when orders is on", () => {
    session = SIGNED_IN;
    const { result } = renderHook(() => useOrderAccountCta());
    expect(result.current).toEqual({
      href: "/account/orders",
      label: "View my orders",
    });
  });

  it("returns null for a signed-in customer when orders is off", () => {
    session = SIGNED_IN;
    enabledFlags = new Set(["customerAccounts"]);
    const { result } = renderHook(() => useOrderAccountCta());
    expect(result.current).toBeNull();
  });

  it("offers sign-up when signed out and customer accounts are on", () => {
    const { result } = renderHook(() => useOrderAccountCta());
    expect(result.current).toEqual({
      href: "/auth/sign-up",
      label: "Create an account",
    });
  });

  it("returns null when signed out and customer accounts are off", () => {
    enabledFlags = new Set(["orders"]);
    const { result } = renderHook(() => useOrderAccountCta());
    expect(result.current).toBeNull();
  });

  it("returns null while the session is pending", () => {
    sessionPending = true;
    session = SIGNED_IN;
    const { result } = renderHook(() => useOrderAccountCta());
    expect(result.current).toBeNull();
  });
});
