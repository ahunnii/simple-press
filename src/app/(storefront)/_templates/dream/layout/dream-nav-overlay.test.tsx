import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { NavItem } from "~/app/(storefront)/_components/nav";

import { DreamNavOverlay } from "./dream-nav-overlay";

/**
 * Dream mobile overlay: a group with a parent href renders the big label as a
 * link plus a separate chevron toggle (sublist lists only the children); a
 * group with no parent href keeps one full-row toggle button.
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

vi.mock("./dream-nav-overlay-account", () => ({
  DreamNavOverlayAccount: () => null,
}));

const GROUP: NavItem = {
  label: "Explore",
  href: "/collections",
  children: [
    { label: "Videos", href: "/videos" },
    { label: "Journal", href: "/blog" },
  ],
};

function renderOverlay(items: NavItem[], onClose = vi.fn()) {
  render(
    <DreamNavOverlay
      open
      onClose={onClose}
      triggerRef={{ current: null }}
      items={items}
      businessName="Test Studio"
      logoUrl="/logo.webp"
      logoAlt="Test Studio"
      ctaLabel=""
      ctaUrl=""
      socialLinks={null}
      accountsEnabled={false}
      isEnabled={() => true}
    />,
  );
  return onClose;
}

describe("DreamNavOverlay groups", () => {
  it("splits a parent with an href into a link and a chevron toggle", () => {
    const onClose = renderOverlay([GROUP]);
    const link = screen.getByRole("link", { name: "Explore" });
    expect(link.getAttribute("href")).toBe("/collections");
    fireEvent.click(link);
    expect(onClose).toHaveBeenCalled();

    expect(screen.queryByRole("button", { name: "Explore" })).toBeNull();
    const toggle = screen.getByRole("button", { name: "Show Explore links" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    const sublist = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;
    expect(
      Array.from(sublist.querySelectorAll("a")).map((a) => [
        a.textContent,
        a.getAttribute("href"),
      ]),
    ).toEqual([
      ["Videos", "/videos"],
      ["Journal", "/blog"],
    ]);
    expect(within(sublist).queryByRole("link", { name: "Explore" })).toBeNull();
  });

  it("keeps one full-row toggle button when the parent has no href", () => {
    renderOverlay([{ ...GROUP, href: "" }]);
    expect(screen.queryByRole("link", { name: "Explore" })).toBeNull();
    const toggle = screen.getByRole("button", { name: "Explore" });
    fireEvent.click(toggle);
    const sublist = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;
    expect(
      Array.from(sublist.querySelectorAll("a")).map((a) => a.textContent),
    ).toEqual(["Videos", "Journal"]);
  });
});
