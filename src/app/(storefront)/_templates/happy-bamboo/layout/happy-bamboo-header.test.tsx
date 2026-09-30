import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { UserButtonLink } from "~/components/auth/user/user-button";

import { HappyBambooHeader } from "./happy-bamboo-header";

/**
 * Desktop sub-navigation in the happy-bamboo header: nav items with
 * children render as a custom disclosure (button trigger + panel), never a
 * navigating link. Mocks follow dream/layout/dream-header.test.tsx and (for
 * the mutable flags/session) pollen/layout/pollen-header.test.tsx.
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
// rather than a constant `false` — nav filtering now depends on it.
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
  useWishlist: () => ({ count: 0, isHydrated: true }),
}));

// Exposes the `links` prop passed by the header so PF6's quick-subset
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
// needs `resolveFields` for the cart copy.
vi.mock("..", () => ({
  resolveFields: () => ({}),
}));

vi.mock("../cart-checkout/happy-bamboo-cart-drawer", () => ({
  HappyBambooCartDrawer: () => null,
}));

vi.mock("./happy-bamboo-mobile-nav", () => ({
  HappyBambooMenuToggle: () => null,
  HappyBambooMobileMenu: () => null,
}));

const NAV: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Services",
    href: "/services",
    children: [
      { label: "Massages", href: "/services/massage" },
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
    siteContent: { customFields: {}, navigationItems },
  } as unknown as DefaultHeaderTemplateProps["business"];
  return render(<HappyBambooHeader business={business} />);
}

function getNav() {
  return screen.getByRole("navigation", { name: "Main navigation" });
}

// NAV's gated routes ("/services", "/testimonials") and HB_DEFAULT_NAV's
// ("/shop" → "products") stay enabled by default so the pre-existing
// sub-navigation assertions don't have to know about P-NAV-FLAGS; the tests
// that exercise the filter itself narrow `enabledFlags` explicitly.
beforeEach(() => {
  enabledFlags = new Set(["services", "testimonials", "products"]);
});

afterEach(() => {
  pathname = "/";
  session = null;
  enabledFlags = new Set();
});

describe("HappyBambooHeader desktop sub-navigation", () => {
  it("renders a group parent as a collapsed button, not a link", () => {
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Services" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger).toHaveAttribute("aria-controls", "hb-nav-dropdown-1");
    expect(document.getElementById("hb-nav-dropdown-1")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Services" }),
    ).not.toBeInTheDocument();
  });

  it("opens on click with the parent href as the first entry", () => {
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Services" });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById("hb-nav-dropdown-1")!;
    const links = Array.from(panel.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/services",
      "/services/massage",
      "https://book.example",
    ]);
    expect(links[0]).toHaveTextContent("Services");
  });

  it("marks external children with new-tab attributes and an sr-only hint", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Services" }));

    const booking = screen.getByRole("link", {
      name: "Booking (opens in new tab)",
    });
    expect(booking).toHaveAttribute("target", "_blank");
    expect(booking).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Services" });
    fireEvent.click(trigger);
    expect(document.getElementById("hb-nav-dropdown-1")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("hb-nav-dropdown-1")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on an outside pointer-down and on child click", () => {
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Services" });
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("link", { name: "Massages" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("stays open when a hover-open is followed by a click", () => {
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Services" });
    fireEvent.mouseEnter(trigger.parentElement!);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // A second click (no new hover) closes it.
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("gives an empty-href group no link of its own", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Misc" }));

    const panel = document.getElementById("hb-nav-dropdown-2")!;
    expect(
      Array.from(panel.querySelectorAll("a"), (a) => a.getAttribute("href")),
    ).toEqual(["/testimonials"]);
  });

  it("marks plain links and the active child with aria-current, never the trigger", () => {
    pathname = "/services/massage";
    renderHeader();

    const trigger = screen.getByRole("button", { name: "Services" });
    expect(trigger).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );

    fireEvent.click(trigger);
    expect(screen.getByRole("link", { name: "Massages" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(getNav().querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("falls back to the default nav when none is saved, and renders nothing for []", () => {
    const { unmount } = renderHeader(null);
    expect(getNav().querySelectorAll("a")).toHaveLength(4);
    unmount();

    renderHeader([]);
    expect(getNav().querySelectorAll("a")).toHaveLength(0);
  });

  it("drops nav entries gated by a disabled feature flag (P-NAV-FLAGS, PF1)", () => {
    // Neither "services" nor "testimonials" is enabled: the Services group
    // (its own href is gated) and the Misc group (its only child is gated,
    // leaving it with an empty href and no surviving children) both vanish.
    enabledFlags = new Set();
    renderHeader();
    expect(
      Array.from(getNav().querySelectorAll("a, button"), (el) =>
        el.textContent?.trim(),
      ),
    ).toEqual(["Home"]);
  });
});

describe("HappyBambooHeader cart gate (PF2)", () => {
  it("renders the cart button only when the cart flag is enabled", () => {
    const { unmount } = renderHeader();
    expect(screen.queryByRole("button", { name: "Open cart" })).toBeNull();
    unmount();

    enabledFlags = new Set(["cart"]);
    renderHeader();
    expect(
      screen.getByRole("button", { name: "Open cart" }),
    ).toBeInTheDocument();
  });
});

describe("HappyBambooHeader signed-out Log in (PF5)", () => {
  it("prepends an aria-hidden user icon to the desktop Log in link", () => {
    enabledFlags = new Set(["customerAccounts"]);
    renderHeader();

    const link = screen.getByRole("link", { name: "Log in" });
    const icon = link.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});

describe("HappyBambooHeader signed-in avatar menu (PF6)", () => {
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
