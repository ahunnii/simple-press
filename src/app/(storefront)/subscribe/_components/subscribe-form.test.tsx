import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SubscribeForm } from "./subscribe-form";

// `SavedAddressPicker` (mounted inside the shipping-address block) reads
// `authClient.useSession` directly — stub it out so every test runs as a
// logged-out shopper and the picker renders nothing, same as most real
// visits to `/subscribe`.
vi.mock("~/server/better-auth/client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
  },
}));

let shippingQuoteData: { shippingCents: number } | undefined = {
  shippingCents: 500,
};
let shippingQuoteIsLoading = false;

vi.mock("~/trpc/react", () => ({
  api: {
    shipping: {
      quote: {
        useQuery: () => ({
          data: shippingQuoteData,
          isLoading: shippingQuoteIsLoading,
          isFetching: false,
        }),
      },
    },
    customer: {
      getMyProfile: {
        useQuery: () => ({ data: undefined }),
      },
    },
  },
}));

type FormProps = Parameters<typeof SubscribeForm>[0];
type FakeBusiness = FormProps["business"];
type FakeProduct = FormProps["product"];

function makeBusiness(overrides: Partial<FakeBusiness> = {}): FakeBusiness {
  return {
    id: "biz_1",
    name: "Acme Goods",
    shippingType: "flat_rate",
    offersInStorePickup: false,
    pickupLocation: null,
    pickupInstructions: null,
    businessAddress: "123 Main St, Detroit, MI",
    salesCountries: [],
    ...overrides,
  } as unknown as FakeBusiness;
}

function makeProduct(overrides: Partial<FakeProduct> = {}): FakeProduct {
  return {
    id: "prod_1",
    slug: "toilet-paper-12-pack",
    name: "Toilet Paper 12-Pack",
    price: 2000,
    subscriptionEnabled: true,
    subscriptionIntervals: ["month:1"],
    subscriptionDiscountPercent: 10,
    additionalFields: null,
    variants: [],
    ...overrides,
  } as unknown as FakeProduct;
}

const merchantPolicies = { hasTermsOfService: false, hasRefundPolicy: false };

function renderForm(overrides: Partial<FormProps> = {}) {
  return render(
    <SubscribeForm
      business={makeBusiness()}
      product={makeProduct()}
      variantId={null}
      intervalKey="month:1"
      quantity={2}
      merchantPolicies={merchantPolicies}
      {...overrides}
    />,
  );
}

function jsonResponse(
  body: unknown,
  init?: { ok?: boolean; status?: number },
): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Email/), "shopper@example.com");
  await user.type(screen.getByLabelText(/Full name/), "Jane Shopper");
  await user.type(screen.getByLabelText(/^Phone/), "5551234567");
  await user.type(screen.getByLabelText(/Address line 1/), "123 Main St");
  await user.type(screen.getByLabelText(/^City/), "Detroit");
  await user.selectOptions(screen.getByLabelText(/State \/ Province/), "MI");
  await user.type(screen.getByLabelText(/ZIP/), "48201");
}

beforeEach(() => {
  shippingQuoteData = { shippingCents: 500 };
  shippingQuoteIsLoading = false;
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: { href: "" },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SubscribeForm", () => {
  it("hides the address fields and shows free shipping when pickup is selected", async () => {
    const user = userEvent.setup();
    renderForm({ business: makeBusiness({ offersInStorePickup: true }) });

    await user.click(screen.getByRole("radio", { name: "In-store pickup" }));

    expect(screen.queryByLabelText(/Address line 1/)).not.toBeInTheDocument();
    expect(screen.getByText("In-store pickup — free")).toBeInTheDocument();
  });

  it("shows the quoted shipping and the per-delivery total when shipping", () => {
    shippingQuoteData = { shippingCents: 500 };
    renderForm();

    // list 2000c, 10% off -> unit 1800c ($18.00), qty 2 -> 3600c items +
    // 500c shipping -> 4100c ($41.00) per delivery.
    expect(screen.getByText("$5.00")).toBeInTheDocument();
    expect(screen.getByText("$41.00")).toBeInTheDocument();
  });

  it("submits the exact subscription-checkout body shape and redirects to sessionUrl", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        sessionUrl: "https://checkout.stripe.com/pay/cs_test_123",
        sessionId: "cs_test_123",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderForm({ variantId: "var_1", quantity: 2 });

    await fillRequiredFields(user);
    await user.click(
      screen.getByRole("button", { name: "Continue to secure checkout" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/stripe/subscriptions/create-session");
    expect(JSON.parse(init.body as string)).toStrictEqual({
      productId: "prod_1",
      variantId: "var_1",
      intervalKey: "month:1",
      quantity: 2,
      deliveryMethod: "ship",
      customerInfo: {
        email: "shopper@example.com",
        name: "Jane Shopper",
        phone: "5551234567",
        shippingAddress: {
          line1: "123 Main St",
          line2: null,
          city: "Detroit",
          state: "MI",
          postalCode: "48201",
          country: "US",
          phone: "5551234567",
        },
      },
    });

    await waitFor(() =>
      expect(window.location.href).toBe(
        "https://checkout.stripe.com/pay/cs_test_123",
      ),
    );
  });

  it("displays the server's error message on a 400 response", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { error: "This item is out of stock or no longer available." },
          { ok: false, status: 400 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderForm();

    await fillRequiredFields(user);
    await user.click(
      screen.getByRole("button", { name: "Continue to secure checkout" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This item is out of stock or no longer available.",
    );
    expect(window.location.href).toBe("");
  });
});
