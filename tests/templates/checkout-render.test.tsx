import type { ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultCheckoutPageTemplateProps } from "~/app/(storefront)/_templates/types";
import { CartProvider } from "~/providers/cart-context";
import { CheckoutForm as BambooCheckoutForm } from "~/app/(storefront)/_templates/bamboo/cart-checkout/bamboo-checkout-form";
import { DarkTrendCheckoutForm } from "~/app/(storefront)/_templates/dark-trend/cart-checkout/dark-trend-checkout-form";
import { DefaultCheckoutForm } from "~/app/(storefront)/_templates/default/cart-checkout/default-checkout-form";
import { ElegantCheckoutForm } from "~/app/(storefront)/_templates/elegant/cart-checkout/elegant-checkout-form";
import { HappyBambooCheckoutForm } from "~/app/(storefront)/_templates/happy-bamboo/cart-checkout/happy-bamboo-checkout-form";
import { ModernCheckoutForm } from "~/app/(storefront)/_templates/modern/cart-checkout/modern-checkout-form";
import { NoiseCheckoutForm } from "~/app/(storefront)/_templates/noise/cart-checkout/noise-checkout-form";
import { PollenCheckoutForm } from "~/app/(storefront)/_templates/pollen/cart-checkout/pollen-checkout-form";
import { SledgeCheckoutForm } from "~/app/(storefront)/_templates/sledge/cart-checkout/sledge-checkout-form";

// --- Shared mocks: every template form imports the same externals, so mocking
// them here covers all nine. ---

// tRPC react client: a recursive proxy whose hooks return inert results. Lets the
// discount-input children (api.discount.*.useMutation/useQuery) mount.
vi.mock("~/trpc/react", () => {
  const hookResult = {
    data: undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    mutate: () => undefined,
    mutateAsync: async () => undefined,
    reset: () => undefined,
  };
  const proxy: unknown = new Proxy(() => undefined, {
    get(_t, prop) {
      if (
        prop === "useQuery" ||
        prop === "useMutation" ||
        prop === "useSuspenseQuery"
      ) {
        return () => hookResult;
      }
      return proxy;
    },
    apply: () => hookResult,
  });
  return { api: proxy };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    refresh: () => undefined,
    prefetch: () => undefined,
    back: () => undefined,
  }),
  usePathname: () => "/checkout",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt } = props as { src?: string; alt?: string };
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(() => undefined, {
    success: () => undefined,
    error: () => undefined,
  }),
}));

type BusinessProp = DefaultCheckoutPageTemplateProps["business"];

// Minimal business the checkout forms read (shipping config, identity, Stripe).
const business = {
  id: "biz_test",
  name: "Test Store",
  subdomain: "teststore",
  customDomain: null,
  domainStatus: "NONE",
  templateId: "default",
  stripeAccountId: "acct_test",
  stripeAutoTaxEnabled: false,
  shippingType: "free",
  shippingFlatRate: null,
  freeShippingThreshold: null,
  offersInStorePickup: false,
  pickupLocation: null,
  pickupInstructions: null,
  businessAddress: null,
  salesCountries: [],
  siteContent: { logoUrl: null },
} as unknown as BusinessProp;

const CART_KEY = "shopping-cart";
const seededItem = {
  productId: "p1",
  variantId: null,
  productName: "Widget",
  variantName: null,
  price: 1500,
  quantity: 1,
  imageUrl: null,
  sku: null,
};

type FormComponent = ComponentType<{ business: BusinessProp }>;

const TEMPLATE_FORMS: [name: string, Form: FormComponent][] = [
  ["default", DefaultCheckoutForm],
  ["modern", ModernCheckoutForm],
  ["bamboo", BambooCheckoutForm],
  ["happy-bamboo", HappyBambooCheckoutForm],
  ["elegant", ElegantCheckoutForm],
  ["pollen", PollenCheckoutForm],
  ["noise", NoiseCheckoutForm],
  ["dark-trend", DarkTrendCheckoutForm],
  ["sledge", SledgeCheckoutForm],
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
          <Form business={business} />
        </CartProvider>,
      );

      // After cart hydration, the form shows contact/address inputs.
      const textboxes = await screen.findAllByRole("textbox");
      expect(textboxes.length).toBeGreaterThan(0);
    },
  );
});
