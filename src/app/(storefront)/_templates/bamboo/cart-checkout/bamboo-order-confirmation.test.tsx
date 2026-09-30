import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BambooOrderConfirmation } from "./bamboo-order-confirmation";

/**
 * `useCart` needs a real `CartProvider` (it throws outside one) — mocked
 * directly, same pattern as
 * `happy-bamboo/products/happy-bamboo-variant-selector.test.tsx`.
 */
const clearCart = vi.fn();
vi.mock("~/providers/cart-context", () => ({
  useCart: () => ({ clearCart }),
}));

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

/**
 * Mutable per-test session/flags (PF25 / B9.4 account CTA) — mirrors
 * `happy-bamboo/layout/happy-bamboo-header.test.tsx`'s pattern.
 */
type FakeSession = { user: { name: string; email: string } } | null;

let session: FakeSession = null;
let sessionPending = false;
vi.mock("~/lib/auth/use-hydrated-session", () => ({
  useHydratedSession: () => ({ data: session, isPending: sessionPending }),
}));

let enabledFlags = new Set<string>(["orders", "customerAccounts"]);
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({
    isEnabled: (key: string) => enabledFlags.has(key),
  }),
}));

const BUSINESS = {
  id: "biz_1",
  name: "Bamboo Co.",
  siteContent: { primaryColor: null },
};

function mockFetchResponse(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    }),
  );
}

describe("BambooOrderConfirmation", () => {
  beforeEach(() => {
    clearCart.mockReset();
    vi.unstubAllGlobals();
    searchParams = new URLSearchParams();
    session = null;
    sessionPending = false;
    enabledFlags = new Set(["orders", "customerAccounts"]);
    try {
      sessionStorage.clear();
    } catch {
      // ignore — not every environment has sessionStorage
    }
  });

  it("shows the no-order heading when session_id is missing from the URL", () => {
    searchParams = new URLSearchParams();

    render(<BambooOrderConfirmation business={BUSINESS} />);

    expect(
      screen.getByText("We couldn't find that order"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue Shopping" })).toHaveAttribute(
      "href",
      "/shop",
    );
    // No fetch, no cart clear — there's no session to look up.
    expect(clearCart).not.toHaveBeenCalled();
  });

  it("pickup: shows the pickup bullet and the pickup location", async () => {
    searchParams = new URLSearchParams({ session_id: "cs_test_1" });
    mockFetchResponse({
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
      delivery_method: "pickup",
    });

    render(
      <BambooOrderConfirmation
        business={{
          ...BUSINESS,
          pickupLocation: "123 Bamboo Ave, Detroit, MI",
          pickupInstructions: "Ring the side bell.",
        }}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText("We'll let you know when your order is ready for pickup"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Pickup location")).toBeInTheDocument();
    expect(
      screen.getByText("123 Bamboo Ave, Detroit, MI"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ring the side bell.")).toBeInTheDocument();
    // Ship-only bullet must not appear.
    expect(
      screen.queryByText("We'll notify you when your order ships"),
    ).not.toBeInTheDocument();
    expect(clearCart).toHaveBeenCalledTimes(1);
  });

  it("ship: shows the three ship bullets and no pickup location", async () => {
    searchParams = new URLSearchParams({ session_id: "cs_test_2" });
    mockFetchResponse({
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
      delivery_method: "ship",
    });

    render(
      <BambooOrderConfirmation
        business={{
          ...BUSINESS,
          pickupLocation: "123 Bamboo Ave, Detroit, MI",
        }}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText("We'll notify you when your order ships"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Track your order status via email")).toBeInTheDocument();
    expect(screen.queryByText("Pickup location")).not.toBeInTheDocument();
  });

  it("shows the order total from the Stripe session", async () => {
    searchParams = new URLSearchParams({ session_id: "cs_test_4" });
    mockFetchResponse({
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
      delivery_method: "ship",
    });

    render(<BambooOrderConfirmation business={BUSINESS} />);

    await waitFor(() => expect(screen.getByText("$45.99")).toBeInTheDocument());
    expect(screen.getByText(/Order total:/)).toBeInTheDocument();
    expect(screen.getByText("shopper@example.com")).toBeInTheDocument();
  });

  it("renders the note when provided, and hides it when blank", async () => {
    searchParams = new URLSearchParams({ session_id: "cs_test_3" });
    mockFetchResponse({
      customer_email: "shopper@example.com",
      amount_total: 4599,
      currency: "usd",
      payment_status: "paid",
      delivery_method: "ship",
    });

    const { rerender } = render(
      <BambooOrderConfirmation business={BUSINESS} note="Orders ship in 2 days." />,
    );

    await waitFor(() =>
      expect(screen.getByText("Orders ship in 2 days.")).toBeInTheDocument(),
    );

    rerender(<BambooOrderConfirmation business={BUSINESS} note="" />);
    expect(
      screen.queryByText("Orders ship in 2 days."),
    ).not.toBeInTheDocument();
  });

  // PF25 / B9.4 — account next step on the confirmed order page.
  describe("account CTA", () => {
    beforeEach(() => {
      searchParams = new URLSearchParams({ session_id: "cs_test_cta" });
      mockFetchResponse({
        customer_email: "shopper@example.com",
        amount_total: 4599,
        currency: "usd",
        payment_status: "paid",
        delivery_method: "ship",
      });
    });

    it('signed in + orders on shows "View my orders"', async () => {
      session = { user: { name: "Shopper", email: "shopper@example.com" } };

      render(<BambooOrderConfirmation business={BUSINESS} />);

      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: "View my orders" }),
        ).toHaveAttribute("href", "/account/orders"),
      );
      expect(
        screen.queryByRole("link", { name: "Create an account" }),
      ).not.toBeInTheDocument();
    });

    it('signed in + orders off shows no account CTA', async () => {
      session = { user: { name: "Shopper", email: "shopper@example.com" } };
      enabledFlags = new Set(["customerAccounts"]);

      render(<BambooOrderConfirmation business={BUSINESS} />);

      await waitFor(() =>
        expect(screen.getByText(/Order total:/)).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("link", { name: "View my orders" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Create an account" }),
      ).not.toBeInTheDocument();
    });

    it('signed out + customerAccounts on shows "Create an account"', async () => {
      session = null;

      render(<BambooOrderConfirmation business={BUSINESS} />);

      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: "Create an account" }),
        ).toHaveAttribute("href", "/auth/sign-up"),
      );
      expect(
        screen.queryByRole("link", { name: "View my orders" }),
      ).not.toBeInTheDocument();
    });

    it("neither flag on shows no account CTA", async () => {
      session = null;
      enabledFlags = new Set();

      render(<BambooOrderConfirmation business={BUSINESS} />);

      await waitFor(() =>
        expect(screen.getByText(/Order total:/)).toBeInTheDocument(),
      );
      expect(
        screen.queryByRole("link", { name: "View my orders" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Create an account" }),
      ).not.toBeInTheDocument();
    });

    it("suppresses the CTA while the session is still pending (no flash)", () => {
      session = null;
      sessionPending = true;

      render(<BambooOrderConfirmation business={BUSINESS} />);

      expect(
        screen.queryByRole("link", { name: "View my orders" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Create an account" }),
      ).not.toBeInTheDocument();
    });
  });
});
