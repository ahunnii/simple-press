// Must stay the first import: registers the shared vi.mock calls before any
// template module loads (see _checkout-test-setup.tsx).
import "./_checkout-test-setup";

import type { ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type {
  BusinessProp,
  MerchantPoliciesProp,
} from "./_checkout-test-setup";
import { CartProvider } from "~/providers/cart-context";
import { CheckoutForm as BambooCheckoutForm } from "~/app/(storefront)/_templates/bamboo/cart-checkout/bamboo-checkout-form";
import { DarkTrendCheckoutForm } from "~/app/(storefront)/_templates/dark-trend/cart-checkout/dark-trend-checkout-form";
import { DefaultCheckoutForm } from "~/app/(storefront)/_templates/default/cart-checkout/default-checkout-form";
import { DreamCheckoutForm } from "~/app/(storefront)/_templates/dream/cart-checkout/dream-checkout-form";
import { ElegantCheckoutForm } from "~/app/(storefront)/_templates/elegant/cart-checkout/elegant-checkout-form";
import { GloveCheckoutForm } from "~/app/(storefront)/_templates/glove/cart-checkout/glove-checkout-form";
import { HappyBambooCheckoutForm } from "~/app/(storefront)/_templates/happy-bamboo/cart-checkout/happy-bamboo-checkout-form";
import { ModernCheckoutForm } from "~/app/(storefront)/_templates/modern/cart-checkout/modern-checkout-form";
import { NoiseCheckoutForm } from "~/app/(storefront)/_templates/noise/cart-checkout/noise-checkout-form";
import { OliveCheckoutForm } from "~/app/(storefront)/_templates/olive/cart-checkout/olive-checkout-form";
import { PinkCheckoutForm } from "~/app/(storefront)/_templates/pink/cart-checkout/pink-checkout-form";
import { PollenCheckoutForm } from "~/app/(storefront)/_templates/pollen/cart-checkout/pollen-checkout-form";
import { SledgeCheckoutForm } from "~/app/(storefront)/_templates/sledge/cart-checkout/sledge-checkout-form";
import { UmscCheckoutForm } from "~/app/(storefront)/_templates/umsc/cart-checkout/umsc-checkout-form";

import {
  business,
  CART_KEY,
  merchantPolicies,
  seededItem,
} from "./_checkout-test-setup";

// Must come before the template imports: registers the shared vi.mock calls.

type FormComponent = ComponentType<{
  business: BusinessProp;
  merchantPolicies: MerchantPoliciesProp;
}>;

// umsc's form takes its field-driven headings as props (resolved by the page).
const UmscForm: FormComponent = (props) => (
  <UmscCheckoutForm
    {...props}
    contactHeading="Contact"
    deliveryHeading="Delivery"
    shippingHeading="Shipping"
    summaryHeading="Summary"
    discountLabel="Discount code"
    submitLabel="Pay"
    emptyHeading="Your bag is empty"
    emptyCta="Shop"
  />
);

// glove's form also takes its field-driven headings and notes as props.
const GloveForm: FormComponent = (props) => (
  <GloveCheckoutForm
    {...props}
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
);

const TEMPLATE_FORMS: [name: string, Form: FormComponent][] = [
  ["default", DefaultCheckoutForm],
  ["modern", ModernCheckoutForm],
  ["bamboo", BambooCheckoutForm],
  ["happy-bamboo", HappyBambooCheckoutForm],
  ["elegant", ElegantCheckoutForm],
  ["pollen", PollenCheckoutForm],
  ["noise", NoiseCheckoutForm],
  ["olive", OliveCheckoutForm],
  ["dark-trend", DarkTrendCheckoutForm],
  ["sledge", SledgeCheckoutForm],
  ["pink", PinkCheckoutForm],
  ["dream", DreamCheckoutForm],
  ["umsc", UmscForm],
  ["glove", GloveForm],
];

describe("checkout form renders for every template", () => {
  beforeEach(() => {
    // Seed one cart item so forms render the checkout UI (not the empty state).
    localStorage.setItem(CART_KEY, JSON.stringify([seededItem]));
  });

  it.each(TEMPLATE_FORMS)(
    "%s checkout form mounts with inputs",
    async (_name, Form) => {
      render(
        <CartProvider>
          <Form business={business} merchantPolicies={merchantPolicies} />
        </CartProvider>,
      );

      // After cart hydration, the form shows contact/address inputs.
      const textboxes = await screen.findAllByRole("textbox");
      expect(textboxes.length).toBeGreaterThan(0);
    },
  );
});
