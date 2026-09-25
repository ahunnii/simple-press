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
});
