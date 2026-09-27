import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultHeaderTemplateProps } from "../../types";

import { DreamHeader } from "./dream-header";

/**
 * Cart link visibility in the dream header: shown once the store has a
 * published product or the cart has items, hidden on a services-only store
 * with an empty cart.
 */

let itemCount = 0;

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

vi.mock("~/lib/auth/use-hydrated-session", () => ({
  useHydratedSession: () => ({ data: null, isPending: false }),
}));

vi.mock("~/hooks/use-feature-flags", () => ({
  useFeatureFlags: () => ({ isEnabled: () => false }),
}));

vi.mock("~/components/auth/user/user-button", () => ({
  UserButton: () => null,
}));

vi.mock("~/providers/cart-context", () => ({
  useCart: () => ({ itemCount }),
}));

vi.mock("./dream-nav-overlay", () => ({
  DreamNavOverlay: () => null,
}));

function renderHeader(products: unknown[]) {
  const business = {
    name: "Test Studio",
    products,
    featureFlags: {},
    siteContent: { customFields: {}, navigationItems: null },
  } as unknown as DefaultHeaderTemplateProps["business"];
  return render(<DreamHeader business={business} />);
}

describe("DreamHeader cart link", () => {
  beforeEach(() => {
    itemCount = 0;
  });

  it("is hidden when the store has no products and the cart is empty", () => {
    renderHeader([]);
    expect(screen.queryByRole("link", { name: /^Cart/ })).toBeNull();
  });

  it("links to /cart when the store has a published product", () => {
    renderHeader([{ id: "p1" }]);
    const link = screen.getByRole("link", { name: "Cart" });
    expect(link.getAttribute("href")).toBe("/cart");
  });

  it("shows the item count when the cart has items, even with no products", () => {
    itemCount = 3;
    const { container } = renderHeader([]);
    expect(screen.getByRole("link", { name: "Cart, 3 items" })).toBeTruthy();
    expect(
      container.querySelector(".dream-header-cart-count")?.textContent,
    ).toBe("3");
  });
});
