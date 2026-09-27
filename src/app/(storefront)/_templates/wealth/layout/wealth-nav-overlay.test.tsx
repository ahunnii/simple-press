import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

import { WealthNavOverlay } from "./wealth-nav-overlay";

/**
 * Wealth nav overlay account block: plain links inside the dialog (no
 * UserButton — its portaled dropdown landed under the z-60 overlay),
 * flag-gated via the shared `getAccountNavLinks`, closing the overlay.
 * Mocks follow pollen/layout/pollen-header.test.tsx.
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
let isPending = false;
vi.mock("~/lib/auth/use-hydrated-session", () => ({
  useHydratedSession: () => ({ data: session, isPending }),
}));

vi.mock("~/components/auth/user/user-button", () => ({
  UserButton: () => <div data-testid="user-button" />,
}));

function renderOverlay({
  flags = [],
  accountsEnabled = true,
}: { flags?: string[]; accountsEnabled?: boolean } = {}) {
  const onClose = vi.fn();
  const enabled = new Set(flags);
  const overlay = (open: boolean) => (
    <WealthNavOverlay
      open={open}
      onClose={onClose}
      triggerRef={{ current: null }}
      items={[{ type: "link", label: "Home", href: "/" }]}
      businessName="Wealth Test Co"
      logoAlt="Wealth Test Co"
      isEnabled={(flag) => enabled.has(flag)}
      accountsEnabled={accountsEnabled}
    />
  );
  // Mount closed, then open — as the header does. (The overlay's
  // close-on-route-change effect also fires on mount.)
  const { rerender } = render(overlay(false));
  rerender(overlay(true));
  return {
    dialog: screen.getByRole("dialog", { name: "Navigation menu" }),
    onClose,
  };
}

afterEach(() => {
  session = null;
  isPending = false;
});

describe("WealthNavOverlay account block", () => {
  it("shows Log in + Sign up inside the dialog when signed out", () => {
    const { dialog, onClose } = renderOverlay();
    const logIn = within(dialog).getByRole("link", { name: "Log in" });
    expect(logIn).toHaveAttribute("href", "/auth/sign-in");
    expect(
      within(dialog).getByRole("link", { name: "Sign up" }),
    ).toHaveAttribute("href", "/auth/sign-up");

    fireEvent.click(logIn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders no account block when customer accounts are off", () => {
    const { dialog } = renderOverlay({ accountsEnabled: false });
    expect(within(dialog).queryByRole("link", { name: "Log in" })).toBeNull();
    expect(
      within(dialog).queryByRole("navigation", { name: "Account" }),
    ).toBeNull();
  });

  it("shows a placeholder, not links, while the session is pending", () => {
    isPending = true;
    const { dialog } = renderOverlay();
    expect(within(dialog).queryByRole("link", { name: "Log in" })).toBeNull();
    expect(within(dialog).queryByRole("link", { name: "Sign out" })).toBeNull();
  });

  it("lists flag-gated account links + Sign out as plain links, no UserButton", () => {
    session = {
      user: { name: "Ada Lovelace", email: "ada@example.com" },
      session: {},
    };
    const { dialog, onClose } = renderOverlay({
      flags: ["orders", "invoices"],
    });

    expect(within(dialog).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(dialog).getByText("ada@example.com")).toBeInTheDocument();
    expect(within(dialog).getByText("AL")).toBeInTheDocument();

    const account = within(dialog).getByRole("navigation", { name: "Account" });
    expect(
      Array.from(account.querySelectorAll("a"), (a) => [
        a.textContent?.trim(),
        a.getAttribute("href"),
      ]),
    ).toEqual(
      getAccountNavLinks({
        isEnabled: (flag) => flag === "orders" || flag === "invoices",
      }).map((l) => [l.label, l.href]),
    );
    // Gating reaches the overlay: on → shown, off → absent, no Admin.
    expect(within(account).getByRole("link", { name: "Orders" })).toBeTruthy();
    expect(
      within(account).getByRole("link", { name: "Invoices" }),
    ).toBeTruthy();
    expect(within(account).queryByRole("link", { name: "Rewards" })).toBeNull();
    expect(within(account).queryByRole("link", { name: "Admin" })).toBeNull();

    const signOut = within(dialog).getByRole("link", { name: "Sign out" });
    expect(signOut).toHaveAttribute("href", "/auth/sign-out");
    expect(within(dialog).queryByTestId("user-button")).toBeNull();

    fireEvent.click(within(account).getByRole("link", { name: "Settings" }));
    fireEvent.click(signOut);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("falls back to the email as the only label when the name is blank", () => {
    session = { user: { name: "  ", email: "zed@example.com" }, session: {} };
    const { dialog } = renderOverlay();
    expect(within(dialog).getAllByText("zed@example.com")).toHaveLength(1);
    expect(within(dialog).getByText("ZE")).toBeInTheDocument();
  });

  it("adds Admin for business members and platform admins", () => {
    session = {
      user: { name: "Owner", email: "o@example.com" },
      session: { membershipId: "m1" },
    };
    const { dialog } = renderOverlay();
    const account = within(dialog).getByRole("navigation", { name: "Account" });
    expect(
      within(account).getByRole("link", { name: "Admin" }),
    ).toHaveAttribute("href", "/admin");
    expect(within(account).queryByRole("link", { name: "Orders" })).toBeNull();
  });

  it("keeps Sign out inside the focus trap (Tab from it wraps to Close)", () => {
    session = {
      user: {
        name: "Root",
        email: "r@example.com",
        platformRole: "PLATFORM_ADMIN",
      },
      session: {},
    };
    const { dialog } = renderOverlay();
    const signOut = within(dialog).getByRole("link", { name: "Sign out" });
    signOut.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: "Close menu" }),
    );
  });
});
