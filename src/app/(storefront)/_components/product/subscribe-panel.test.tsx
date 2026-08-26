import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SubscribePanel } from "./subscribe-panel";

/**
 * `useStorefrontFlags` is mocked directly rather than mounting
 * `StorefrontFlagsProvider` — simpler for a component that only reads
 * `isEnabled("subscriptions")`, and lets each test flip the flag without
 * threading `Business.featureFlags` through a provider tree.
 */
let flagsEnabled = true;
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({
    isEnabled: (key: string) => (key === "subscriptions" ? flagsEnabled : true),
  }),
}));

type FakeProduct = Parameters<typeof SubscribePanel>[0]["product"];

function makeProduct(overrides: Partial<FakeProduct> = {}): FakeProduct {
  return {
    id: "prod_1",
    slug: "toilet-paper-12-pack",
    price: 2000,
    subscriptionEnabled: true,
    subscriptionIntervals: ["month:1"],
    subscriptionDiscountPercent: 10,
    additionalFields: null,
    variants: [],
    ...overrides,
  } as unknown as FakeProduct;
}

function renderPanel(
  overrides: Partial<FakeProduct> = {},
  panelOverrides: Partial<Parameters<typeof SubscribePanel>[0]> = {},
) {
  return render(
    <SubscribePanel
      product={makeProduct(overrides)}
      selectedVariantId={null}
      quantity={2}
      available={true}
      className="test-class"
      {...panelOverrides}
    />,
  );
}

describe("SubscribePanel", () => {
  it("renders nothing when the subscriptions flag is off", () => {
    flagsEnabled = false;
    const { container } = renderPanel();
    flagsEnabled = true;
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the product has subscriptions disabled", () => {
    const { container } = renderPanel({ subscriptionEnabled: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the product is marked coming soon", () => {
    const { container } = renderPanel({
      additionalFields: { comingSoon: true },
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when no cadences are configured", () => {
    const { container } = renderPanel({ subscriptionIntervals: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the current selection is out of stock", () => {
    const { container } = renderPanel({}, { available: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the discount heading and the per-delivery price for variant × qty", () => {
    // price 2000c, 10% off -> unit 1800c, qty 2 -> 3600c per delivery.
    renderPanel();

    expect(screen.getByText("Subscribe & save 10%")).toBeInTheDocument();
    expect(screen.getByText("$36.00")).toBeInTheDocument();
  });

  it("shows 'Subscribe' with no percentage when the discount is 0", () => {
    renderPanel({ subscriptionDiscountPercent: 0 });

    // "Subscribe" appears twice (heading + CTA) once no discount is shown.
    expect(screen.getAllByText("Subscribe")).toHaveLength(2);
    expect(screen.queryByText(/Subscribe & save/)).not.toBeInTheDocument();
  });

  it("hides the cadence radio group when only one interval is configured", () => {
    renderPanel({ subscriptionIntervals: ["month:1"] });

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows the cadence radio group when more than one interval is configured", () => {
    renderPanel({ subscriptionIntervals: ["week:1", "month:1"] });

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(screen.getByText("Delivery frequency")).toBeInTheDocument();
  });

  it("builds the CTA href from product slug, variant, interval, and quantity", () => {
    render(
      <SubscribePanel
        product={makeProduct({
          subscriptionIntervals: ["week:1", "month:1"],
        })}
        selectedVariantId="var_abc"
        quantity={3}
        available={true}
      />,
    );

    const link = screen.getByRole("link", { name: "Subscribe" });
    expect(link).toHaveAttribute(
      "href",
      "/subscribe?product=toilet-paper-12-pack&variant=var_abc&interval=week:1&qty=3",
    );
  });

  it("defaults to the catalog-first configured interval and omits the variant when none is selected", () => {
    // parseProductIntervals returns catalog order (week:1, week:2, month:1,
    // month:2, month:3), not input order — "month:1" sorts before "month:2"
    // regardless of the order they're stored in.
    render(
      <SubscribePanel
        product={makeProduct({ subscriptionIntervals: ["month:2", "month:1"] })}
        selectedVariantId={null}
        quantity={1}
        available={true}
      />,
    );

    const link = screen.getByRole("link", { name: "Subscribe" });
    expect(link).toHaveAttribute(
      "href",
      "/subscribe?product=toilet-paper-12-pack&variant=&interval=month:1&qty=1",
    );
  });

  it("renders nothing when the discounted per-delivery total is below Stripe's $0.50 minimum", () => {
    const { container } = renderPanel({
      price: 10,
      subscriptionDiscountPercent: 90,
    });
    expect(container).toBeEmptyDOMElement();
  });
});
