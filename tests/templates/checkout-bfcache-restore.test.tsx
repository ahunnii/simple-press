// Must stay the first import: registers the shared vi.mock calls before any
// template module loads (see _checkout-test-setup.tsx).
import "./_checkout-test-setup";

import * as Sentry from "@sentry/nextjs";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartProvider } from "~/providers/cart-context";
import { GloveCheckoutForm } from "~/app/(storefront)/_templates/glove/cart-checkout/glove-checkout-form";

import {
  CART_KEY,
  makeBusiness,
  merchantPolicies,
  seededItem,
} from "./_checkout-test-setup";

// Regression: after a successful submit the shopper is sent to Stripe Checkout
// and the browser may restore this page from the bfcache when they press Back.
// `useCheckoutForm` resets its submit state on a persisted `pageshow`; this
// proves a template (glove, the most complex form) derives its button from that
// state and comes back submittable instead of stuck on "Taking you to payment…".
//
// Audit (2026-10-11): none of the template checkout forms that call
// `useCheckoutForm` keeps its own submit-derived state beyond `submitAttempted`,
// a validation-hint flag that is harmless after a restore (the submitted fields
// were all valid), so this is the single representative test.

const business = makeBusiness({
  templateId: "glove",
  offersInStorePickup: true,
});

describe("glove checkout form after a bfcache restore from Stripe", () => {
  const fetchMock = vi.fn();
  let originalLocation: Location;

  beforeEach(() => {
    localStorage.setItem(CART_KEY, JSON.stringify([seededItem]));
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    originalLocation = window.location;
    // The success path assigns window.location.href; keep it inert.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost/checkout" },
    });
  });
  afterEach(() => {
    localStorage.removeItem(CART_KEY);
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  function pageShow(persisted: boolean) {
    const event = new Event("pageshow");
    Object.defineProperty(event, "persisted", { value: persisted });
    act(() => {
      window.dispatchEvent(event);
    });
  }

  it("re-enables the pay button after a persisted pageshow", async () => {
    // A fresh Response per call: a body can only be read once, so sharing one
    // would make the retry's `response.json()` throw and fail down the error path.
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          sessionUrl: `https://checkout.stripe.test/s${calls}`,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const { unmount } = render(
      <CartProvider>
        <GloveCheckoutForm
          business={business}
          merchantPolicies={merchantPolicies}
          detailsHeading="Billing details"
          deliveryHeading="Delivery"
          shippingHeading="Shipping"
          discountHeading="Discount code"
          summaryHeading="Your order"
          submitLabel="Place order"
          taxNote="Tax calculated at payment"
          secureNote="Secure checkout"
          emptyHeading="Your cart is empty"
          emptyCta="Shop"
        />
      </CartProvider>,
    );

    fireEvent.click(await screen.findByLabelText("In-store pickup"));
    fireEvent.change(screen.getByLabelText(/Full name/), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/Phone/), {
      target: { value: "5551234567" },
    });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "jane@shopper.test" },
    });

    const pay = screen.getByRole("button", { name: /Place order/ });
    expect(pay).toBeEnabled();

    fireEvent.click(pay);

    // Submit succeeded: navigating to Stripe, button locked in its busy state.
    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.test/s1");
    });
    const busy = await screen.findByRole("button", {
      name: /Taking you to payment/,
    });
    expect(busy).toBeDisabled();

    // A normal (non-bfcache) pageshow must not unlock it.
    pageShow(false);
    expect(
      screen.getByRole("button", { name: /Taking you to payment/ }),
    ).toBeDisabled();

    // Back from Stripe: the page is restored from the bfcache.
    pageShow(true);
    const idle = await screen.findByRole("button", { name: /Place order/ });
    expect(idle).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: /Taking you to payment/ }),
    ).toBeNull();

    // And it really is submittable again.
    fireEvent.click(idle);

    // The retry takes the success path: second session URL, busy button again,
    // no error surfaced and nothing reported to Sentry.
    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.test/s2");
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByRole("button", { name: /Taking you to payment/ }),
    ).toBeDisabled();
    // Glove renders the hook's `error` inside an always-present role="alert"
    // live region; every alert must be empty.
    for (const alert of screen.getAllByRole("alert")) {
      expect(alert).toBeEmptyDOMElement();
    }
    expect(Sentry.captureException).not.toHaveBeenCalled();

    // Settle before the test returns so no state update lands afterwards.
    unmount();
  });
});
