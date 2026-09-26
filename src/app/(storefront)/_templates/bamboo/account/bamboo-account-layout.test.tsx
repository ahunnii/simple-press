import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StorefrontFlagsProvider } from "~/providers/feature-flags-context";

import { BambooAccountLayout } from "./bamboo-account-layout";

/**
 * Menu coverage for the flag-gated Subscriptions/Invoices/Rewards nav items
 * added 2026-09-25 (see `NAV_ITEMS` in `bamboo-account-layout.tsx`).
 *
 * Mounts the real `StorefrontFlagsProvider` (rather than mocking
 * `useStorefrontFlags` directly, as `subscribe-panel.test.tsx` does) so the
 * registry's own dependency cascade (`src/lib/features/registry.ts` /
 * `resolve-flags.ts`) is exercised: `subscriptions` depends on
 * `products`+`payments`, `loyalty` on `customerAccounts`+`orders`. All four
 * of those dependencies default to enabled, so passing just the three
 * top-level overrides is enough to turn the gated items on.
 */

let pathname = "/account/settings";
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

// bamboo's `FadeIn` (`whileInView`) constructs an IntersectionObserver on
// mount for the page-hero heading; happy-dom doesn't implement it (same stub
// as tests/templates/account-render.test.tsx).
class MockIntersectionObserver {
  observe() {
    // no-op
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
  takeRecords() {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

function renderLayout(flags: unknown) {
  return render(
    <StorefrontFlagsProvider flags={flags}>
      <BambooAccountLayout heading="Account">
        <div>content</div>
      </BambooAccountLayout>
    </StorefrontFlagsProvider>,
  );
}

describe("BambooAccountLayout nav", () => {
  it("always shows Orders and Settings", () => {
    renderLayout({ subscriptions: false, invoices: false, loyalty: false });

    // One in the mobile tab list, one in the desktop sidebar.
    expect(screen.getAllByRole("link", { name: "Orders" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Settings" })).toHaveLength(2);
  });

  it("hides Subscriptions/Invoices/Rewards when their flags are off", () => {
    renderLayout({ subscriptions: false, invoices: false, loyalty: false });

    expect(
      screen.queryByRole("link", { name: "Subscriptions" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Invoices" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Rewards" }),
    ).not.toBeInTheDocument();
  });

  it("shows Subscriptions/Invoices/Rewards when their flags (and dependencies) are on", () => {
    renderLayout({ subscriptions: true, invoices: true, loyalty: true });

    expect(screen.getAllByRole("link", { name: "Subscriptions" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Invoices" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Rewards" })).toHaveLength(2);
  });

  it("marks the current page's link aria-current in both mobile and desktop lists", () => {
    pathname = "/account/invoices";
    renderLayout({ subscriptions: true, invoices: true, loyalty: true });

    const invoiceLinks = screen.getAllByRole("link", { name: "Invoices" });
    expect(invoiceLinks).toHaveLength(2);
    for (const link of invoiceLinks) {
      expect(link).toHaveAttribute("aria-current", "page");
    }

    const orderLinks = screen.getAllByRole("link", { name: "Orders" });
    for (const link of orderLinks) {
      expect(link).not.toHaveAttribute("aria-current");
    }

    pathname = "/account/settings";
  });
});
