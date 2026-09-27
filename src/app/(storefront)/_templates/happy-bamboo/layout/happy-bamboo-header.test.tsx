import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { HbNavItem } from "../lib/nav";

import { HappyBambooHeader } from "./happy-bamboo-header";

/**
 * Desktop sub-navigation in the happy-bamboo header: nav items with
 * children render as a custom disclosure (button trigger + panel), never a
 * navigating link. Mocks follow dream/layout/dream-header.test.tsx.
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

vi.mock("~/lib/auth/use-hydrated-session", () => ({
  useHydratedSession: () => ({ data: null, isPending: false }),
}));

vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({ isEnabled: () => false }),
}));

vi.mock("~/providers/cart-context", () => ({
  useCart: () => ({ itemCount: 0, setIsOpen: vi.fn() }),
}));

vi.mock("~/providers/wishlist-context", () => ({
  useWishlist: () => ({ count: 0, isHydrated: true }),
}));

vi.mock("~/components/auth/user/user-button", () => ({
  UserButton: () => null,
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

const NAV: HbNavItem[] = [
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

afterEach(() => {
  pathname = "/";
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
});
