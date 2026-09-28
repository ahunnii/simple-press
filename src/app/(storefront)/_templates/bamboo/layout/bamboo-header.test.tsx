import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { UserButtonLink } from "~/components/auth/user/user-button";

import { BambooHeader } from "./bamboo-header";

/**
 * bamboo's desktop sub-navigation, nav flag gating, and account-menu quick
 * subset — the parity fixes from docs/templates/bamboo/parity-plan-2026-09-27.md
 * (TP1, PF1-PF9). Pattern follows
 * happy-bamboo/layout/happy-bamboo-header.test.tsx, adapted to bamboo's
 * hover+focus disclosure and icon-only sign-in action.
 */

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
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

// Mutable per-test flag set (P-NAV-FLAGS + the cart/customerAccounts gates)
// rather than a constant, since nav/cart/account gating all depend on it.
let enabledFlags = new Set<string>();
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({
    isEnabled: (key: string) => enabledFlags.has(key),
  }),
}));

vi.mock("~/providers/cart-context", () => ({
  useCart: () => ({ itemCount: 0, setIsOpen: vi.fn() }),
}));

vi.mock("~/providers/wishlist-context", () => ({
  useWishlist: () => ({ count: 0 }),
}));

// Exposes the `links` prop passed by the header so the quick-subset
// filtering (and the settings dedup) is verifiable without a real dropdown.
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

// The template index is heavy (every page/field registry); the header only
// needs `resolveFields` for the nav-wordmark/cart copy.
vi.mock("..", () => ({
  resolveFields: () => ({}),
}));

vi.mock("../cart-checkout/bamboo-cart-drawer", () => ({
  BambooCartDrawer: () => null,
}));

vi.mock("./bamboo-mobile-nav", () => ({
  BambooMobileNav: () => null,
}));

const NAV: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Explore",
    href: "/collections",
    children: [
      { label: "Blog", href: "/blog" },
      { label: "Booking", href: "https://book.example", external: true },
    ],
  },
  {
    label: "Misc",
    href: "",
    children: [{ label: "Testimonials", href: "/testimonials" }],
  },
];

function renderHeader(navigationItems: unknown = NAV) {
  const business = {
    name: "Test Shop",
    siteContent: { customFields: {}, navigationItems, logoUrl: null },
  } as unknown as DefaultHeaderTemplateProps["business"];
  return render(<BambooHeader business={business} />);
}

function getNav() {
  return screen.getByRole("navigation", { name: "Main navigation" });
}

/**
 * The nav's `[1fr_auto_1fr]` grid always carries a middle "home" emblem link
 * (the hanging-emblem signature moment) that isn't part of the resolved
 * `links` list — so link/button counts and aria-current queries have to
 * look only at the two outer link-half cells, not the whole `<nav>`.
 */
function getNavItems() {
  const [left, , right] = Array.from(getNav().children) as HTMLElement[];
  return [
    ...Array.from(left!.querySelectorAll("a, button")),
    ...Array.from(right!.querySelectorAll("a, button")),
  ];
}

// NAV's gated routes ("/collections", "/blog", "/testimonials") stay enabled
// by default so the pre-existing sub-navigation assertions don't have to
// know about P-NAV-FLAGS; the tests that exercise the filter itself narrow
// `enabledFlags` explicitly.
beforeEach(() => {
  enabledFlags = new Set(["collections", "blog", "testimonials"]);
});

afterEach(() => {
  pathname = "/";
  session = null;
  enabledFlags = new Set();
});

describe("BambooHeader desktop sub-navigation (PF1-PF5)", () => {
  it("renders a group parent as a collapsed button, not a link", () => {
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Explore" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(document.getElementById("bamboo-nav-dropdown-1")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Explore" }),
    ).not.toBeInTheDocument();
  });

  it("opens on click with the parent href as the first entry (PF2)", () => {
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Explore" });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById("bamboo-nav-dropdown-1")!;
    const links = Array.from(panel.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/collections",
      "/blog",
      "https://book.example",
    ]);
    expect(links[0]).toHaveTextContent("Explore");
  });

  it("opens on focus, not just hover (PF4)", () => {
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Explore" });
    fireEvent.focus(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("marks external children with new-tab attributes and an sr-only hint (PF5)", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Explore" }));

    const booking = screen.getByRole("link", {
      name: "Booking (opens in new tab)",
    });
    expect(booking).toHaveAttribute("target", "_blank");
    expect(booking).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Explore" });
    fireEvent.click(trigger);
    expect(document.getElementById("bamboo-nav-dropdown-1")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("bamboo-nav-dropdown-1")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("gives an empty-href group no link of its own", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Misc" }));

    const panel = document.getElementById("bamboo-nav-dropdown-2")!;
    expect(
      Array.from(panel.querySelectorAll("a"), (a) => a.getAttribute("href")),
    ).toEqual(["/testimonials"]);
  });

  it("marks the active child (longest match) with aria-current, never the trigger (PF3)", () => {
    pathname = "/blog";
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Explore" });
    expect(trigger).not.toHaveAttribute("aria-current");

    fireEvent.click(trigger);
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      getNavItems().filter((el) => el.getAttribute("aria-current") === "page"),
    ).toHaveLength(1);
  });

  it("marks a plain top-level link active on its own route (PF3)", () => {
    pathname = "/shop/some-product";
    enabledFlags = new Set(["products"]);
    renderHeader([{ label: "Shop", href: "/shop" }]);

    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("falls back to the default nav when none is saved, and renders nothing for []", () => {
    enabledFlags = new Set(["products"]);
    const { unmount } = renderHeader(null);
    expect(getNavItems()).toHaveLength(4);
    unmount();

    renderHeader([]);
    expect(getNavItems()).toHaveLength(0);
  });

  it("drops nav entries gated by a disabled feature flag (P-NAV-FLAGS, PF1)", () => {
    // Neither "collections"/"blog" nor "testimonials" is enabled: the
    // Explore group (its own href is gated, and its Blog child too) and the
    // Misc group (its only child is gated, leaving it with an empty href and
    // no surviving children) both vanish.
    enabledFlags = new Set();
    renderHeader();
    expect(getNavItems().map((el) => el.textContent?.trim())).toEqual([
      "Home",
    ]);
  });
});

describe("BambooHeader cart gate (PF6)", () => {
  it("renders the cart button only when the cart flag is enabled", () => {
    const { unmount } = renderHeader();
    expect(
      screen.queryByRole("button", { name: /Shopping cart/ }),
    ).toBeNull();
    unmount();

    enabledFlags = new Set(["cart"]);
    renderHeader();
    expect(
      screen.getByRole("button", { name: /Shopping cart/ }),
    ).toBeInTheDocument();
  });
});

describe("BambooHeader signed-out sign-in action (PF8)", () => {
  it("uses the accessible name 'Sign in'", () => {
    enabledFlags = new Set(["customerAccounts"]);
    renderHeader();

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });
});

describe("BambooHeader signed-in avatar menu (PF7)", () => {
  it("passes only the quick-access subset to UserButton, minus the deduped Settings", () => {
    session = {
      user: { name: "Ada Lovelace", email: "ada@example.com" },
      session: { membershipId: "m1" },
    };
    // Enable every account-nav-producing flag so the full 9-key list exists,
    // to prove the header narrows it to the quick subset rather than the
    // flags themselves doing the narrowing.
    enabledFlags = new Set([
      "customerAccounts",
      "orders",
      "checkout",
      "subscriptions",
      "invoices",
      "loyalty",
    ]);
    renderHeader();

    const userButton = screen.getByTestId("user-button");
    expect(
      Array.from(userButton.querySelectorAll("a"), (a) => a.textContent),
    ).toEqual(["Orders", "Admin"]);
  });

  it("drops Admin for a non-member and Orders while the flag is off", () => {
    session = { user: { name: "Shopper", email: "shopper@example.com" } };
    enabledFlags = new Set(["customerAccounts"]);
    renderHeader();

    const userButton = screen.getByTestId("user-button");
    expect(userButton.querySelectorAll("a")).toHaveLength(0);
  });
});
