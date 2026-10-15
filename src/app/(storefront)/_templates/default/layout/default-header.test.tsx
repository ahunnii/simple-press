import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { UserButtonLink } from "~/components/auth/user/user-button";

import { DefaultHeader } from "./default-header";

/**
 * Default header account block: the desktop `UserButton` links and the mobile
 * "My account" entry both come from the shared `getQuickAccountNavLinks`
 * (B4.3), so Orders disappears with the `orders` flag. Mocks follow
 * bamboo/layout/bamboo-header.test.tsx.
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

type FakeSession = {
  user: { name: string; email: string; platformRole?: string };
  session?: { membershipId?: string | null };
} | null;

let session: FakeSession = null;
vi.mock("~/lib/auth/use-hydrated-session", () => ({
  useHydratedSession: () => ({ data: session, isPending: false }),
}));

let enabledFlags = new Set<string>();
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({
    isEnabled: (key: string) => enabledFlags.has(key),
  }),
}));

vi.mock("../cart-checkout/default-cart-badge", () => ({
  DefaultCartBadge: () => null,
}));
vi.mock("../cart-checkout/default-wishlist-badge", () => ({
  DefaultWishlistBadge: () => null,
}));

// Exposes the `links` prop so the quick-subset filtering (and the Settings
// drop) is verifiable without a real dropdown.
vi.mock("~/components/auth/user/user-button", () => ({
  UserButton: ({ links }: { links: UserButtonLink[] }) => (
    <div data-testid="user-button">
      {links.map((l) => (
        <a key={l.href} href={l.href}>
          {l.label}
        </a>
      ))}
    </div>
  ),
}));

function renderHeader() {
  const business = {
    name: "Test Shop",
    siteContent: { customFields: {}, navigationItems: null, logoUrl: null },
  } as unknown as DefaultHeaderTemplateProps["business"];
  return render(<DefaultHeader business={business} />);
}

function userButtonLabels() {
  return Array.from(
    screen.getByTestId("user-button").querySelectorAll("a"),
  ).map((a) => a.textContent);
}

describe("DefaultHeader account menu", () => {
  beforeEach(() => {
    enabledFlags = new Set(["customerAccounts", "products", "orders"]);
    session = {
      user: { name: "Sam", email: "sam@example.com" },
      session: { membershipId: null },
    };
  });

  afterEach(() => {
    session = null;
  });

  it("lists Orders (no Settings, no Admin) for a plain customer", () => {
    renderHeader();
    expect(userButtonLabels()).toEqual(["Orders"]);
  });

  it("adds Admin for a business member", () => {
    session = { ...session!, session: { membershipId: "m1" } };
    renderHeader();
    expect(userButtonLabels()).toEqual(["Orders", "Admin"]);
  });

  it("hides Orders when the orders flag is off", () => {
    enabledFlags.delete("orders");
    renderHeader();
    expect(userButtonLabels()).toEqual([]);
    // Mobile entry falls back to Settings instead of the 404ing orders page.
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    const mobile = screen.getByRole("link", { name: /my account/i });
    expect(mobile.getAttribute("href")).toBe("/account/settings");
  });
});
