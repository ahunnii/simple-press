"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  isContentEmpty,
  parseTemplateListRows,
} from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { TrackView } from "~/components/analytics/track-view";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ProductGalleryVertical } from "~/app/(storefront)/_components/product-page/product-gallery-vertical-sticky";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";

import { resolveFields } from "..";
import {
  OliveAccordion,
  OliveAccordionItem,
  OliveBreadcrumb,
  OliveLeafMark,
  OlivePrice,
  OliveProductGrid,
  OliveSectionHeading,
  OliveStatusBadge,
} from "../shared";
import { announceOliveCartAdded, OliveBuyRow } from "./olive-buy-row";
import { OliveVariantSelector } from "./olive-variant-selector";

/** At or below this many left, the stock line stops being reassuring. */
const LOW_STOCK = 5;

/**
 * Prose inside the Details panel, repainted onto olive tokens.
 *
 * Colours ride `prose-*` modifiers (which set colour directly on descendants)
 * rather than `--tw-prose-*` custom properties, because `.prose` declares
 * those same variables on the element it is applied to and shadows anything
 * set alongside it.
 */
const PROSE_CLASS = [
  "prose prose-sm max-w-none",
  "prose-p:text-[var(--olive-ink-soft)] prose-li:text-[var(--olive-ink-soft)]",
  "prose-headings:font-normal prose-headings:text-[var(--olive-ink)]",
  "prose-strong:font-medium prose-strong:text-[var(--olive-ink)]",
  "prose-a:text-[var(--olive-leaf)] prose-a:underline prose-a:underline-offset-2",
  "prose-blockquote:border-[var(--olive-sage-bright)] prose-blockquote:text-[var(--olive-ink)]",
  "prose-hr:border-[var(--olive-hairline)]",
  "marker:text-[var(--olive-sage-bright)]",
].join(" ");

const containerStyle: CSSProperties = {
  maxWidth: "var(--olive-container)",
  marginInline: "auto",
  paddingInline: "var(--olive-section-pad-x)",
};

/**
 * OliveProductPage — the specimen page.
 *
 * The photograph on the left, and on the right a panel that stays with you as
 * you scroll: the name, the price, the product's real colours as chips, the
 * cut tabs for everything that is not a colour, and one sage pill. The
 * accordions below it are the only cards in the column, which is the whole
 * reason the panel itself is not one.
 *
 * Coming-soon is checked before anything else: a product that is not for sale
 * yet shows no purchase control at all, matching what the checkout enforces
 * server-side.
 */
export function OliveProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const {
    additionalFields,
    canAddMore,
    displayCompareAtPrice,
    displayPrice,
    displayTrustBadges,
    handleAddToCart,
    handleQuantityChange,
    inStock,
    isInventoryTracked,
    isOnSale,
    quantity,
    remainingStock,
    selectedVariantId,
    setSelectedVariantId,
  } = useProduct(product);

  const { data: related } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "olive.global.product-shipping-description",
    "olive.global.product-returns-description",
    "olive.global.product-question-text",
    "olive.global.product-related-heading",
    "olive.global.product-related-link-label",
    "olive.global.product-coming-soon-heading",
    "olive.global.product-coming-soon-body",
  ]);

  const shippingText = (
    f["olive.global.product-shipping-description"] ?? ""
  ).trim();
  const returnsText = (
    f["olive.global.product-returns-description"] ?? ""
  ).trim();
  const questionText = (f["olive.global.product-question-text"] ?? "").trim();
  const relatedHeading = f["olive.global.product-related-heading"] ?? "";
  const relatedLinkLabel = f["olive.global.product-related-link-label"] ?? "";
  const comingSoonHeading = f["olive.global.product-coming-soon-heading"] ?? "";
  const comingSoonBody = f["olive.global.product-coming-soon-body"] ?? "";

  // Product-level badges (icon + text, set per product) win over the store-wide
  // list; a product that says something specific should not be talked over.
  const globalBadges = parseTemplateListRows(
    getListFieldValue(customFields, "olive.global.product-trust-badges"),
  )
    .map((row) => (typeof row.label === "string" ? row.label.trim() : ""))
    .filter((label) => label.length > 0);

  const badges =
    displayTrustBadges.length > 0
      ? displayTrustBadges.map((badge) => ({
          Icon: badge.Icon,
          label: badge.label,
        }))
      : globalBadges.map((label) => ({ Icon: Check, label }));

  const comingSoon = additionalFields?.comingSoon === true;
  const tagline = additionalFields?.productTagline?.trim() ?? "";
  const details = additionalFields?.additionalInformation as TiptapJSON;
  const hasDetails = !isContentEmpty(details);
  const hasVariants = product.variants.length > 0;
  const relatedProducts = related ?? [];

  const onAddSimple = () => {
    if (!canAddMore) return;
    handleAddToCart();
    announceOliveCartAdded(product.name);
  };

  return (
    <div style={containerStyle}>
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />

      <OliveBreadcrumb
        className="pt-6 pb-5 md:pt-8 md:pb-6"
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24">
        <ProductGalleryVertical
          images={product.images}
          productName={product.name}
          enableLightbox
          styleProps={{
            singleImageContainerClassName:
              "rounded-[var(--olive-card-radius)] bg-[var(--olive-paper)]",
            unselectedButtonClassName:
              "rounded-[var(--olive-card-radius)] border-[var(--olive-hairline)] bg-[var(--olive-paper)]",
            selectedButtonClassName:
              "rounded-[var(--olive-card-radius)] border-[var(--olive-leaf)] ring-[var(--olive-leaf)] bg-[var(--olive-paper)]",
          }}
        />

        {/* The buy panel. Deliberately not a card: the accordions inside it are,
            and a card inside a card is the one container mistake this template
            refuses. */}
        <div
          className="flex flex-col gap-5 lg:sticky lg:top-[calc(var(--olive-header-h)+1.5rem)] lg:self-start"
          {...sectionGroupAttr("global", "product")}
        >
          <div className="flex flex-col gap-3">
            <h1 className="olive-h1">{product.name}</h1>

            {tagline ? (
              <p
                className="text-[0.9375rem] leading-relaxed"
                style={{ color: "var(--olive-ink-soft)" }}
              >
                {tagline}
              </p>
            ) : null}

            <OlivePrice
              price={displayPrice}
              compareAtPrice={isOnSale ? displayCompareAtPrice : null}
            />
          </div>

          {product.description ? (
            <p
              className="max-w-[62ch] text-[0.9375rem] leading-relaxed"
              style={{ color: "var(--olive-ink-soft)" }}
            >
              {product.description}
            </p>
          ) : null}

          <hr
            style={{
              border: 0,
              borderTop: "1px solid var(--olive-hairline)",
            }}
          />

          {comingSoon ? (
            <div className="olive-card olive-card-paper flex flex-col items-start gap-1.5 p-4">
              <span
                className="flex items-center"
                style={{ color: "var(--olive-leaf)" }}
              >
                <OliveLeafMark size={20} />
              </span>
              <p
                className="olive-h3"
                {...fieldAttr("olive.global.product-coming-soon-heading")}
              >
                {comingSoonHeading}
              </p>
              <p
                className="olive-caption"
                {...fieldAttr("olive.global.product-coming-soon-body")}
              >
                {comingSoonBody}
              </p>
            </div>
          ) : hasVariants ? (
            <OliveVariantSelector
              product={product}
              selectedVariantId={selectedVariantId}
              setSelectedVariantId={setSelectedVariantId}
            />
          ) : !inStock ? (
            <div className="flex flex-col gap-3">
              <OliveStatusBadge status="sold-out" />
              <NotifyMeForm
                productId={product.id}
                message="Tell us where to write when this one is back."
                messageClassName="text-[0.8125rem] text-[var(--olive-ink-soft)]"
                inputClassName="olive-input"
                buttonClassName="olive-btn olive-btn-secondary olive-btn-sm"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <OliveBuyRow
                quantity={quantity}
                onQuantityChange={handleQuantityChange}
                max={remainingStock > 0 ? remainingStock : undefined}
                itemLabel={product.name}
                onAdd={onAddSimple}
                disabled={!canAddMore}
              />

              {product.trackInventory &&
              product.allowBackorders &&
              product.inventoryQty === 0 ? (
                <OliveStatusBadge
                  status="pre-order"
                  label="Pre-order — ships when available"
                />
              ) : isInventoryTracked && remainingStock > 0 ? (
                remainingStock <= LOW_STOCK ? (
                  <OliveStatusBadge
                    status="low"
                    label={`Only ${remainingStock} left`}
                  />
                ) : (
                  <p className="olive-caption">{remainingStock} available</p>
                )
              ) : null}

              {!canAddMore ? (
                <p className="olive-caption">
                  Everything we have is already in your bag.
                </p>
              ) : null}
            </div>
          )}

          {badges.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {badges.map(({ Icon, label }, index) => (
                <li
                  key={`${label}-${index}`}
                  className="flex items-start gap-2 text-[0.8125rem] leading-relaxed"
                  style={{ color: "var(--olive-ink-soft)" }}
                >
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--olive-leaf)" }}
                  />
                  {label}
                </li>
              ))}
            </ul>
          ) : null}

          {hasDetails || shippingText || returnsText ? (
            <OliveAccordion className="mt-1">
              {hasDetails ? (
                <OliveAccordionItem
                  headingLevel={2}
                  id="details"
                  title="Details"
                  defaultOpen
                >
                  <TiptapRenderer content={details} className={PROSE_CLASS} />
                </OliveAccordionItem>
              ) : null}

              {shippingText ? (
                <OliveAccordionItem
                  headingLevel={2}
                  id="shipping"
                  title="Shipping"
                >
                  <p
                    {...fieldAttr("olive.global.product-shipping-description")}
                  >
                    {shippingText}
                  </p>
                </OliveAccordionItem>
              ) : null}

              {returnsText ? (
                <OliveAccordionItem
                  headingLevel={2}
                  id="returns"
                  title="Returns"
                >
                  <p {...fieldAttr("olive.global.product-returns-description")}>
                    {returnsText}
                  </p>
                </OliveAccordionItem>
              ) : null}
            </OliveAccordion>
          ) : null}

          {questionText ? (
            <p className="olive-caption">
              <Link
                href="/contact"
                className="underline"
                style={{
                  color: "var(--olive-leaf)",
                  textDecorationColor: "var(--olive-sage-bright)",
                  textUnderlineOffset: "5px",
                }}
                {...fieldAttr("olive.global.product-question-text")}
              >
                {questionText}
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section
          aria-labelledby="olive-related-heading"
          className="pt-12 pb-16 md:pt-16 md:pb-24"
          style={{ borderTop: "1px solid var(--olive-hairline)" }}
        >
          <OliveSectionHeading
            id="olive-related-heading"
            heading={relatedHeading}
            headingFieldKey="olive.global.product-related-heading"
            link={{ label: relatedLinkLabel, href: "/shop" }}
            linkFieldKey="olive.global.product-related-link-label"
            className="mb-8"
          />
          <OliveProductGrid
            products={relatedProducts}
            columns={4}
            emptyHeading="Nothing to pair with this one yet"
          />
        </section>
      ) : null}
    </div>
  );
}
