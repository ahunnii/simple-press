import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DreamOrderCopy } from "./dream-order-confirmation";

import { DreamOrderConfirmation } from "./dream-order-confirmation";
import { resolveDreamOrderSteps } from "./dream-order-steps";

/**
 * `useCart` needs a real `CartProvider` (it throws outside one) — mocked
 * directly, same pattern as vii's / bamboo's order-confirmation tests.
 */
const clearCart = vi.fn();
vi.mock("~/providers/cart-context", () => ({
  useCart: () => ({ clearCart }),
}));

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

/** Mutable per-test session/flags for the shared `useOrderAccountCta`. */
type FakeSession = { user: { name: string; email: string } } | null;

let session: FakeSession = null;
let sessionPending = false;
vi.mock("~/lib/auth/use-hydrated-session", () => ({
  useHydratedSession: () => ({ data: session, isPending: sessionPending }),
}));

let enabledFlags = new Set<string>(["orders", "customerAccounts", "products"]);
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({
    isEnabled: (key: string) => enabledFlags.has(key),
  }),
}));

const COPY: DreamOrderCopy = {
  heading: "Thank you for your",
  accent: "order",
  lede: "Your payment went through.",
  nextHeading: "What happens next",
  receiptHeading: "Order details",
  ordersLabel: "View my orders",
  signupLabel: "Create an account",
  continueLabel: "Continue shopping",
  homeLabel: "Back to home",
  noOrderHeading: "We couldn't find that",
  noOrderAccent: "order",
  noOrderLede: "This page shows your order right after checkout.",
};

const BUSINESS = {
  name: "Dream Your Theme",
  pickupLocation: "12 Balloon Row, Detroit, MI",
  pickupInstructions: "Ring the studio bell.",
  businessAddress: null,
};

// Built-in step rows (nothing saved) — the same resolver the page uses.
const STEPS = resolveDreamOrderSteps({});

function renderConfirmation() {
  return render(
    <DreamOrderConfirmation
      business={BUSINESS}
      logoUrl="/templates/dream/images/logo.webp"
      logoAlt="Dream Your Theme"
      copy={COPY}
      steps={STEPS}
    />,
  );
}

function mockFetchResponse(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }),
  );
}

const PAID = {
  customer_email: "shopper@example.com",
  amount_total: 4599,
  currency: "usd",
  payment_status: "paid",
};

describe("DreamOrderConfirmation", () => {
  beforeEach(() => {
    clearCart.mockReset();
    vi.unstubAllGlobals();
    searchParams = new URLSearchParams();
    session = null;
    sessionPending = false;
    enabledFlags = new Set(["orders", "customerAccounts", "products"]);
    try {
      sessionStorage.clear();
    } catch {
      // not every environment has sessionStorage
    }
  });

  describe("no order (no session_id)", () => {
    it("shows the styled not-found hero with a way back, and never clears the cart", () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const { container } = renderConfirmation();

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "We couldn't find that order",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Continue shopping" }),
      ).toHaveAttribute("href", "/shop");
      expect(
        screen.getByRole("link", { name: "Back to home" }),
      ).toHaveAttribute("href", "/");
      expect(
        container.querySelector('[data-sp-group="checkout.no-order"]'),
      ).not.toBeNull();
      expect(clearCart).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("hides continue shopping while products is off (never re-points it)", () => {
      enabledFlags = new Set(["orders", "customerAccounts"]);

      renderConfirmation();

      expect(
        screen.queryByRole("link", { name: "Continue shopping" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Back to home" }),
      ).toHaveAttribute("href", "/");
    });
  });

  describe("confirmed order", () => {
    it("clears the cart and shows the total and receipt email", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_total" });
      mockFetchResponse({ ...PAID, delivery_method: "ship" });

      renderConfirmation();

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "Thank you for your order",
        }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByText("$45.99")).toBeInTheDocument(),
      );
      expect(screen.getByText("shopper@example.com")).toBeInTheDocument();
      expect(clearCart).toHaveBeenCalledTimes(1);
    });

    it("ship: shipping steps, no pickup location", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_ship" });
      mockFetchResponse({ ...PAID, delivery_method: "ship" });

      renderConfirmation();

      await waitFor(() =>
        expect(
          screen.getByText("We'll email you again as soon as it ships."),
        ).toBeInTheDocument(),
      );
      expect(screen.getByRole("heading", { name: "It arrives" })).toBeVisible();
      expect(screen.queryByText("Pickup location")).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          "We'll email you when your order is ready for pickup.",
        ),
      ).not.toBeInTheDocument();
    });

    it("pickup: pickup steps and the store's pickup location — never 'it ships'", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_pickup" });
      mockFetchResponse({ ...PAID, delivery_method: "pickup" });

      renderConfirmation();

      await waitFor(() =>
        expect(
          screen.getByText(
            "We'll email you when your order is ready for pickup.",
          ),
        ).toBeInTheDocument(),
      );
      expect(screen.getByText("Pickup location")).toBeInTheDocument();
      expect(
        screen.getByText("12 Balloon Row, Detroit, MI"),
      ).toBeInTheDocument();
      expect(screen.getByText("Ring the studio bell.")).toBeInTheDocument();
      expect(screen.queryByText(/ships/)).not.toBeInTheDocument();
    });

    it("unknown method (details fetch failed): the generic steps", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_unknown" });
      mockFetchResponse({}, false);

      renderConfirmation();

      await waitFor(() =>
        expect(
          screen.getByText(
            "We'll email you with updates as your order moves along.",
          ),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByText(/ships/)).not.toBeInTheDocument();
      expect(screen.queryByText("Pickup location")).not.toBeInTheDocument();
    });
  });

  describe("account next step (B9.4, shared useOrderAccountCta)", () => {
    beforeEach(() => {
      searchParams = new URLSearchParams({ session_id: "cs_test_cta" });
      mockFetchResponse({ ...PAID, delivery_method: "ship" });
    });

    it('signed in + orders on: "View my orders"', async () => {
      session = { user: { name: "Shopper", email: "shopper@example.com" } };

      renderConfirmation();

      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: "View my orders" }),
        ).toHaveAttribute("href", "/account/orders"),
      );
      expect(
        screen.queryByRole("link", { name: "Create an account" }),
      ).not.toBeInTheDocument();
    });

    it('signed out + customerAccounts on: "Create an account"', async () => {
      renderConfirmation();

      await waitFor(() =>
        expect(
          screen.getByRole("link", { name: "Create an account" }),
        ).toHaveAttribute("href", "/auth/sign-up"),
      );
      expect(
        screen.queryByRole("link", { name: "View my orders" }),
      ).not.toBeInTheDocument();
    });

    it("signed in + orders off: no account button", async () => {
      session = { user: { name: "Shopper", email: "shopper@example.com" } };
      enabledFlags = new Set(["customerAccounts", "products"]);

      renderConfirmation();

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

    it("no flash while the session is pending", () => {
      sessionPending = true;

      renderConfirmation();

      expect(
        screen.queryByRole("link", { name: "View my orders" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Create an account" }),
      ).not.toBeInTheDocument();
    });
  });
});
