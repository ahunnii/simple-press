import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultHeaderTemplateProps } from "../../types";

import { DreamHeader } from "./dream-header";

/**
 * Dream header: cart link visibility (the `cart` flag AND a published product
 * or a non-empty cart), P-NAV-FLAGS nav filtering, group dropdowns (parent
 * href as the first entry, Escape returns focus to the trigger), and the
 * flag-gated header CTA pill.
 */

let itemCount = 0;
let enabledFlags = new Set<string>();

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
  useFeatureFlags: () => ({
    isEnabled: (key: string) => enabledFlags.has(key),
  }),
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

function renderHeader(
  products: unknown[],
  {
    navigationItems = null,
    customFields = {},
  }: { navigationItems?: unknown; customFields?: Record<string, string> } = {},
) {
  const business = {
    name: "Test Studio",
    products,
    featureFlags: {},
    siteContent: { customFields, navigationItems },
  } as unknown as DefaultHeaderTemplateProps["business"];
  return render(<DreamHeader business={business} />);
}

const GROUP_NAV = [
  {
    label: "Explore",
    href: "/collections",
    children: [
      { label: "Videos", href: "/videos" },
      { label: "Journal", href: "/blog" },
    ],
  },
  { label: "About", href: "/about" },
];

beforeEach(() => {
  itemCount = 0;
  enabledFlags = new Set(["cart", "collections", "videos", "blog", "services"]);
});

describe("DreamHeader cart link", () => {
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

describe("DreamHeader cart flag", () => {
  it("is hidden while the cart flag is off, even with products and items", () => {
    enabledFlags.delete("cart");
    itemCount = 2;
    renderHeader([{ id: "p1" }]);
    expect(screen.queryByRole("link", { name: /^Cart/ })).toBeNull();
  });
});

describe("DreamHeader nav", () => {
  it("drops links to flag-disabled features (P-NAV-FLAGS)", () => {
    enabledFlags.delete("services");
    renderHeader([]);
    expect(screen.queryByRole("link", { name: "Services" })).toBeNull();
    expect(screen.getByRole("link", { name: "About" })).toBeTruthy();
  });

  it("lists the group parent's own href as the first dropdown entry", () => {
    renderHeader([], { navigationItems: GROUP_NAV });
    const trigger = screen.getByRole("button", { name: "Explore" });
    // The trigger never navigates.
    expect(trigger.tagName).toBe("BUTTON");
    fireEvent.click(trigger);
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls")!,
    )!;
    const hrefs = Array.from(panel.querySelectorAll("a")).map((a) => [
      a.textContent,
      a.getAttribute("href"),
    ]);
    expect(hrefs).toEqual([
      ["Explore", "/collections"],
      ["Videos", "/videos"],
      ["Journal", "/blog"],
    ]);
  });

  it("drops gated children from a group", () => {
    enabledFlags.delete("videos");
    renderHeader([], { navigationItems: GROUP_NAV });
    fireEvent.click(screen.getByRole("button", { name: "Explore" }));
    expect(screen.queryByRole("link", { name: "Videos" })).toBeNull();
    expect(screen.getByRole("link", { name: "Journal" })).toBeTruthy();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    renderHeader([], { navigationItems: GROUP_NAV });
    const trigger = screen.getByRole("button", { name: "Explore" });
    fireEvent.click(trigger);
    const child = screen.getByRole("link", { name: "Videos" });
    child.focus();
    expect(document.activeElement).toBe(child);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "Videos" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("DreamHeader CTA pill", () => {
  const CTA = {
    "dream.global.header-cta-label": "Book a session",
    "dream.global.header-cta-url": "/services",
  };

  it("renders when its destination's flag is on", () => {
    renderHeader([], { customFields: CTA });
    const pill = screen.getByRole("link", { name: "Book a session" });
    expect(pill.getAttribute("href")).toBe("/services");
  });

  it("is hidden (never re-pointed) when its destination's flag is off", () => {
    enabledFlags.delete("services");
    renderHeader([], { customFields: CTA });
    expect(screen.queryByRole("link", { name: "Book a session" })).toBeNull();
  });
});
