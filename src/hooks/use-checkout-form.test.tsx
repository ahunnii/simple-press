import type { FormEvent } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as CartContext from "~/providers/cart-context";
import type { CartItem } from "~/providers/cart-context";
import { cartItemId, checkoutLineKey } from "~/providers/cart-context";

import {
  linesToRemoveForRejection,
  useCheckoutForm,
} from "./use-checkout-form";

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("~/lib/umami/track", () => ({
  ANALYTICS_EVENTS: { BEGIN_CHECKOUT: "begin-checkout" },
  track: vi.fn(),
}));

// tRPC react client: inert hook results (quote query, discount mutation),
// except `shipping.checkLocalDelivery`, whose result each test can set.
const trpc = vi.hoisted(() => ({
  delivery: {
    data: undefined as unknown,
    isFetching: false,
    isError: false,
  },
  deliveryInputs: [] as unknown[],
}));
vi.mock("~/trpc/react", () => {
  const hookResult = {
    data: undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    mutate: () => undefined,
  };
  const make = (path: string[]): unknown =>
    new Proxy(() => undefined, {
      get: (_t, prop) => {
        if (prop === "useQuery") {
          return (input: unknown, opts?: { enabled?: boolean }) => {
            if (path.includes("checkLocalDelivery")) {
              if (opts?.enabled) trpc.deliveryInputs.push(input);
              return opts?.enabled
                ? trpc.delivery
                : { data: undefined, isFetching: false, isError: false };
            }
            return hookResult;
          };
        }
        if (prop === "useMutation") return () => hookResult;
        return make([...path, String(prop)]);
      },
      apply: () => hookResult,
    });
  return { api: make([]) };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cart = vi.hoisted(() => ({
  items: [
    {
      productId: "p1",
      variantId: null,
      productName: "Widget",
      variantName: null,
      price: 1500,
      quantity: 1,
      imageUrl: null,
      sku: null,
    },
  ],
  removeLine: vi.fn(),
}));
vi.mock("~/providers/cart-context", async (importOriginal) => ({
  // Real line helpers (cartItemId, checkoutLineKey, ...); stubbed hook.
  ...(await importOriginal<typeof CartContext>()),
  useCart: () => ({
    items: cart.items,
    removeLine: cart.removeLine,
    subtotal: 1500,
  }),
}));

type Business = Parameters<typeof useCheckoutForm>[0];
const business = {
  id: "biz_test",
  templateId: "default",
  shippingType: "free",
  shippingFlatRate: null,
  freeShippingThreshold: null,
  offersInStorePickup: true,
  salesCountries: [],
} as unknown as Business;
const merchantPolicies = { hasTermsOfService: false, hasRefundPolicy: false };

const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent;

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("useCheckoutForm handleSubmit re-entrancy", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function setup() {
    const hook = renderHook(() =>
      useCheckoutForm(
        business,
        merchantPolicies as Parameters<typeof useCheckoutForm>[1],
      ),
    );
    act(() => {
      hook.result.current.setEmail("jane@shopper.test");
      hook.result.current.setName("Jane Doe");
      hook.result.current.setPhone("5551234567");
      hook.result.current.setDeliveryMethod("pickup");
    });
    return hook;
  }

  it("two submits in the same tick send one create-session request", async () => {
    let resolveFetch!: (r: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const { result } = setup();
    // Both run against the SAME render's handler, before React re-renders.
    const handleSubmit = result.current.handleSubmit;

    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = handleSubmit(submitEvent());
      second = handleSubmit(submitEvent());
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isProcessing).toBe(true);

    await act(async () => {
      resolveFetch(jsonResponse(400, { error: "nope" }));
      await Promise.all([first, second]);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe("nope");
    expect(result.current.isProcessing).toBe(false);
  });

  it("an error response releases the guard so the shopper can submit again", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(400, { error: "This discount code has expired" }),
      )
      .mockResolvedValueOnce(jsonResponse(400, { error: "still no" }));
    const { result } = setup();

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isProcessing).toBe(false);

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBe("still no");
  });

  it("posts a lineKey per line and removes exactly the rejected line", async () => {
    cart.removeLine.mockClear();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: "Unavailable",
        unavailableItems: ["Widget"],
        unavailableItemIds: [
          { productId: "p1", variantId: null, lineKey: "p1:base" },
        ],
      }),
    );
    const { result } = setup();
    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      items: Record<string, unknown>[];
    };
    expect(body.items[0]).toMatchObject({
      productId: "p1",
      lineKey: "p1:base",
    });
    expect(body.items[0]).not.toHaveProperty("customization");
    expect(cart.removeLine).toHaveBeenCalledTimes(1);
    expect(cart.removeLine).toHaveBeenCalledWith("p1:base");
  });

  it("a network failure and a failed pre-check also release the guard", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(400, { error: "again" }));
    const { result } = setup();

    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    expect(result.current.error).toBe("Failed to fetch");

    // Pre-check failure (missing phone) throws before any request...
    act(() => result.current.setPhone(""));
    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    expect(result.current.error).toBe(
      "Please fill in all required contact fields",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // ...and does not wedge the guard.
    act(() => result.current.setPhone("5551234567"));
    await act(async () => {
      await result.current.handleSubmit(submitEvent());
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe("bfcache restore after the Stripe redirect", () => {
    let originalLocation: Location;

    beforeEach(() => {
      originalLocation = window.location;
      // The success path assigns window.location.href; keep it inert.
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { href: "http://localhost/checkout" },
      });
    });
    afterEach(() => {
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

    it("a persisted pageshow clears the stuck processing state so Continue works again", async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse(200, { sessionUrl: "https://checkout.stripe.test/s1" }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, { sessionUrl: "https://checkout.stripe.test/s2" }),
        );
      const { result } = setup();

      await act(async () => {
        await result.current.handleSubmit(submitEvent());
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(window.location.href).toBe("https://checkout.stripe.test/s1");
      expect(result.current.isProcessing).toBe(true);

      // Guard still set: a second submit is ignored.
      await act(async () => {
        await result.current.handleSubmit(submitEvent());
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      pageShow(true);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBeNull();

      await act(async () => {
        await result.current.handleSubmit(submitEvent());
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(window.location.href).toBe("https://checkout.stripe.test/s2");
    });

    it("a non-persisted pageshow (a normal load) does not reset the in-flight guard", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { sessionUrl: "https://checkout.stripe.test/s1" }),
      );
      const { result } = setup();

      await act(async () => {
        await result.current.handleSubmit(submitEvent());
      });
      expect(result.current.isProcessing).toBe(true);

      pageShow(false);
      expect(result.current.isProcessing).toBe(true);

      await act(async () => {
        await result.current.handleSubmit(submitEvent());
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("removes the pageshow listener on unmount", () => {
      const remove = vi.spyOn(window, "removeEventListener");
      const { unmount } = setup();
      unmount();
      expect(remove).toHaveBeenCalledWith("pageshow", expect.any(Function));
      remove.mockRestore();
    });
  });
});

describe("linesToRemoveForRejection", () => {
  const base: CartItem = {
    productId: "glove",
    variantId: "purple",
    productName: "Glove",
    variantName: "Purple",
    price: 4000,
    quantity: 1,
    imageUrl: null,
    sku: null,
  };
  const plain = base;
  const buildA: CartItem = {
    ...base,
    configuration: { choices: [{ groupId: "g", valueIds: ["a"] }], texts: [] },
    configKey: "aaaaaaaaaaaaaaaa",
  };
  const buildB: CartItem = {
    ...base,
    configuration: { choices: [{ groupId: "g", valueIds: ["b"] }], texts: [] },
    configKey: "bbbbbbbbbbbbbbbb",
  };
  const other: CartItem = { ...base, productId: "chain", variantId: null };
  const items = [plain, buildA, buildB, other];

  it("removes exactly the echoed line", () => {
    expect(
      linesToRemoveForRejection(items, [
        {
          productId: "glove",
          variantId: "purple",
          lineKey: checkoutLineKey(buildB),
        },
      ]),
    ).toEqual([cartItemId(buildB)]);
  });

  it("falls back to every line of the product when no lineKey is echoed", () => {
    expect(
      linesToRemoveForRejection(items, [
        { productId: "glove", variantId: "purple" },
      ]),
    ).toEqual([cartItemId(plain), cartItemId(buildA), cartItemId(buildB)]);
  });

  it("ignores an echoed lineKey that matches no line", () => {
    expect(
      linesToRemoveForRejection(items, [
        { productId: "glove", variantId: "purple", lineKey: "nope" },
      ]),
    ).toEqual([]);
  });

  it("hashes line ids longer than the 64-char checkout cap", () => {
    const long: CartItem = {
      ...buildA,
      productId: "c".repeat(25),
      variantId: "v".repeat(25),
    };
    expect(cartItemId(long).length).toBeGreaterThan(64);
    const key = checkoutLineKey(long);
    expect(key.length).toBeLessThanOrEqual(64);
    expect(
      linesToRemoveForRejection(
        [long],
        [
          {
            productId: long.productId,
            variantId: long.variantId,
            lineKey: key,
          },
        ],
      ),
    ).toEqual([cartItemId(long)]);
  });
});

describe("useCheckoutForm delivery options + local delivery", () => {
  const fetchMock = vi.fn();
  const deliveryBusiness = (overrides: Record<string, unknown> = {}) =>
    ({
      ...(business as unknown as Record<string, unknown>),
      offersLocalDelivery: true,
      localDeliveryRadiusMiles: 15,
      localDeliveryFeeCents: 500,
      localDeliveryMinOrderCents: null,
      localDeliveryInstructions: "We deliver Tue-Sat.",
      ...overrides,
    }) as unknown as Business;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    trpc.delivery = { data: undefined, isFetching: false, isError: false };
    trpc.deliveryInputs = [];
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function render(b: Business) {
    return renderHook(() =>
      useCheckoutForm(
        b,
        merchantPolicies as Parameters<typeof useCheckoutForm>[1],
      ),
    );
  }

  function fillDeliveryForm(
    hook: ReturnType<typeof render>,
    zip = "48601-1234",
  ) {
    act(() => {
      const r = hook.result.current;
      r.setEmail("jane@shopper.test");
      r.setName("Jane Doe");
      r.setPhone("5551234567");
      r.setAddressLine1("1 Main St");
      r.setCity("Saginaw");
      r.setState("MI");
      r.setPostalCode(zip);
      r.setDeliveryMethod("delivery");
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
  }

  it("lists ship + pickup only when local delivery is off", () => {
    const { result } = render(business);
    expect(result.current.deliveryOptions.map((o) => o.id)).toEqual([
      "ship",
      "pickup",
    ]);
    expect(result.current.deliveryOptions[0]).toEqual({
      id: "ship",
      label: "Ship to address",
      description: "Shipping cost is based on your store's shipping settings.",
    });
    expect(result.current.deliveryOptions[1]?.description).toBe(
      "No shipping charge. You'll pick up your order at the store.",
    );
  });

  it("describes the delivery option from the fee, radius and minimum", () => {
    expect(
      render(deliveryBusiness()).result.current.deliveryOptions[2],
    ).toEqual({
      id: "delivery",
      label: "Local delivery",
      description: "$5.00 delivery within 15 miles.",
    });
    expect(
      render(
        deliveryBusiness({
          localDeliveryFeeCents: 0,
          localDeliveryMinOrderCents: 5000,
        }),
      ).result.current.deliveryOptions[2]?.description,
    ).toBe("Free delivery within 15 miles. Orders over $50.00.");
  });

  it("describes banded delivery as a 'from' range", () => {
    const describe = (overrides: Record<string, unknown>) =>
      render(deliveryBusiness(overrides)).result.current.deliveryOptions[2]
        ?.description;
    expect(
      describe({ localDeliveryBands: [{ upToMiles: 5, feeCents: 0 }] }),
    ).toBe("Delivery within 15 miles, from Free.");
    expect(
      describe({
        localDeliveryFeeCents: 800,
        localDeliveryBands: [{ upToMiles: 5, feeCents: 300 }],
        localDeliveryMinOrderCents: 2500,
      }),
    ).toBe("Delivery within 15 miles, from $3.00. Orders over $25.00.");
    // Same price everywhere reads like a single fee.
    expect(
      describe({ localDeliveryBands: [{ upToMiles: 5, feeCents: 500 }] }),
    ).toBe("$5.00 delivery within 15 miles.");
    // Over-radius / malformed bands are ignored.
    expect(
      describe({
        localDeliveryBands: [
          { upToMiles: 15, feeCents: 0 },
          { upToMiles: "3", feeCents: 0 },
        ],
      }),
    ).toBe("$5.00 delivery within 15 miles.");
  });

  it("falls back to ship when delivery is chosen but not offered", () => {
    const { result } = render(business);
    act(() => result.current.setDeliveryMethod("delivery"));
    expect(result.current.deliveryMethod).toBe("ship");
    expect(result.current.needsAddress).toBe(true);
  });

  it("pickup needs no address and nothing is locked", () => {
    const { result } = render(deliveryBusiness());
    act(() => result.current.setDeliveryMethod("pickup"));
    expect(result.current.needsAddress).toBe(false);
    expect(result.current.addressLocked).toBe(false);
    expect(result.current.localDelivery.status).toBe("idle");
  });

  it("stays idle and pending until a ZIP is entered", () => {
    const { result } = render(deliveryBusiness());
    act(() => result.current.setDeliveryMethod("delivery"));
    expect(result.current.needsAddress).toBe(true);
    expect(result.current.addressLocked).toBe(true);
    expect(result.current.localDelivery).toEqual({
      status: "idle",
      message: null,
      feeCents: 500,
      instructions: "We deliver Tue-Sat.",
      radiusMiles: 15,
    });
    expect(result.current.shippingPending).toBe(true);
  });

  it("checks the normalized ZIP after the debounce and charges the fee", () => {
    trpc.delivery = {
      data: { eligible: true, feeCents: 500 },
      isFetching: false,
      isError: false,
    };
    const hook = render(deliveryBusiness());
    fillDeliveryForm(hook);
    expect(trpc.deliveryInputs.at(-1)).toEqual({
      items: [{ productId: "p1", variantId: null, quantity: 1 }],
      postalCode: "48601",
      country: "US",
    });
    const r = hook.result.current;
    expect(r.localDelivery.status).toBe("eligible");
    expect(r.shipping).toBe(500);
    expect(r.shippingPending).toBe(false);
    expect(r.finalTotal).toBe(2000);
  });

  it("reports checking while the server call is in flight", () => {
    trpc.delivery = { data: undefined, isFetching: true, isError: false };
    const hook = render(deliveryBusiness());
    fillDeliveryForm(hook);
    expect(hook.result.current.localDelivery.status).toBe("checking");
    expect(hook.result.current.shippingPending).toBe(true);
  });

  it.each([
    [
      { eligible: false, reason: "out_of_range" },
      "We only deliver within 15 miles. Choose another option.",
    ],
    [
      { eligible: false, reason: "below_minimum", minOrderCents: 5000 },
      "Local delivery starts at $50.00.",
    ],
    [
      { eligible: false, reason: "unknown_zip" },
      "We couldn't find that ZIP code.",
    ],
    [
      { eligible: false, reason: "no_origin" },
      "Local delivery isn't available right now.",
    ],
  ])("ineligible %o → %s, and blocks submit", async (data, message) => {
    trpc.delivery = { data, isFetching: false, isError: false };
    const hook = render(deliveryBusiness());
    fillDeliveryForm(hook);
    expect(hook.result.current.localDelivery).toMatchObject({
      status: "ineligible",
      message,
    });
    await act(async () => {
      await hook.result.current.handleSubmit(submitEvent());
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(hook.result.current.error).toBe(message);
  });

  it("is ineligible outside the US without calling the server", () => {
    const hook = render(deliveryBusiness());
    fillDeliveryForm(hook);
    act(() => hook.result.current.setCountry("CA"));
    expect(hook.result.current.localDelivery).toMatchObject({
      status: "ineligible",
      message: "Local delivery is only available in the US.",
    });
  });

  it("trusts the cart subtotal over a base-price below_minimum", () => {
    // Cart subtotal is 1500 (customizer add-ons included client-side).
    trpc.delivery = {
      data: { eligible: false, reason: "below_minimum", minOrderCents: 1200 },
      isFetching: false,
      isError: false,
    };
    const hook = render(deliveryBusiness({ localDeliveryMinOrderCents: 1200 }));
    fillDeliveryForm(hook);
    expect(hook.result.current.localDelivery.status).toBe("eligible");
    expect(hook.result.current.shipping).toBe(500);
  });

  it("charges the server's band fee, not the base fee", () => {
    trpc.delivery = {
      data: { eligible: true, feeCents: 0 },
      isFetching: false,
      isError: false,
    };
    const hook = render(
      deliveryBusiness({ localDeliveryBands: [{ upToMiles: 5, feeCents: 0 }] }),
    );
    fillDeliveryForm(hook);
    expect(hook.result.current.localDelivery).toMatchObject({
      status: "eligible",
      feeCents: 0,
    });
    expect(hook.result.current.shipping).toBe(0);
  });

  it("keeps the band fee when trusting the cart subtotal over below_minimum", () => {
    trpc.delivery = {
      data: {
        eligible: false,
        reason: "below_minimum",
        minOrderCents: 1200,
        feeCents: 200,
      },
      isFetching: false,
      isError: false,
    };
    const hook = render(
      deliveryBusiness({
        localDeliveryMinOrderCents: 1200,
        localDeliveryBands: [{ upToMiles: 5, feeCents: 200 }],
      }),
    );
    fillDeliveryForm(hook);
    expect(hook.result.current.localDelivery.status).toBe("eligible");
    expect(hook.result.current.shipping).toBe(200);
  });

  it("posts deliveryMethod delivery with the address when eligible", async () => {
    trpc.delivery = {
      data: { eligible: true, feeCents: 0 },
      isFetching: false,
      isError: false,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: "stop" }));
    const hook = render(deliveryBusiness({ localDeliveryFeeCents: 0 }));
    fillDeliveryForm(hook);
    await act(async () => {
      await hook.result.current.handleSubmit(submitEvent());
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      deliveryMethod: string;
      customerInfo: { shippingAddress: Record<string, unknown> | null };
    };
    expect(body.deliveryMethod).toBe("delivery");
    expect(body.customerInfo.shippingAddress).toMatchObject({
      line1: "1 Main St",
      postalCode: "48601-1234",
      country: "US",
    });
  });
});
