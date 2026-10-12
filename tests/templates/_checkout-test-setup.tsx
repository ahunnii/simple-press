// Shared setup for the checkout form tests (checkout-render, checkout-bfcache-restore).
//
// Import this module FIRST (before any component import) from each test file:
//
//   import "./_checkout-test-setup";
//
// Its top-level `vi.mock(...)` calls register when it executes, and the later
// component imports in the test file are resolved afterwards, so every template
// checkout form gets the same inert externals. (vi.mock is only hoisted within the
// file it appears in; the side-effect import order is what makes this work.)
// Not a test file: the dom project only picks up `*.test.tsx`.

import { vi } from "vitest";

import type { DefaultCheckoutPageTemplateProps } from "~/app/(storefront)/_templates/types";

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("~/lib/umami/track", () => ({
  ANALYTICS_EVENTS: { BEGIN_CHECKOUT: "begin-checkout" },
  track: vi.fn(),
}));

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

export type BusinessProp = DefaultCheckoutPageTemplateProps["business"];
export type MerchantPoliciesProp =
  DefaultCheckoutPageTemplateProps["merchantPolicies"];

// Minimal business the checkout forms read (shipping config, identity, Stripe).
export function makeBusiness(
  overrides: Record<string, unknown> = {},
): BusinessProp {
  return {
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
    ...overrides,
  } as unknown as BusinessProp;
}

export const business = makeBusiness();

// No published terms-of-service/refund-policy pages in this fixture — the
// most common real-world case (see checkout-terms-notice.tsx).
export const merchantPolicies: MerchantPoliciesProp = {
  hasTermsOfService: false,
  hasRefundPolicy: false,
};

export const CART_KEY = "shopping-cart";

export const seededItem = {
  productId: "p1",
  variantId: null,
  productName: "Widget",
  variantName: null,
  price: 1500,
  quantity: 1,
  imageUrl: null,
  sku: null,
};
