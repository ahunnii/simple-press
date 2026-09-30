import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";

import { BambooMobileNav } from "./bamboo-mobile-nav";

/**
 * bamboo's full-screen mobile takeover — nav flag gating, sub-navigation
 * groups (parent href reachable, external links, active state), and the
 * pinned bottom account block (signed-out pair vs. signed-in quick links +
 * sign out). Findings PF1-PF3, PF5, PF7 from
 * docs/templates/bamboo/parity-plan-2026-09-27.md (TP1). Pattern follows
 * happy-bamboo/layout/happy-bamboo-mobile-nav.test.tsx, adapted to bamboo's
 * Radix-`Sheet`-based panel (portaled into `div.bamboo`, controlled entirely
 * by the `open` prop — there is no separate toggle sub-component here).
 */

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

let enabledFlags = new Set<string>();
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({
    isEnabled: (key: string) => enabledFlags.has(key),
  }),
}));

vi.mock("~/providers/wishlist-context", () => ({
  useWishlist: () => ({ count: 0 }),
}));

afterEach(() => {
  pathname = "/";
  enabledFlags = new Set();
});

type FakeBusiness = DefaultHeaderTemplateProps["business"];
type FakeSession = Parameters<typeof BambooMobileNav>[0]["session"];

function makeBusiness(
  overrides: {
    navigationItems?: NavItem[] | null;
    socialLinks?: Record<string, string>;
  } = {},
): FakeBusiness {
  return {
    name: "Test Shop",
    siteContent: {
      navigationItems: overrides.navigationItems,
      socialLinks: overrides.socialLinks,
      logoUrl: null,
    },
  } as unknown as FakeBusiness;
}

type HarnessProps = {
  business?: FakeBusiness;
  session?: FakeSession;
  isPending?: boolean;
};

/** Controlled harness: a plain toggle button plus the panel, both scoped
 *  inside a `div.bamboo` wrapper — the panel portals the Sheet into it. */
function Harness({
  business = makeBusiness(),
  session = null,
  isPending = false,
}: HarnessProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bamboo">
      <button type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
        Open menu
      </button>
      <BambooMobileNav
        open={open}
        onOpenChange={setOpen}
        business={business}
        session={session}
        isPending={isPending}
        menuTagline=""
      />
    </div>
  );
}

function renderHarness(props: HarnessProps = {}) {
  return render(<Harness {...props} />);
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
}

describe("BambooMobileNav nav (PF1-PF3, PF5)", () => {
  it("falls back to the default nav when none is saved, and renders nothing for []", () => {
    enabledFlags = new Set(["products"]);
    const { unmount } = renderHarness({
      business: makeBusiness({ navigationItems: undefined }),
    });
    openMenu();
    const nav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(nav.querySelectorAll("a, button")).toHaveLength(4);
    unmount();

    renderHarness({ business: makeBusiness({ navigationItems: [] }) });
    openMenu();
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" })
        .querySelectorAll("a, button"),
    ).toHaveLength(0);
  });

  const GROUPED_NAV: NavItem[] = [
    { label: "Home", href: "/" },
    {
      label: "Explore",
      href: "/collections",
      children: [{ label: "Blog", href: "/blog" }],
    },
    {
      label: "Misc",
      href: "",
      children: [
        { label: "Testimonials", href: "/testimonials" },
        { label: "Docs", href: "https://docs.example", external: true },
      ],
    },
  ];

  it("drops nav entries gated by a disabled feature flag (P-NAV-FLAGS, PF1)", () => {
    // Neither "collections"/"blog" nor "testimonials" is enabled: the
    // Explore group (its own href is gated, and its Blog child too) vanishes
    // entirely. Misc survives with only its external Docs child — external
    // links are never flag-gated, and Testimonials (internal) drops out.
    enabledFlags = new Set();
    renderHarness({
      business: makeBusiness({ navigationItems: GROUPED_NAV }),
    });
    openMenu();
    const nav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(
      Array.from(nav.querySelectorAll("a, button"), (el) =>
        el.textContent?.trim(),
      ),
    ).toEqual(["Home", "Misc"]);

    fireEvent.click(screen.getByRole("button", { name: "Misc" }));
    const sublist = document.getElementById(
      screen.getByRole("button", { name: "Misc" }).getAttribute("aria-controls")!,
    )!;
    expect(
      Array.from(sublist.querySelectorAll("a"), (a) => a.getAttribute("href")),
    ).toEqual(["https://docs.example"]);
  });

  describe("sub-navigation groups", () => {

    function openGrouped() {
      enabledFlags = new Set(["collections", "blog", "testimonials"]);
      renderHarness({
        business: makeBusiness({ navigationItems: GROUPED_NAV }),
      });
      openMenu();
    }

    it("renders a group as a collapsed disclosure button, not a link", () => {
      openGrouped();

      const trigger = screen.getByRole("button", { name: "Explore" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      const controls = trigger.getAttribute("aria-controls")!;
      expect(document.getElementById(controls)).toBeNull();
      expect(
        screen.queryByRole("link", { name: "Explore" }),
      ).not.toBeInTheDocument();
    });

    it("expands on click and lists a non-empty parent href as the first entry (PF2)", () => {
      openGrouped();

      const trigger = screen.getByRole("button", { name: "Explore" });
      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute("aria-expanded", "true");
      const sublist = document.getElementById(
        trigger.getAttribute("aria-controls")!,
      )!;
      const links = sublist.querySelectorAll("a");
      expect(Array.from(links, (a) => a.textContent)).toEqual([
        "Explore",
        "Blog",
      ]);
      expect(links[0]).toHaveAttribute("href", "/collections");
    });

    it("gives an empty-href group no link of its own and honors external children (PF5)", () => {
      openGrouped();

      const trigger = screen.getByRole("button", { name: "Misc" });
      fireEvent.click(trigger);
      const sublist = document.getElementById(
        trigger.getAttribute("aria-controls")!,
      )!;
      const links = Array.from(sublist.querySelectorAll("a"));
      expect(links.map((a) => a.getAttribute("href"))).toEqual([
        "/testimonials",
        "https://docs.example",
      ]);
      expect(
        screen.queryByRole("link", { name: /^Misc/ }),
      ).not.toBeInTheDocument();

      const docs = screen.getByRole("link", {
        name: "Docs (opens in new tab)",
      });
      expect(docs).toHaveAttribute("target", "_blank");
      expect(docs).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("marks only the active (longest-match) entry with aria-current (PF3)", () => {
      pathname = "/blog";
      openGrouped();

      const trigger = screen.getByRole("button", { name: "Explore" });
      expect(trigger).not.toHaveAttribute("aria-current");
      fireEvent.click(trigger);

      expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(
        screen.getByRole("link", { name: "Explore" }),
      ).not.toHaveAttribute("aria-current");
      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(
        1,
      );
    });
  });
});

describe("BambooMobileNav account block (PF7)", () => {
  it("shows the signed-out auth pair only when customerAccounts is on and not pending", () => {
    enabledFlags = new Set(["customerAccounts"]);
    const { unmount } = renderHarness();
    openMenu();
    expect(screen.getByRole("link", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    unmount();

    enabledFlags = new Set();
    renderHarness();
    openMenu();
    expect(
      screen.queryByRole("link", { name: "Sign up" }),
    ).not.toBeInTheDocument();
  });

  it("shows nothing while the session is pending (B4.5, no flash)", () => {
    enabledFlags = new Set(["customerAccounts"]);
    renderHarness({ isPending: true });
    openMenu();
    expect(
      screen.queryByRole("link", { name: "Sign up" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Account" }),
    ).not.toBeInTheDocument();
  });

  it("shows the quick-access account links plus a sign-out row when signed in, never the full list", () => {
    const session = {
      user: { id: "u1", name: "Test" },
      session: { id: "s1" },
    } as unknown as FakeSession;

    enabledFlags = new Set([
      "customerAccounts",
      "checkout",
      "subscriptions",
      "invoices",
      "loyalty",
    ]);
    const { unmount } = renderHarness({ session });
    openMenu();

    const account = screen.getByRole("navigation", { name: "Account" });
    expect(
      Array.from(account.querySelectorAll("a"), (a) => a.textContent?.trim()),
    ).toEqual(["Settings", "Sign out"]);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/account/settings",
    );
    expect(screen.getByRole("link", { name: "Sign out" })).toHaveAttribute(
      "href",
      "/auth/sign-out",
    );
    expect(
      screen.queryByRole("link", { name: "Address Book" }),
    ).not.toBeInTheDocument();
    unmount();

    enabledFlags = new Set(["customerAccounts", "orders"]);
    renderHarness({ session });
    openMenu();
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/account/orders",
    );
  });

  it("adds Admin for a member, without Orders while the flag is off", () => {
    const session = {
      user: { id: "u1", name: "Owner" },
      session: { id: "s1", membershipId: "m1" },
    } as unknown as FakeSession;

    enabledFlags = new Set(["customerAccounts"]);
    renderHarness({ session });
    openMenu();

    const account = screen.getByRole("navigation", { name: "Account" });
    expect(
      within(account).getByRole("link", { name: "Admin" }),
    ).toHaveAttribute("href", "/admin");
    expect(
      within(account).queryByRole("link", { name: "Orders" }),
    ).not.toBeInTheDocument();
  });
});
