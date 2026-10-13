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

// tRPC react client: inert hook results (quote query, discount mutation).
vi.mock("~/trpc/react", () => {
  const hookResult = {
    data: undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    mutate: () => undefined,
  };
  const proxy: unknown = new Proxy(() => undefined, {
    get: (_t, prop) =>
      prop === "useQuery" || prop === "useMutation" ? () => hookResult : proxy,
    apply: () => hookResult,
  });
  return { api: proxy };
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
