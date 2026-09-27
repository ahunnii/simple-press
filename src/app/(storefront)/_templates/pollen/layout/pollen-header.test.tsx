import type * as MotionReact from "motion/react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";

import { PollenHeader } from "./pollen-header";

/**
 * Pollen header: desktop dropdown disclosure, mobile overlay accordion, the
 * overlay's own account block (no UserButton), and the overlay logo.
 * Mocks follow happy-bamboo/layout/happy-bamboo-header.test.tsx.
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
  user: {
    name: string;
    email: string;
    image?: string | null;
    platformRole?: string;
  };
  session: { membershipId?: string | null };
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

vi.mock("~/providers/cart-context", () => ({
  useCart: () => ({ itemCount: 0 }),
}));

vi.mock("~/providers/wishlist-context", () => ({
  useWishlist: () => ({ count: 0 }),
}));

vi.mock("~/components/auth/user/user-button", () => ({
  UserButton: () => <div data-testid="user-button" />,
}));

// The bar pulls in TiptapRenderer → tRPC → the server db client; tests pass
// no banner anyway.
vi.mock("./pollen-announcement-bar", () => ({
  PollenAnnouncementBar: () => null,
}));

// Instant transitions keep AnimatePresence from dragging out in happy-dom.
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof MotionReact>();
  return { ...actual, useReducedMotion: () => true };
});

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

function renderHeader({
  navigationItems = NAV as unknown,
  logoUrl,
}: { navigationItems?: unknown; logoUrl?: string } = {}) {
  const business = {
    name: "Pollen Test Co",
    featureFlags: {},
    siteContent: { customFields: {}, navigationItems, logoUrl },
  } as unknown as DefaultHeaderTemplateProps["business"];
  return render(
    <div className="pollen">
      <PollenHeader business={business} />
      <main id="main-content">
        <button type="button">In main</button>
      </main>
      <footer>Footer</footer>
    </div>,
  );
}

function getDesktopNav() {
  return screen.getByRole("navigation", { name: "Main navigation" });
}

function openOverlay() {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  return screen.getByRole("dialog", { name: "Menu" });
}

afterEach(() => {
  pathname = "/";
  session = null;
  enabledFlags = new Set();
});

describe("PollenHeader desktop dropdown", () => {
  it("renders a group parent as a collapsed disclosure button", () => {
    renderHeader();
    const trigger = within(getDesktopNav()).getByRole("button", {
      name: "Services",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger).toHaveAttribute("aria-controls", "pollen-nav-dropdown-1");
    expect(document.getElementById("pollen-nav-dropdown-1")).toBeNull();
  });

  it("opens on click with the parent href as the first entry", () => {
    renderHeader();
    const trigger = within(getDesktopNav()).getByRole("button", {
      name: "Services",
    });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById("pollen-nav-dropdown-1")!;
    const links = Array.from(panel.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/services",
      "/services/massage",
      "https://book.example",
    ]);
    expect(links[0]).toHaveTextContent("Services");
    expect(links[2]).toHaveAttribute("target", "_blank");
    expect(links[2]).toHaveTextContent("(opens in new tab)");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    renderHeader();
    const trigger = within(getDesktopNav()).getByRole("button", {
      name: "Services",
    });
    fireEvent.click(trigger);
    expect(document.getElementById("pollen-nav-dropdown-1")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("pollen-nav-dropdown-1")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("marks only the most specific entry with aria-current", () => {
    pathname = "/services/massage";
    renderHeader();
    const nav = getDesktopNav();
    const trigger = within(nav).getByRole("button", { name: "Services" });
    expect(trigger).not.toHaveAttribute("aria-current");

    fireEvent.click(trigger);
    expect(within(nav).getByRole("link", { name: "Massages" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("never marks an empty-href parent current on unrelated pages", () => {
    pathname = "/about";
    renderHeader();
    const misc = within(getDesktopNav()).getByRole("button", { name: "Misc" });
    expect(misc.classList).not.toContain("text-[#5e7747]");
    expect(misc.classList).toContain("text-[#4c566a]");
  });

  it("falls back to the default nav (minus Services while it's off)", () => {
    renderHeader({ navigationItems: null });
    expect(
      Array.from(getDesktopNav().querySelectorAll("a"), (a) =>
        a.getAttribute("href"),
      ),
    ).toEqual(["/", "/about", "/contact"]);
  });

  it("shows a Log in link when signed out and accounts are on", () => {
    enabledFlags = new Set(["customerAccounts"]);
    renderHeader();
    expect(screen.getAllByRole("link", { name: "Log in" })[0]).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });

  it("hides desktop Log in when customer accounts are off", () => {
    renderHeader();
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });
});

describe("PollenHeader mobile overlay", () => {
  it("only sets aria-controls on the hamburger while the overlay is open", () => {
    renderHeader();
    const hamburger = screen.getByRole("button", { name: "Open menu" });
    expect(hamburger).not.toHaveAttribute("aria-controls");
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute("aria-controls", "pollen-mobile-menu");
    expect(document.getElementById("pollen-mobile-menu")).not.toBeNull();
  });

  it("inerts the page behind the overlay, scoped to the .pollen wrapper", () => {
    renderHeader();
    openOverlay();
    expect(document.querySelector("#main-content")).toHaveAttribute("inert");
    expect(document.querySelector("footer")).toHaveAttribute("inert");
    expect(document.querySelector("header.pollen-header")).toHaveAttribute(
      "inert",
    );
  });

  it("expands an accordion group to its entries", () => {
    renderHeader();
    const dialog = openOverlay();
    const trigger = within(dialog).getByRole("button", { name: "Services" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const sublist = document.getElementById(
      trigger.getAttribute("aria-controls")!,
    )!;
    expect(
      Array.from(sublist.querySelectorAll("a"), (a) => a.getAttribute("href")),
    ).toEqual(["/services", "/services/massage", "https://book.example"]);

    // One open at a time.
    fireEvent.click(within(dialog).getByRole("button", { name: "Misc" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("auto-expands the group holding the current route, one aria-current", () => {
    pathname = "/services/massage";
    renderHeader();
    const dialog = openOverlay();
    const nav = within(dialog).getByRole("navigation", {
      name: "Mobile navigation",
    });
    expect(
      within(nav).getByRole("button", { name: "Services" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(within(nav).getByRole("link", { name: "Massages" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("shows Log in + Sign up when signed out and accounts are on", () => {
    enabledFlags = new Set(["customerAccounts"]);
    renderHeader();
    const dialog = openOverlay();
    expect(
      within(dialog).getByRole("link", { name: "Log in" }),
    ).toHaveAttribute("href", "/auth/sign-in");
    expect(
      within(dialog).getByRole("link", { name: "Sign up" }),
    ).toHaveAttribute("href", "/auth/sign-up");
  });

  it("shows no account block when customer accounts are off", () => {
    renderHeader();
    const dialog = openOverlay();
    expect(within(dialog).queryByRole("link", { name: "Log in" })).toBeNull();
  });

  it("shows the signed-in account links in the overlay, flag-gated, no UserButton", () => {
    enabledFlags = new Set(["customerAccounts", "orders"]);
    session = {
      user: { name: "Ada Lovelace", email: "ada@example.com" },
      session: {},
    };
    renderHeader();
    const dialog = openOverlay();

    expect(within(dialog).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(dialog).getByText("ada@example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("AL")).toBeInTheDocument();

    const account = within(dialog).getByRole("navigation", { name: "Account" });
    const labels = Array.from(account.querySelectorAll("a"), (a) =>
      a.textContent?.trim(),
    );
    expect(labels).toEqual([
      "Orders",
      "Address Book",
      "Settings",
      "Security",
      "Preferences",
    ]);
    expect(
      within(dialog).getByRole("link", { name: "Sign out" }),
    ).toHaveAttribute("href", "/auth/sign-out");
    expect(within(dialog).queryByTestId("user-button")).toBeNull();
  });

  it("adds Admin in the overlay for members", () => {
    enabledFlags = new Set(["customerAccounts"]);
    session = {
      user: { name: "Owner", email: "o@example.com" },
      session: { membershipId: "m1" },
    };
    renderHeader();
    const dialog = openOverlay();
    const account = within(dialog).getByRole("navigation", { name: "Account" });
    expect(
      within(account).getByRole("link", { name: "Admin" }),
    ).toHaveAttribute("href", "/admin");
    expect(within(account).queryByRole("link", { name: "Orders" })).toBeNull();
  });

  it("renders the owner logo without an invert filter", () => {
    renderHeader({ logoUrl: "/logo.png" });
    const dialog = openOverlay();
    const img = within(dialog).getByRole("img");
    expect(img.className).not.toContain("invert");
  });

  it("falls back to the business name (never a placeholder) with no logo", () => {
    renderHeader();
    const dialog = openOverlay();
    expect(within(dialog).queryByRole("img")).toBeNull();
    expect(within(dialog).getByText("Pollen Test Co")).toBeInTheDocument();
    expect(dialog.innerHTML).not.toContain("placeholder.svg");
  });
});
