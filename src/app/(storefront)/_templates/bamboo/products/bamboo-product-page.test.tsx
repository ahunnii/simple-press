import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DefaultProductPageTemplateProps } from "../../types";

import { BambooProductPage } from "./bamboo-product-page";

/**
 * Render-level checks for the product page's editor-driven blocks. Every
 * heavy child (gallery, tabs, buy actions, product cards) and the data hooks
 * are stubbed — these tests only assert which of the page's own blocks
 * appear for a given set of saved fields / related products / policies.
 */
let relatedProducts: Array<{ id: string; name: string }> = [];
vi.mock("~/trpc/react", () => ({
  api: {
    product: {
      getRelated: { useQuery: () => ({ data: relatedProducts }) },
    },
  },
}));

let additionalFields: Record<string, unknown> | undefined;
vi.mock("~/hooks/use-product", () => ({
  useProduct: () => ({
    formatPrice: (cents: number) => `$${(cents / 100).toFixed(2)}`,
    displayPrice: 1000,
    displayCompareAtPrice: null,
    additionalFields,
    isOnSale: false,
  }),
}));

let reviewsEnabled = false;
vi.mock("~/providers/feature-flags-context", () => ({
  useStorefrontFlags: () => ({
    isEnabled: (flag: string) => (flag === "reviews" ? reviewsEnabled : false),
  }),
}));

vi.mock("./bamboo-product-actions", () => ({
  BambooProductActions: () => <div data-testid="actions" />,
}));
vi.mock("../shared/bamboo-product-card", () => ({
  BambooHorizontalProductCard: ({ product }: { product: { name: string } }) => (
    <div>{product.name}</div>
  ),
}));
vi.mock(
  "~/app/(storefront)/_components/product-page/product-gallery-horizontal",
  () => ({ ProductGalleryHorizontal: () => null }),
);
vi.mock(
  "~/app/(storefront)/_components/product-page/additional-info-tabs",
  () => ({ ProductDetailsAdditionalInfoTabs: () => null }),
);
vi.mock("~/app/(storefront)/_components/wishlist/wishlist-button", () => ({
  WishlistButton: () => <div data-testid="wishlist-button" />,
}));
vi.mock("~/components/analytics/track-view", () => ({ TrackView: () => null }));
vi.mock("~/components/product-reviews", () => ({
  ProductReviews: () => <div data-testid="product-reviews" />,
}));
vi.mock("~/components/write-review-dialog", () => ({
  WriteReviewDialog: () => null,
}));
vi.mock("~/components/page-animations", () => {
  const Pass = ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>;
  return {
    FadeIn: Pass,
    PageTransition: Pass,
    StaggerContainer: Pass,
    StaggerItem: Pass,
  };
});

type Props = DefaultProductPageTemplateProps;

function renderPage({
  customFields = {},
  productPolicies,
}: {
  customFields?: Record<string, unknown>;
  productPolicies?: Props["productPolicies"];
} = {}) {
  const props = {
    product: { id: "prod_1", slug: "roll", name: "Bamboo roll", images: [] },
    business: { siteContent: { customFields } },
    productPolicies,
  } as unknown as Props;
  return render(<BambooProductPage {...props} />);
}

beforeEach(() => {
  relatedProducts = [];
  additionalFields = undefined;
  reviewsEnabled = false;
});

describe("BambooProductPage", () => {
  it("hides the whole related section (heading included) when there are no related products", () => {
    renderPage();
    expect(screen.queryByText("You Might Also Like")).toBeNull();
    expect(screen.queryByText(/No related products/i)).toBeNull();
  });

  it("shows the related heading from the field when related products exist", () => {
    relatedProducts = [{ id: "p2", name: "Paper towels" }];
    renderPage({
      customFields: { "bamboo.product.related-heading": "Pairs well with" },
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "Pairs well with" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Paper towels")).toBeInTheDocument();
  });

  it("renders no Shipping/Returns rows when both notes are blank and no policies are published", () => {
    renderPage({
      productPolicies: { hasShippingPolicy: false, hasRefundPolicy: false },
    });
    expect(screen.queryByRole("button", { name: "Shipping" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Returns" })).toBeNull();
    expect(screen.queryByText(/full shipping policy/i)).toBeNull();
    expect(screen.queryByText(/full returns policy/i)).toBeNull();
  });

  it("renders policy links when notes are blank but policies are published", () => {
    renderPage({
      productPolicies: { hasShippingPolicy: true, hasRefundPolicy: true },
    });
    expect(
      screen.getByRole("button", { name: "Shipping" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Returns" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Read the full shipping policy").closest("a"),
    ).toHaveAttribute("href", "/shipping-policy");
    expect(
      screen.getByText("Read the full returns policy").closest("a"),
    ).toHaveAttribute("href", "/refund-policy");
  });

  it("links each policy only when it is published", () => {
    const customFields = {
      "bamboo.product.shipping-summary": "Ships in 2 days.",
      "bamboo.product.returns-summary": "30-day returns.",
    };
    const { unmount } = renderPage({
      customFields,
      productPolicies: { hasShippingPolicy: false, hasRefundPolicy: false },
    });
    expect(
      screen.getByRole("button", { name: "Shipping" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Returns" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Read the full shipping policy")).toBeNull();
    expect(screen.queryByText("Read the full returns policy")).toBeNull();
    unmount();

    renderPage({
      customFields,
      productPolicies: { hasShippingPolicy: true, hasRefundPolicy: false },
    });
    // Panels use the `hidden` attribute, so query including hidden nodes.
    const link = screen.getByText("Read the full shipping policy");
    expect(link.closest("a")).toHaveAttribute("href", "/shipping-policy");
    expect(screen.queryByText("Read the full returns policy")).toBeNull();
  });

  it("shows no badges by default, store badges when saved, and product features over store badges", () => {
    const customFields = {
      "bamboo.product.trust-badges": [
        { _id: "a", icon: "Leaf", label: "Septic safe" },
        { _id: "b", icon: "Leaf", label: "  " },
      ],
    };

    const first = renderPage();
    expect(first.container.querySelectorAll("li")).toHaveLength(0);
    first.unmount();

    const second = renderPage({ customFields });
    const badge = screen.getByText("Septic safe").closest("li");
    expect(badge).toHaveAttribute(
      "data-sp-item",
      "bamboo.product.trust-badges#0",
    );
    expect(second.container.querySelectorAll("li")).toHaveLength(1);
    second.unmount();

    additionalFields = {
      productFeatures: [{ icon: "Truck", text: "Free shipping" }],
    };
    renderPage({ customFields });
    expect(screen.getByText("Free shipping")).toBeInTheDocument();
    expect(screen.queryByText("Septic safe")).toBeNull();
  });

  it("links the question line to /contact by default and hides it when blank", () => {
    const { unmount } = renderPage();
    expect(
      screen.getByRole("link", {
        name: "Questions about this product? Contact us.",
      }),
    ).toHaveAttribute("href", "/contact");
    unmount();

    renderPage({
      customFields: { "bamboo.product.question-text": "" },
    });
    expect(screen.queryByRole("link", { name: /questions/i })).toBeNull();
  });

  it("puts the buy panel inside the product.details editor section", () => {
    const { container } = renderPage();
    expect(
      container.querySelector('[data-sp-group="product.details"]'),
    ).not.toBeNull();
  });

  it("gives shipping, returns and questions each their own editor section", () => {
    const { container } = renderPage({
      customFields: {
        "bamboo.product.shipping-summary": "Ships in 2 days.",
        "bamboo.product.returns-summary": "30-day returns.",
      },
    });
    expect(
      container.querySelector('[data-sp-group="product.shipping"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-sp-group="product.returns"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-sp-group="product.questions"]'),
    ).not.toBeNull();
  });

  it("shows the wishlist button in the buy panel", () => {
    renderPage();
    expect(screen.getByTestId("wishlist-button")).toBeInTheDocument();
  });

  it("mounts reviews only when the reviews flag is enabled", () => {
    const first = renderPage();
    expect(screen.queryByTestId("product-reviews")).toBeNull();
    first.unmount();

    reviewsEnabled = true;
    renderPage();
    expect(screen.getByTestId("product-reviews")).toBeInTheDocument();
  });

  it("shows the reviews heading field only when reviews are enabled and the field is set", () => {
    reviewsEnabled = true;
    renderPage({
      customFields: {
        "bamboo.product.reviews-heading": "Loved by customers",
      },
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "Loved by customers" }),
    ).toBeInTheDocument();
  });
});
