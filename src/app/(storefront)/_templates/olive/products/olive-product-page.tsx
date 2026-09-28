"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  isContentEmpty,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { TrackView } from "~/components/analytics/track-view";
import { ProductReviews } from "~/components/product-reviews";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { WriteReviewDialog } from "~/components/write-review-dialog";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { ProductGalleryVertical } from "~/app/(storefront)/_components/product-page/product-gallery-vertical-sticky";
import { NotifyMeForm } from "~/app/(storefront)/_components/product/notify-me-form";
import { SubscribePanel } from "~/app/(storefront)/_components/product/subscribe-panel";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { resolveFields } from "..";
import {
  isColorOptionName,
  OliveAccordion,
  OliveAccordionItem,
  OliveBreadcrumb,
  OliveLeafMark,
  OlivePrice,
  OliveProductGrid,
  OliveReveal,
  OliveRevealGroup,
  OliveSectionHeading,
  OliveStatusBadge,
  resolveChipColor,
} from "../shared";
import { announceOliveCartAdded, OliveBuyRow } from "./olive-buy-row";
import { OliveVariantSelector } from "./olive-variant-selector";

/** At or below this many left, the stock line stops being reassuring. */
const LOW_STOCK = 5;

/**
 * The colour a variant carries, if it carries one at all.
 *
 * Reads `variant.options` exactly the way the variant selector does: the
 * owner names the dimension, and `isColorOptionName` decides whether that
 * name is a colour. Size, length and scent are words rather than paint, so
 * they resolve to `null` here and never light the swatch turn — the swatch
 * book is only literal for colour (see `olive-variant-selector.tsx`).
 */
function colorValueOfOptions(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isColorOptionName(key)) continue;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

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
  productPolicies,
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

  const { isEnabled } = useStorefrontFlags();
  const reviewsEnabled = isEnabled("reviews");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const hasVariants = product.variants.length > 0;

  // `OliveVariantSelector` keeps its own quantity stepper (separate from
  // `useProduct`'s `quantity`/`handleQuantityChange`, which only ever drives
  // the plain, no-variant buy row above) — mirror its value here so
  // `SubscribePanel` links to `/subscribe` with what the shopper actually
  // picked instead of always `qty=1`.
  const [variantQuantity, setVariantQuantity] = useState(1);
  const subscribeQuantity = hasVariants ? variantQuantity : quantity;

  // ── The swatch turn ─────────────────────────────────────────────────────
  //
  // Olive's focal moment. When the photograph changes because a *colour*
  // changed, it turns the way a leaf of a swatch book is turned, with the
  // chosen colour riding the leading edge of the wipe. A size/length/scent
  // change is not the swatch book being literal, so it keeps the shared
  // gallery's plain crossfade. No context is needed for any of this: this
  // component already owns `selectedVariantId` and renders both the gallery
  // and the selector.
  //
  // Mirrors the selector's own fallback (`find(...) ?? variants[0]`) so the
  // accent always matches the chip the shopper sees ringed.
  const turnVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants[0] ??
    null;
  const selectedColorValue = colorValueOfOptions(turnVariant?.options);

  // `resolveChipColor` deliberately refuses to invent a paint for a name it
  // does not recognise — it hands back the paper ground and the chip draws
  // itself hatched, so the page tells the truth about what it does not know
  // (see `shared/olive-color.ts`). Honour that here: an unknown name passes
  // NO accent, and the turn runs as a plain uncoloured wipe rather than
  // sweeping a fabricated colour across the photograph.
  const resolvedAccent = selectedColorValue
    ? resolveChipColor(selectedColorValue)
    : null;
  const turnAccent =
    resolvedAccent && !resolvedAccent.unknown
      ? resolvedAccent.color
      : undefined;

  // Arm/disarm by comparing this render's selection against the last one.
  // Plain state adjusted *during* render (React's "adjust state when props
  // change" pattern) rather than an effect, so the gallery already holds the
  // right preset by the time its own `selectedImage` effect fires on the next
  // commit. The initial value is pure — derived from the variant data, never
  // from `matchMedia` — so the first render is identical on server and
  // client. It starts armed for any product that has a colour dimension at
  // all, and is disarmed only by a variant change that left the colour where
  // it was; a thumbnail click, which changes no dimension, inherits whichever
  // state the last variant change left behind.
  const [turn, setTurn] = useState({
    variantId: turnVariant?.id ?? null,
    color: selectedColorValue,
    armed: selectedColorValue !== null,
  });
  if (turn.variantId !== (turnVariant?.id ?? null)) {
    setTurn({
      variantId: turnVariant?.id ?? null,
      color: selectedColorValue,
      armed: selectedColorValue !== null && turn.color !== selectedColorValue,
    });
  }

  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "olive.global.product-shipping-description",
    "olive.global.product-returns-description",
    "olive.global.product-question-text",
    "olive.global.product-related-heading",
    "olive.global.product-related-link-label",
    "olive.global.product-coming-soon-heading",
    "olive.global.product-coming-soon-body",
    "olive.global.product-related-empty",
    "olive.global.product-preorder-note",
    "olive.global.product-max-in-bag",
    "olive.global.product-reviews-heading",
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
  const relatedEmptyText =
    f["olive.global.product-related-empty"] ??
    "Nothing to pair with this one yet";
  const preorderNote =
    f["olive.global.product-preorder-note"] ??
    "Pre-order — ships when available";
  const maxInBagNote =
    f["olive.global.product-max-in-bag"] ??
    "Everything we have is already in your bag.";
  const reviewsHeading = f["olive.global.product-reviews-heading"] ?? "";
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;

  // Each row is its own hideable section (product.shipping / product.returns
  // / product.questions) so an owner can hide one without hiding the others.
  // A row still shows with blank owner text as long as its policy page is
  // published, so the "Read the full … policy" link stays reachable.
  const showShippingRow =
    isSectionVisible(customFields, "olive", "product.shipping") &&
    (shippingText !== "" || hasShippingPolicy);
  const showReturnsRow =
    isSectionVisible(customFields, "olive", "product.returns") &&
    (returnsText !== "" || hasRefundPolicy);
  const showQuestionsRow =
    isSectionVisible(customFields, "olive", "product.questions") &&
    questionText !== "";

  // Product-level badges (icon + text, set per product) win over the store-wide
  // list; a product that says something specific should not be talked over.
  // Olive's own list field is label-only (see products/index.ts itemSchema),
  // so `row.icon` is always undefined here and the Check glyph carries every
  // store-wide badge — kept for parity with `displayTrustBadges`, which does
  // supply real icons. Index is assigned AFTER the parser has already
  // dropped any invalid rows (mirrors bamboo's `bamboo-product-page.tsx`
  // :97-102), so a row that fails validation shifts the indexes of the rows
  // after it; there is no cheap way to recover the pre-validation index
  // through this shared helper.
  const globalBadges = (
    parseTemplateTrustBadgesListRows(
      getListFieldValue(customFields, "olive.global.product-trust-badges"),
    ) ?? []
  )
    .map((row, index) => ({
      Icon: row.icon ?? Check,
      label: row.label.trim(),
      index,
    }))
    .filter((row) => row.label.length > 0);

  const badges: { Icon: LucideIcon; label: string; index: number | null }[] =
    displayTrustBadges.length > 0
      ? displayTrustBadges.map((badge) => ({
          Icon: badge.Icon,
          label: badge.label,
          index: null,
        }))
      : globalBadges;

  const comingSoon = additionalFields?.comingSoon === true;
  const tagline = additionalFields?.productTagline?.trim() ?? "";
  const details = additionalFields?.additionalInformation as TiptapJSON;
  const hasDetails = !isContentEmpty(details);
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
          motionPreset={turn.armed ? "swatch-turn" : "fade"}
          accentColor={turn.armed ? turnAccent : undefined}
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
          className="lg:sticky lg:top-[calc(var(--olive-header-h)+1.5rem)] lg:self-start"
          {...sectionGroupAttr("product", "details")}
        >
          <OliveRevealGroup className="flex flex-col gap-5">
            <div
              className="olive-reveal-item flex flex-col gap-3"
              style={{ "--i": 0 } as CSSProperties}
            >
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
                className="olive-reveal-item max-w-[62ch] text-[0.9375rem] leading-relaxed"
                style={
                  { color: "var(--olive-ink-soft)", "--i": 1 } as CSSProperties
                }
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

            {/* Wishlist — its own row above the buy controls so it stays
                visible across every branch below (coming soon, variants,
                out of stock, in stock). Self-gates on the wishlist flag. */}
            <WishlistButton
              item={{
                productId: product.id,
                name: product.name,
                slug: product.slug,
                price: displayPrice,
                imageUrl: product.images[0]?.url ?? null,
              }}
              className="static flex size-10 shrink-0 items-center justify-center self-start rounded-[var(--olive-card-radius)] border border-[var(--olive-hairline)] bg-[var(--olive-paper)] text-[var(--olive-leaf)] shadow-none backdrop-blur-none hover:scale-100 hover:bg-[var(--olive-sage-tint)]"
              iconClassName="size-4"
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
                onQuantityChange={setVariantQuantity}
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
                    label={preorderNote}
                    labelFieldKey="olive.global.product-preorder-note"
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
                  <p
                    className="olive-caption"
                    {...fieldAttr("olive.global.product-max-in-bag")}
                  >
                    {maxInBagNote}
                  </p>
                ) : null}
              </div>
            )}

            {/* `olive-subscribe-panel` (globals.css) scopes the shared
                token-only panel to olive's own palette — see the note in
                `subscribe-panel.tsx` for why olive doesn't remap the shadcn
                tokens globally the way `bamboo`/`happy-bamboo` do. */}
            <SubscribePanel
              product={product}
              selectedVariantId={selectedVariantId}
              quantity={subscribeQuantity}
              available={inStock}
              className="olive-subscribe-panel"
              ctaClassName="olive-btn olive-btn-primary h-11"
            />

            {badges.length > 0 ? (
              <ul
                className="olive-reveal-item flex flex-col gap-1.5"
                style={{ "--i": 2 } as CSSProperties}
              >
                {badges.map(({ Icon, label, index }, position) => (
                  <li
                    key={`${label}-${position}`}
                    {...(index !== null
                      ? listItemAttr(
                          "olive.global.product-trust-badges",
                          index,
                        )
                      : {})}
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

            {hasDetails || showShippingRow || showReturnsRow ? (
              <div
                className="olive-reveal-item"
                style={{ "--i": 3 } as CSSProperties}
              >
                <OliveAccordion className="mt-1">
                  {hasDetails ? (
                    <OliveAccordionItem
                      headingLevel={2}
                      id="details"
                      title="Details"
                      defaultOpen
                    >
                      <TiptapRenderer
                        content={details}
                        className={PROSE_CLASS}
                      />
                    </OliveAccordionItem>
                  ) : null}

                  {showShippingRow ? (
                    <div {...sectionGroupAttr("product", "shipping")}>
                      <OliveAccordionItem
                        headingLevel={2}
                        id="shipping"
                        title="Shipping"
                      >
                        {shippingText ? (
                          <p
                            {...fieldAttr(
                              "olive.global.product-shipping-description",
                            )}
                          >
                            {shippingText}
                          </p>
                        ) : null}
                        {hasShippingPolicy ? (
                          <Link
                            href="/shipping-policy"
                            className="mt-3 inline-block underline"
                            style={{
                              color: "var(--olive-leaf)",
                              textDecorationColor: "var(--olive-sage-bright)",
                              textUnderlineOffset: "5px",
                            }}
                          >
                            Read the full shipping policy
                          </Link>
                        ) : null}
                      </OliveAccordionItem>
                    </div>
                  ) : null}

                  {showReturnsRow ? (
                    <div {...sectionGroupAttr("product", "returns")}>
                      <OliveAccordionItem
                        headingLevel={2}
                        id="returns"
                        title="Returns"
                      >
                        {returnsText ? (
                          <p
                            {...fieldAttr(
                              "olive.global.product-returns-description",
                            )}
                          >
                            {returnsText}
                          </p>
                        ) : null}
                        {hasRefundPolicy ? (
                          <Link
                            href="/refund-policy"
                            className="mt-3 inline-block underline"
                            style={{
                              color: "var(--olive-leaf)",
                              textDecorationColor: "var(--olive-sage-bright)",
                              textUnderlineOffset: "5px",
                            }}
                          >
                            Read the full returns policy
                          </Link>
                        ) : null}
                      </OliveAccordionItem>
                    </div>
                  ) : null}
                </OliveAccordion>
              </div>
            ) : null}

            {showQuestionsRow ? (
              <div
                className="olive-reveal-item"
                style={{ "--i": 4 } as CSSProperties}
                {...sectionGroupAttr("product", "questions")}
              >
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
              </div>
            ) : null}
          </OliveRevealGroup>
        </div>
      </div>

      {/* Reviews — only mounts (and only fires review queries) when the
          reviews feature flag is enabled for this business. */}
      {reviewsEnabled ? (
        <section
          aria-label="Reviews"
          className="pt-12 pb-16 md:pt-16 md:pb-24"
          style={{ borderTop: "1px solid var(--olive-hairline)" }}
        >
          <OliveReveal threshold={0}>
            {reviewsHeading ? (
              <h2
                className="olive-h2 mb-8"
                {...fieldAttr("olive.global.product-reviews-heading")}
              >
                {reviewsHeading}
              </h2>
            ) : null}
            <ProductReviews
              productId={product.id}
              onWriteReviewClick={() => setReviewDialogOpen(true)}
            />
            <WriteReviewDialog
              productId={product.id}
              productName={product.name}
              isOpen={reviewDialogOpen}
              onClose={() => setReviewDialogOpen(false)}
              onSuccess={() => setReviewDialogOpen(false)}
            />
          </OliveReveal>
        </section>
      ) : null}

      {relatedProducts.length > 0 ? (
        <section
          aria-labelledby="olive-related-heading"
          className="pt-12 pb-16 md:pt-16 md:pb-24"
          style={{ borderTop: "1px solid var(--olive-hairline)" }}
          {...sectionGroupAttr("product", "details")}
        >
          {/* The grid below deals its cards in, so without this the heading
              would arrive after the row it labels. Wrapped here rather than
              inside OliveSectionHeading, which is already used *inside*
              reveal blocks elsewhere — nesting a reveal in a reveal double
              delays and can strand content at opacity 0. */}
          <OliveReveal>
            <OliveSectionHeading
              id="olive-related-heading"
              heading={relatedHeading}
              headingFieldKey="olive.global.product-related-heading"
              link={{ label: relatedLinkLabel, href: "/shop" }}
              linkFieldKey="olive.global.product-related-link-label"
              className="mb-8"
            />
          </OliveReveal>
          <OliveProductGrid
            products={relatedProducts}
            columns={4}
            emptyHeading={relatedEmptyText}
            emptyHeadingFieldKey="olive.global.product-related-empty"
          />
        </section>
      ) : null}
    </div>
  );
}
