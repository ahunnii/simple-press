import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";

import { PinkEyebrow } from "../shared/pink-eyebrow";
import { PinkFilterChips, type PinkFilterChipItem } from "../shared/pink-filter-chips";
import { PinkProductCard } from "../shared/pink-product-card";
import { PinkReveal } from "../shared/pink-reveal";

export type PinkFeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  featured: boolean;
  images: { url: string; altText: string | null; sortOrder: number }[];
  /** `Product.additionalFields` — only `comingSoon` is read here. */
  additionalFields?: unknown;
};

type Props = {
  eyebrow: string;
  heading: string;
  note: string;
  ctaLabel: string;
  ctaLink: string;
  products: PinkFeaturedProduct[];
  collectionChips: PinkFilterChipItem[];
};

/**
 * `homepage.collection` — eyebrow + H2 + right-aligned note, a hairline chip
 * row linking to /shop and collection filters, a 3-column product grid of
 * real featured products, and a centered ghost "see all" CTA (design.md →
 * Per-page section concepts → Homepage). Hideable.
 */
export function PinkCollectionSection({
  eyebrow,
  heading,
  note,
  ctaLabel,
  ctaLink,
  products,
  collectionChips,
}: Props) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="pink-collection-heading"
      className="px-5 py-16 md:px-10 md:py-24"
      {...sectionGroupAttr("homepage", "collection")}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            {eyebrow && (
              <PinkEyebrow fieldKey="pink.homepage.collection-eyebrow">{eyebrow}</PinkEyebrow>
            )}
            <h2
              id="pink-collection-heading"
              className="pink-display text-[clamp(26px,2.8vw,38px)] font-semibold tracking-[-0.025em]"
              style={{ color: "var(--pink-ink)" }}
              {...fieldAttr("pink.homepage.collection-heading")}
            >
              {heading}
            </h2>
          </div>
          {note && (
            <p
              className="max-w-[36ch] text-[15px] leading-[1.6] md:text-right"
              style={{ color: "var(--pink-muted)" }}
              {...fieldAttr("pink.homepage.collection-note")}
            >
              {note}
            </p>
          )}
        </div>

        {collectionChips.length > 0 && (
          <div className="mt-8">
            <PinkFilterChips items={collectionChips} aria-label="Shop by collection" />
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => {
            const image = product.images[0];
            // Same "coming soon" badge convention as the shop grid
            // (`pink-shop-client.tsx`) — a not-yet-purchasable piece never
            // gets the "Featured" badge, it gets flagged instead so nobody
            // clicks through expecting to buy it today.
            const additional = product.additionalFields as
              | { comingSoon?: boolean }
              | null
              | undefined;
            const isComingSoon = additional?.comingSoon === true;
            return (
              <PinkReveal key={product.id} index={i} as="div">
                <PinkProductCard
                  href={`/shop/${product.slug}`}
                  imageUrl={image?.url}
                  imageAlt={image?.altText ?? product.name}
                  title={product.name}
                  price={formatPrice(product.price)}
                  compareAtPrice={
                    product.compareAtPrice && product.compareAtPrice > product.price
                      ? formatPrice(product.compareAtPrice)
                      : undefined
                  }
                  badge={
                    isComingSoon
                      ? { label: "Coming soon", tone: "ink" }
                      : product.featured
                        ? { label: "Featured", tone: "rose" }
                        : undefined
                  }
                />
              </PinkReveal>
            );
          })}
        </div>

        {ctaLabel && (
          <div className="mt-12 flex justify-center">
            <Link
              href={ctaLink}
              className="pink-btn pink-btn-ghost"
              {...fieldAttr("pink.homepage.collection-cta-label")}
            >
              {ctaLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
