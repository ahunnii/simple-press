import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ViiOrderConfirmation } from "./vii-order-confirmation";

/**
 * `useCart` needs a real `CartProvider` (it throws outside one) — mocked
 * directly, same pattern as `bamboo/cart-checkout/bamboo-order-confirmation.test.tsx`.
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
 * Mutable per-test session/flags (PF23 / B9.4 account CTA) — mirrors
 * bamboo's order-confirmation test.
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
  name: "Skinbar VII",
  siteContent: { primaryColor: null },
};

const BASE_PROPS = {
  business: BUSINESS,
  overline: "Order confirmed",
  thankYouHeading: "Thank",
  thankYouAccent: "you.",
  nextSteps:
    "You'll receive an email confirmation shortly.\nWe'll notify you as soon as your order ships.",
  nextStepsShip:
    "You'll receive an email confirmation shortly.\nWe'll notify you when your order ships.\nTrack your order status via email.",
  nextStepsPickup:
    "You'll receive an email confirmation shortly.\nWe'll let you know as soon as your order is ready for pickup.",
  continueCta: "Continue Shopping",
  loadingText: "Confirming your order…",
  noOrderHeading: "No order found",
  noOrderBody: "Head back to the shop to explore our collection.",
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

describe("ViiOrderConfirmation", () => {
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

    render(<ViiOrderConfirmation {...BASE_PROPS} />);

    expect(screen.getByText("No order found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue Shopping" }),
    ).toHaveAttribute("href", "/shop");
    // No fetch, no cart clear — there's no session to look up.
    expect(clearCart).not.toHaveBeenCalled();
  });

  describe("pickup vs ship next-steps wording (PF22)", () => {
    it("pickup: shows the pickup copy and the pickup location", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_1" });
      mockFetchResponse({
        customer_email: "shopper@example.com",
        amount_total: 4599,
        currency: "usd",
        payment_status: "paid",
        delivery_method: "pickup",
      });

      render(
        <ViiOrderConfirmation
          {...BASE_PROPS}
          business={{
            ...BUSINESS,
            pickupLocation: "123 Copper Ave, Detroit, MI",
            pickupInstructions: "Ring the side bell.",
          }}
        />,
      );

      await waitFor(() =>
        expect(
          screen.getByText(
            "We'll let you know as soon as your order is ready for pickup.",
          ),
        ).toBeInTheDocument(),
      );
      expect(screen.getByText("Pickup location")).toBeInTheDocument();
      expect(
        screen.getByText("123 Copper Ave, Detroit, MI"),
      ).toBeInTheDocument();
      expect(screen.getByText("Ring the side bell.")).toBeInTheDocument();
      // Ship-only copy must not appear.
      expect(
        screen.queryByText("We'll notify you when your order ships."),
      ).not.toBeInTheDocument();
      expect(clearCart).toHaveBeenCalledTimes(1);
    });

    it("ship: shows the ship copy and no pickup location", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_2" });
      mockFetchResponse({
        customer_email: "shopper@example.com",
        amount_total: 4599,
        currency: "usd",
        payment_status: "paid",
        delivery_method: "ship",
      });

      render(
        <ViiOrderConfirmation
          {...BASE_PROPS}
          business={{
            ...BUSINESS,
            pickupLocation: "123 Copper Ave, Detroit, MI",
          }}
        />,
      );

      await waitFor(() =>
        expect(
          screen.getByText("We'll notify you when your order ships."),
        ).toBeInTheDocument(),
      );
      expect(
        screen.getByText("Track your order status via email."),
      ).toBeInTheDocument();
      expect(screen.queryByText("Pickup location")).not.toBeInTheDocument();
    });

    it("unknown delivery method (no fresh session data): falls back to the generic copy", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_3" });
      mockFetchResponse({}, false);

      render(<ViiOrderConfirmation {...BASE_PROPS} />);

      await waitFor(() =>
        expect(
          screen.getByText(
            "We'll notify you as soon as your order ships.",
          ),
        ).toBeInTheDocument(),
      );
    });
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

    render(<ViiOrderConfirmation {...BASE_PROPS} />);

    await waitFor(() =>
      expect(screen.getByText(/\$45\.99/)).toBeInTheDocument(),
    );
    expect(screen.getByText("shopper@example.com")).toBeInTheDocument();
  });

  // PF23 / B9.4 — account next step on the confirmed order page.
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

      render(<ViiOrderConfirmation {...BASE_PROPS} />);

      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: "View my orders" }),
        ).toHaveAttribute("href", "/account/orders"),
      );
      expect(
        screen.queryByRole("link", { name: "Create an account" }),
      ).not.toBeInTheDocument();
    });

    it("signed in + orders off shows no account CTA", async () => {
      session = { user: { name: "Shopper", email: "shopper@example.com" } };
      enabledFlags = new Set(["customerAccounts"]);

      render(<ViiOrderConfirmation {...BASE_PROPS} />);

      await waitFor(() =>
        expect(screen.getByText("shopper@example.com")).toBeInTheDocument(),
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

      render(<ViiOrderConfirmation {...BASE_PROPS} />);

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

      render(<ViiOrderConfirmation {...BASE_PROPS} />);

      await waitFor(() =>
        expect(screen.getByText("shopper@example.com")).toBeInTheDocument(),
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

      render(<ViiOrderConfirmation {...BASE_PROPS} />);

      expect(
        screen.queryByRole("link", { name: "View my orders" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Create an account" }),
      ).not.toBeInTheDocument();
    });
  });
});
