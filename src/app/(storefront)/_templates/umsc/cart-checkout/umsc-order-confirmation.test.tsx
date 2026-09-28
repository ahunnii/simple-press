import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UmscOrderConfirmation } from "./umsc-order-confirmation";

/**
 * `useCart` needs a real `CartProvider` (it throws outside one) — mocked
 * directly, same pattern as bamboo's/olive's/dream's order-confirmation
 * tests.
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
 * Mutable per-test session/flags for the shared `useOrderAccountCta`
 * (PF17 / B9.4, P-ORDER-CTA) — mirrors dream's order-confirmation test.
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

const BASE_PROPS = {
  businessName: "Unique Monique",
  thankYouHeading: "Thank you.",
  nextStepsHeading: "What happens next",
  nextSteps:
    "You'll receive an email confirmation shortly.\nWe'll let you know as soon as your order ships.",
  nextStepsPickup:
    "You'll receive an email confirmation shortly.\nWe'll let you know when your order is ready for pickup.",
  continueCta: "Continue shopping",
  homeLinkLabel: "Back to home",
  loadingText: "Confirming your order…",
  noOrderHeading: "No order found",
  noOrderBody:
    "This page needs an order session to show your confirmation. Head back to the shop to keep browsing.",
};

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

describe("UmscOrderConfirmation", () => {
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
      // not every environment has sessionStorage
    }
  });

  describe("no order (no session_id)", () => {
    it("shows the styled not-found state and never clears the cart", () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      render(<UmscOrderConfirmation {...BASE_PROPS} />);

      expect(
        screen.getByRole("heading", { level: 1, name: "No order found" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Continue shopping" }),
      ).toHaveAttribute("href", "/shop");
      expect(clearCart).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("PF18 — pickup-aware next steps (B9.3)", () => {
    it("ship: shows the general list, never pickup wording", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_ship" });
      mockFetchResponse({ ...PAID, delivery_method: "ship" });

      render(<UmscOrderConfirmation {...BASE_PROPS} />);

      await waitFor(() =>
        expect(
          screen.getByText("We'll let you know as soon as your order ships."),
        ).toBeInTheDocument(),
      );
      expect(
        screen.queryByText(
          "We'll let you know when your order is ready for pickup.",
        ),
      ).not.toBeInTheDocument();
      expect(clearCart).toHaveBeenCalledTimes(1);
    });

    it("unknown delivery method (fetch failed): falls back to the general list", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_unknown" });
      mockFetchResponse({}, false);

      render(<UmscOrderConfirmation {...BASE_PROPS} />);

      await waitFor(() =>
        expect(
          screen.getByText("We'll let you know as soon as your order ships."),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByText(/ready for pickup/)).not.toBeInTheDocument();
    });

    it("pickup: shows the pickup list, never says the order ships", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_pickup" });
      mockFetchResponse({ ...PAID, delivery_method: "pickup" });

      render(<UmscOrderConfirmation {...BASE_PROPS} />);

      await waitFor(() =>
        expect(
          screen.getByText(
            "We'll let you know when your order is ready for pickup.",
          ),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByText(/order ships/)).not.toBeInTheDocument();
    });

    it("pickup with a blank pickup override: reuses the general list (saved-field fallback)", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_pickup_blank" });
      mockFetchResponse({ ...PAID, delivery_method: "pickup" });

      render(<UmscOrderConfirmation {...BASE_PROPS} nextStepsPickup="" />);

      await waitFor(() =>
        expect(
          screen.getByText("We'll let you know as soon as your order ships."),
        ).toBeInTheDocument(),
      );
    });

    it("an owner's saved override text renders unchanged, for either delivery method", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_saved" });
      mockFetchResponse({ ...PAID, delivery_method: "ship" });

      render(
        <UmscOrderConfirmation
          {...BASE_PROPS}
          nextSteps="Monique packs every order herself."
        />,
      );

      await waitFor(() =>
        expect(
          screen.getByText("Monique packs every order herself."),
        ).toBeInTheDocument(),
      );
      expect(
        screen.queryByText("We'll let you know as soon as your order ships."),
      ).not.toBeInTheDocument();
    });
  });

  describe("PF18 — phone from Settings (never a hardcoded literal)", () => {
    it("shows the phone from Settings when set", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_phone" });
      mockFetchResponse({ ...PAID, delivery_method: "ship" });

      render(<UmscOrderConfirmation {...BASE_PROPS} phone="555-0142" />);

      await waitFor(() =>
        expect(screen.getByText("555-0142")).toBeInTheDocument(),
      );
      expect(screen.getByText("555-0142").closest("a")).toHaveAttribute(
        "href",
        "tel:5550142",
      );
    });

    it("shows no phone line when Settings has none", async () => {
      searchParams = new URLSearchParams({ session_id: "cs_test_no_phone" });
      mockFetchResponse({ ...PAID, delivery_method: "ship" });

      render(<UmscOrderConfirmation {...BASE_PROPS} />);

      await waitFor(() =>
        expect(
          screen.getByText("We'll let you know as soon as your order ships."),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByText(/Questions\? Call or text/)).not.toBeInTheDocument();
    });
  });

  describe("PF17 — account next step (B9.4, shared useOrderAccountCta)", () => {
    beforeEach(() => {
      searchParams = new URLSearchParams({ session_id: "cs_test_cta" });
      mockFetchResponse({ ...PAID, delivery_method: "ship" });
    });

    it('signed in + orders on: "View my orders"', async () => {
      session = { user: { name: "Shopper", email: "shopper@example.com" } };

      render(<UmscOrderConfirmation {...BASE_PROPS} />);

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
      render(<UmscOrderConfirmation {...BASE_PROPS} />);

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
      enabledFlags = new Set(["customerAccounts"]);

      render(<UmscOrderConfirmation {...BASE_PROPS} />);

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

      render(<UmscOrderConfirmation {...BASE_PROPS} />);

      expect(
        screen.queryByRole("link", { name: "View my orders" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Create an account" }),
      ).not.toBeInTheDocument();
    });
  });
});
