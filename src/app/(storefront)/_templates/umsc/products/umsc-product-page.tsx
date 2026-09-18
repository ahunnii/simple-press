import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import {
  getListFieldValue,
  isContentEmpty,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { cn } from "~/lib/utils";
import { db } from "~/server/db";
import { api } from "~/trpc/server";
import { TrackView } from "~/components/analytics/track-view";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { UmscBreadcrumb } from "../shared/umsc-breadcrumb";
import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscProductGrid } from "../shared/umsc-product-grid";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";
import { UmscProductInfo } from "./umsc-product-info";
import { UmscProductReviews } from "./umsc-product-reviews";

const GLOBAL_FIELD_KEYS = [
  "umsc.global.product-shipping-description",
  "umsc.global.product-question-description",
  "umsc.global.google-review-url",
];

/**
 * Prose classes for the `products.details` Tiptap description — same recipe
 * as `UMSC_PROSE_CLASSNAME` in `generic/umsc-generic-page.tsx` (that const
 * isn't exported, and each page agent's directory is self-contained per the
 * build brief, so this is a deliberate, matching duplicate rather than a
 * cross-directory import). The blockquote border/face can't ride a
 * `prose-blockquote:` utility here either (Typography's unlayered base rule
 * wins) — asserted via the same `<style>` escape hatch.
 */
const PRODUCT_PROSE_CLASSNAME = cn(
  "umsc-prose prose w-full max-w-[66ch]",
  "prose-headings:umsc-serif prose-headings:font-normal prose-headings:text-[var(--umsc-ink)] prose-headings:tracking-[0.015em] prose-headings:text-balance",
  "prose-h2:text-[clamp(28px,3.6vw,40px)] prose-h2:leading-[1.1] prose-h2:mt-10 prose-h2:mb-4",
  "prose-h3:text-[20px] prose-h3:leading-[1.2] prose-h3:mt-8 prose-h3:mb-3",
  "prose-p:umsc-sans prose-p:text-[16px] prose-p:leading-[1.7] prose-p:text-[var(--umsc-ink)]",
  "prose-li:umsc-sans prose-li:text-[16px] prose-li:leading-[1.7] prose-li:text-[var(--umsc-ink)] prose-li:marker:text-[var(--umsc-gold-ink)]",
  "prose-strong:font-semibold prose-strong:text-[var(--umsc-ink)]",
  "prose-a:text-[var(--umsc-gold-ink)] prose-a:underline prose-a:underline-offset-[0.18em] hover:prose-a:text-[var(--umsc-ink)]",
  "prose-hr:border-[var(--umsc-hairline)]",
  "prose-img:border prose-img:border-[var(--umsc-line)]",
);

const PRODUCT_PROSE_STYLE = `
  .umsc-prose blockquote {
    border-left: 2px solid var(--umsc-line-gold);
    padding-left: 1.25rem;
    font-style: normal;
    color: var(--umsc-ink);
  }
`;

/**
 * UmscProductPage — design.md "Product". Server half resolves the breadcrumb
 * collection, the global product-page copy, and the related-products grid;
 * gallery/price/variant/cart state is handed off to `UmscProductInfo`
 * ("use client", per `useProduct`'s requirement).
 */
export async function UmscProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, GLOBAL_FIELD_KEYS);

  const [collectionLink, related] = await Promise.all([
    db.collectionProduct.findFirst({
      // `published: true` — an unpublished collection 404s at
      // /collections/[slug], so linking the breadcrumb to one would strand
      // the shopper (same guard pink's product page uses).
      where: {
        productId: product.id,
        collection: { businessId: business.id, published: true },
      },
      select: { collection: { select: { name: true, slug: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    api.product.getRelated({ productId: product.id }),
  ]);
  const firstCollection = collectionLink?.collection ?? null;

  const globalTrustBadges = parseTemplateTrustBadgesListRows(
    getListFieldValue(customFields, "umsc.global.product-trust-badges"),
    [
      { label: "Hand-poured in Detroit" },
      { label: "Ships in 1-2 business days" },
    ],
  );

  const additionalInformation = (
    product.additionalFields as { additionalInformation?: TiptapJSON } | null
  )?.additionalInformation;
  const hasDetails = additionalInformation
    ? !isContentEmpty(additionalInformation)
    : false;

  return (
    <div>
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />

      <div className="px-[var(--umsc-section-pad-x)] pt-8">
        <div className="mx-auto" style={{ maxWidth: "var(--umsc-container)" }}>
          <UmscBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/shop" },
              ...(firstCollection
                ? [
                    {
                      label: firstCollection.name,
                      href: `/collections/${firstCollection.slug}`,
                    },
                  ]
                : []),
              { label: product.name },
            ]}
          />
        </div>
      </div>

      <UmscProductInfo
        product={product}
        collectionName={firstCollection?.name}
        shippingDescription={
          f["umsc.global.product-shipping-description"] ?? ""
        }
        questionDescription={
          f["umsc.global.product-question-description"] ?? ""
        }
        globalTrustBadges={globalTrustBadges ?? []}
      />

      {/* products.details */}
      {hasDetails && (
        <UmscSection
          tone="paper"
          aria-label="Product details"
          padded={false}
          style={{ padding: "0 var(--umsc-section-pad-x) 4rem" }}
        >
          <style>{PRODUCT_PROSE_STYLE}</style>
          <TiptapRenderer
            content={additionalInformation}
            className={PRODUCT_PROSE_CLASSNAME}
          />
        </UmscSection>
      )}

      {/* products.reviews */}
      <UmscProductReviews
        productId={product.id}
        productName={product.name}
        googleReviewUrl={f["umsc.global.google-review-url"] ?? ""}
      />

      {/* products.related */}
      {related.length > 0 && (
        <UmscSection
          tone="paper"
          aria-labelledby="umsc-related-heading"
          className="border-t border-[var(--umsc-line)]"
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <UmscHeading as="h2" id="umsc-related-heading">
              You may also like
            </UmscHeading>
            <UmscButton href="/shop" variant="link">
              All products
            </UmscButton>
          </div>
          <UmscRevealGroup>
            <UmscProductGrid products={related as unknown as Product[]} />
          </UmscRevealGroup>
        </UmscSection>
      )}
    </div>
  );
}
