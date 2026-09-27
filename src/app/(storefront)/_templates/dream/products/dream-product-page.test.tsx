import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultProductPageTemplateProps } from "../../types";

import { DreamProductPage } from "./dream-product-page";

/**
 * Render-level checks for the product page's editor-driven blocks. Heavy
 * children (gallery, buy actions, reviews, wishlist) and the data hooks are
 * stubbed — these tests only assert which of the page's own blocks appear
 * for a given set of saved fields / related products / policies.
 */
let relatedProducts: Array<Record<string, unknown>> = [];
vi.mock("~/trpc/react", () => ({
  api: {
    product: {
      getRelated: { useQuery: () => ({ data: relatedProducts }) },
    },
  },
}));

vi.mock("~/hooks/use-product", () => ({
  useProduct: () => ({
    formatPrice: (cents: number) => `$${(cents / 100).toFixed(2)}`,
    displayPrice: 1000,
    displayCompareAtPrice: null,
    additionalFields: undefined,
    isOnSale: false,
  }),
}));

vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({ isEnabled: () => false }),
}));

vi.mock("./dream-product-actions", () => ({
  DreamProductActions: () => <div data-testid="actions" />,
}));
vi.mock(
  "~/app/(storefront)/_components/product-page/product-gallery-horizontal",
  () => ({ ProductGalleryHorizontal: () => null }),
);
vi.mock("~/app/(storefront)/_components/wishlist/wishlist-button", () => ({
  WishlistButton: () => null,
}));
vi.mock("~/components/analytics/track-view", () => ({ TrackView: () => null }));
vi.mock("~/components/product-reviews", () => ({ ProductReviews: () => null }));
vi.mock("~/components/write-review-dialog", () => ({
  WriteReviewDialog: () => null,
}));
vi.mock("../shared/dream-reveal", () => ({
  DreamReveal: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

type Props = DefaultProductPageTemplateProps;

function renderPage({
  customFields = {},
  productPolicies,
}: {
  customFields?: Record<string, unknown>;
  productPolicies?: Props["productPolicies"];
} = {}) {
  const props = {
    product: {
      id: "prod_1",
      slug: "arch",
      name: "Gold arch",
      description: null,
      images: [],
    },
    business: { siteContent: { customFields } },
    productPolicies,
  } as unknown as Props;
  return render(<DreamProductPage {...props} />);
}

beforeEach(() => {
  relatedProducts = [];
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

describe("DreamProductPage", () => {
  it("renders the product name as the page's h1 and the buy panel hotspot", () => {
    const { container } = renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Gold arch" }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-sp-group="product.details"]'),
    ).not.toBeNull();
  });

  it("hides shipping/returns and the questions line when the fields are blank", () => {
    renderPage({
      productPolicies: { hasShippingPolicy: true, hasRefundPolicy: true },
    });
    expect(screen.queryByRole("heading", { name: "Shipping" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Returns" })).toBeNull();
    expect(screen.queryByText("Read our shipping policy")).toBeNull();
    expect(screen.queryByText("Read our returns policy")).toBeNull();
    expect(screen.queryByRole("link", { name: /ask us/i })).toBeNull();
  });

  it("links a policy page only when it is published", () => {
    const customFields = {
      "dream.product.shipping-note": "Delivered and set up for you.",
      "dream.product.returns-note": "Rentals come back the next day.",
    };
    const { unmount } = renderPage({
      customFields,
      productPolicies: { hasShippingPolicy: false, hasRefundPolicy: false },
    });
    expect(
      screen.getByRole("heading", { name: "Shipping" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Delivered and set up for you."),
    ).toHaveAttribute("data-sp-field", "dream.product.shipping-note");
    expect(screen.queryByText("Read our shipping policy")).toBeNull();
    expect(screen.queryByText("Read our returns policy")).toBeNull();
    unmount();

    renderPage({
      customFields,
      productPolicies: { hasShippingPolicy: true, hasRefundPolicy: true },
    });
    expect(
      screen.getByRole("link", { name: "Read our shipping policy" }),
    ).toHaveAttribute("href", "/shipping-policy");
    expect(
      screen.getByRole("link", { name: "Read our returns policy" }),
    ).toHaveAttribute("href", "/refund-policy");
  });

  it("links the questions line to /contact only when set", () => {
    renderPage({
      customFields: {
        "dream.product.question-text": "Questions about this piece? Ask us",
      },
    });
    expect(
      screen.getByRole("link", { name: "Questions about this piece? Ask us" }),
    ).toHaveAttribute("href", "/contact");
  });

  it("hides the related section without related products, shows it with them", () => {
    const first = renderPage();
    expect(screen.queryByText("You might also like")).toBeNull();
    first.unmount();

    relatedProducts = [
      {
        id: "p2",
        slug: "throne-chair",
        name: "Throne chair",
        price: 5000,
        variants: [],
        images: [],
      },
    ];
    renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "You might also like" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Throne chair/ })).toHaveAttribute(
      "href",
      "/shop/throne-chair",
    );
  });
});
