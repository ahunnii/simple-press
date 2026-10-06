import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultHeaderTemplateProps } from "../../types";

import { DreamHeader } from "./dream-header";

/**
 * Dream header: cart link visibility (the `cart` flag AND a published product
 * or a non-empty cart), P-NAV-FLAGS nav filtering, group dropdowns (a parent
 * href renders as a link + chevron toggle and the panel lists only children;
 * no parent href is one button; close delay; Escape returns focus to the
 * toggle), and the flag-gated header CTA pill.
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

  it("renders the parent as a link plus a chevron toggle listing only children", () => {
    renderHeader([], { navigationItems: GROUP_NAV });
    const link = screen.getByRole("link", { name: "Explore" });
    expect(link.getAttribute("href")).toBe("/collections");
    // No button carries the label itself.
    expect(screen.queryByRole("button", { name: "Explore" })).toBeNull();

    const chevron = screen.getByRole("button", { name: "Show Explore menu" });
    expect(chevron.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(chevron);
    expect(chevron.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(
      chevron.getAttribute("aria-controls")!,
    )!;
    const hrefs = Array.from(panel.querySelectorAll("a")).map((a) => [
      a.textContent,
      a.getAttribute("href"),
    ]);
    // The parent is not repeated inside the panel.
    expect(hrefs).toEqual([
      ["Videos", "/videos"],
      ["Journal", "/blog"],
    ]);
    expect(within(panel).queryByRole("link", { name: "Explore" })).toBeNull();
  });

  it("uses a single button trigger when the parent has no href", () => {
    renderHeader([], {
      navigationItems: [{ ...GROUP_NAV[0]!, href: "" }, GROUP_NAV[1]],
    });
    expect(screen.queryByRole("link", { name: "Explore" })).toBeNull();
    const trigger = screen.getByRole("button", { name: "Explore" });
    fireEvent.click(trigger);
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls")!,
    )!;
    expect(
      Array.from(panel.querySelectorAll("a")).map((a) => a.textContent),
    ).toEqual(["Videos", "Journal"]);
  });

  it("drops gated children from a group", () => {
    enabledFlags.delete("videos");
    renderHeader([], { navigationItems: GROUP_NAV });
    fireEvent.click(screen.getByRole("button", { name: "Show Explore menu" }));
    expect(screen.queryByRole("link", { name: "Videos" })).toBeNull();
    expect(screen.getByRole("link", { name: "Journal" })).toBeTruthy();
  });

  it("closes on Escape and returns focus to the chevron", () => {
    renderHeader([], { navigationItems: GROUP_NAV });
    const trigger = screen.getByRole("button", { name: "Show Explore menu" });
    fireEvent.click(trigger);
    const child = screen.getByRole("link", { name: "Videos" });
    child.focus();
    expect(document.activeElement).toBe(child);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "Videos" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  describe("hover open + close delay", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const wrapOf = () =>
      screen.getByRole("button", { name: "Show Explore menu" }).parentElement!;

    it("stays open when the pointer re-enters within the delay", () => {
      renderHeader([], { navigationItems: GROUP_NAV });
      const wrap = wrapOf();
      fireEvent.mouseEnter(wrap);
      expect(screen.getByRole("link", { name: "Videos" })).toBeTruthy();
      fireEvent.mouseLeave(wrap);
      act(() => {
        vi.advanceTimersByTime(80);
      });
      fireEvent.mouseEnter(wrap);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.getByRole("link", { name: "Videos" })).toBeTruthy();
    });

    it("closes once the delay passes without re-entering", () => {
      renderHeader([], { navigationItems: GROUP_NAV });
      const wrap = wrapOf();
      fireEvent.mouseEnter(wrap);
      fireEvent.mouseLeave(wrap);
      expect(screen.getByRole("link", { name: "Videos" })).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.queryByRole("link", { name: "Videos" })).toBeNull();
    });

    it("keeps a hover-opened panel open on the first chevron click", () => {
      renderHeader([], { navigationItems: GROUP_NAV });
      fireEvent.mouseEnter(wrapOf());
      const chevron = screen.getByRole("button", { name: "Show Explore menu" });
      fireEvent.click(chevron);
      expect(chevron.getAttribute("aria-expanded")).toBe("true");
      fireEvent.click(chevron);
      expect(chevron.getAttribute("aria-expanded")).toBe("false");
    });
  });
});

describe("DreamHeader CTA pill", () => {
  const CTA = {
    "dream.global.header-cta-label": "Book a session",
    "dream.global.header-cta-url": "/services",
  };

  it("renders when its destination's flag is on", () => {
    renderHeader([], { customFields: CTA });
    // Desktop pill (right cell) + mobile pill (actions); CSS shows one.
    const pills = screen.getAllByRole("link", { name: "Book a session" });
    expect(pills).toHaveLength(2);
    for (const pill of pills) {
      expect(pill.getAttribute("href")).toBe("/services");
    }
  });

  it("is hidden (never re-pointed) when its destination's flag is off", () => {
    enabledFlags.delete("services");
    renderHeader([], { customFields: CTA });
    expect(screen.queryByRole("link", { name: "Book a session" })).toBeNull();
  });
});
