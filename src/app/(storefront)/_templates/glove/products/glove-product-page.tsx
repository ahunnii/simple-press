import Link from "next/link";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { GloveAddOn, GloveAddOnSource } from "./glove-addons";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { parseCardAdditionalFields } from "~/lib/products";
import { isSectionVisible } from "~/lib/sp-meta";
import { isContentEmpty } from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { db } from "~/server/db";
import { TrackView } from "~/components/analytics/track-view";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav/nav-flags";

import { resolveFields } from "..";
import {
  GloveBreadcrumb,
  GloveContainer,
  GloveNotice,
  GloveReveal,
} from "../shared";
import { toGloveAddOn } from "./glove-addons";
import { GloveBuyBox } from "./glove-buy-box";
import { optionDisplayName, variantOptionGroups } from "./glove-color";
import { isGloveMadeToOrder, showGloveEasyGuide } from "./glove-pdp-rules";
import { GloveProductGallery } from "./glove-product-gallery";
import { GloveProductReviews } from "./glove-product-reviews";
import { GloveRelatedProducts } from "./glove-related-products";
import { visibleSpecGroups } from "./glove-steps";
import { GLOVE_PRODUCT_FIELD_KEYS } from "./index";

const ADDON_PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  sku: true,
  trackInventory: true,
  allowBackorders: true,
  inventoryQty: true,
  baseUnitsConsumed: true,
  additionalFields: true,
  images: {
    select: { url: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
  variants: {
    select: {
      id: true,
      name: true,
      price: true,
      compareAtPrice: true,
      inventoryQty: true,
      imageUrl: true,
      sku: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  baseInventoryUnit: {
    select: { inventoryQty: true, allowBackorders: true },
  },
};

/** Tiptap prose on glove tokens: Poppins headings, Lato body, purple links. */
const PROSE_CLASS = [
  "prose max-w-none text-[15px] leading-[1.7]",
  "prose-p:text-[var(--glove-text)] prose-li:text-[var(--glove-text)]",
  "[&_:is(h2,h3,h4)]:[font-family:var(--glove-font-display)] prose-headings:font-medium prose-headings:text-[var(--glove-ink)]",
  "prose-strong:text-[var(--glove-ink)]",
  "prose-a:text-[var(--glove-primary)] prose-a:underline-offset-2",
  "prose-hr:border-[var(--glove-line)] marker:text-[var(--glove-primary)]",
].join(" ");

/**
 * GloveProductPage — the signature PDP (design.md "Product").
 *
 * Server half: resolves the owner's copy, decides whether this product is a
 * made-to-order glove (member of the `notice-collection-slug` collection),
 * and loads the chain/charm add-ons with one tenant-scoped query. The buy
 * column from the price down is the client `GloveBuyBox` (useProduct).
 * Order: breadcrumb → gallery | title, price, notice, short description,
 * attribute table, Easy Guide banner (gloves only, right above the options
 * it explains), numbered options, add-on picker, qty + ADD TO CART,
 * wishlist + category/SKU line, support rows → description → reviews →
 * related products. On phones the column stacks under the gallery; with the
 * banner out of the way the title and price sit in the first viewport.
 */
export async function GloveProductPage({
  product,
  business,
  productPolicies,
}: DefaultProductPageTemplateProps) {
  // `business` carries the visual editor's preview draft; the product's own
  // business relation is the fallback.
  const customFields =
    business.siteContent?.customFields ??
    product.business?.siteContent?.customFields;
  const f = resolveFields(customFields, GLOVE_PRODUCT_FIELD_KEYS);
  const get = (key: string) => f[key] ?? "";
  const { isEnabled } = await getBusinessFlags();

  const noticeSlug = get("glove.product.notice-collection-slug").trim();
  const chainsSlug = get("glove.product.chains-collection-slug").trim();
  const charmsSlug = get("glove.product.charms-collection-slug").trim();

  const memberships = await db.collectionProduct.findMany({
    where: { productId: product.id, collection: { businessId: business.id } },
    select: {
      collection: { select: { name: true, slug: true, published: true } },
    },
    orderBy: { collection: { sortOrder: "asc" } },
  });

  const madeToOrder = isGloveMadeToOrder(
    noticeSlug,
    memberships.map((m) => m.collection.slug),
  );
  const categories = memberships
    .filter((m) => m.collection.published)
    .map((m) => ({ name: m.collection.name, slug: m.collection.slug }));

  // ── Add-ons: one query for both collections, own product excluded ──────
  const showAddOns =
    madeToOrder &&
    isSectionVisible(customFields, "glove", "product.addons") &&
    (chainsSlug !== "" || charmsSlug !== "");
  let addOns: { chains: GloveAddOn[]; charms: GloveAddOn[] } | null = null;
  if (showAddOns) {
    const rows = await db.collection.findMany({
      where: {
        businessId: business.id,
        published: true,
        slug: { in: [chainsSlug, charmsSlug].filter((s) => s !== "") },
      },
      select: {
        slug: true,
        collectionProducts: {
          where: {
            product: { published: true },
            productId: { not: product.id },
          },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          select: { product: { select: ADDON_PRODUCT_SELECT } },
        },
      },
    });
    const pick = (slug: string): GloveAddOn[] =>
      slug === ""
        ? []
        : (rows
            .find((r) => r.slug === slug)
            ?.collectionProducts.map((cp) =>
              toGloveAddOn(cp.product as GloveAddOnSource),
            ) ?? []);
    addOns = { chains: pick(chainsSlug), charms: pick(charmsSlug) };
  }

  // ── Copy ────────────────────────────────────────────────────────────────
  const guideText = get("glove.product.guide-text");
  const guideLabel = get("glove.product.guide-link-label");
  const guideHrefRaw = get("glove.product.guide-link");
  const guideFlag = navHrefOffFlag(guideHrefRaw, isEnabled);
  const guideHref =
    guideFlag === null || isEnabled(guideFlag) ? guideHrefRaw : "";
  const showGuide = showGloveEasyGuide({
    madeToOrder,
    sectionVisible: isSectionVisible(customFields, "glove", "product.guide"),
    text: guideText,
  });

  // The seeded copy opens with "PLEASE NOTE:"; the panel's own label says it.
  const noticeText = get("glove.product.notice-text")
    .replace(/^\s*please note\s*[:\-–—]?\s*/i, "")
    .trim();
  const additional = parseCardAdditionalFields(product.additionalFields);
  const excerpt = product.excerpt?.trim() ?? "";
  const description = product.description?.trim() ?? "";
  const shortDescription = excerpt !== "" ? excerpt : description;
  const rich = additional.additionalInformation as TiptapJSON | undefined;
  const hasRich = rich !== undefined && !isContentEmpty(rich);
  const longPlain = excerpt !== "" ? description : "";
  const descriptionHeading = get("glove.product.description-heading");

  // A dimension that has its own selector in the buy box (every one, unless
  // the product is "coming soon") is not repeated in the spec table.
  const selectorsShown =
    product.variants.length > 0 && additional.comingSoon !== true;
  const allOptionGroups = variantOptionGroups(product.variants);
  const optionGroups = visibleSpecGroups(
    allOptionGroups,
    selectorsShown ? allOptionGroups.map((group) => group.key) : [],
  );

  // ── Support rows (B6.2) ────────────────────────────────────────────────
  const shippingSummary = get("glove.product.shipping-summary").trim();
  const returnsSummary = get("glove.product.returns-summary").trim();
  const questionText = get("glove.product.question-text").trim();
  const hasShippingPolicy = productPolicies?.hasShippingPolicy ?? false;
  const hasRefundPolicy = productPolicies?.hasRefundPolicy ?? false;
  const showShipping =
    isSectionVisible(customFields, "glove", "product.shipping") &&
    (shippingSummary !== "" || hasShippingPolicy);
  const showReturns =
    isSectionVisible(customFields, "glove", "product.returns") &&
    (returnsSummary !== "" || hasRefundPolicy);
  const showQuestions =
    isSectionVisible(customFields, "glove", "product.questions") &&
    questionText !== "";

  const intro = (
    <>
      {madeToOrder && noticeText.trim() !== "" ? (
        <GloveNotice fieldKey="glove.product.notice-text" label="Please note">
          {noticeText}
        </GloveNotice>
      ) : null}
      {shortDescription ? (
        <p className="m-0 text-[15px] leading-[1.7] whitespace-pre-line text-[var(--glove-text)]">
          {shortDescription}
        </p>
      ) : null}
      {optionGroups.length > 0 ? (
        <table className="w-full border-collapse text-[13px]">
          <caption className="sr-only">Available options</caption>
          <tbody>
            {optionGroups.map((group) => (
              <tr
                key={group.key}
                className="border-b border-[var(--glove-line)] first:border-t"
              >
                <th
                  scope="row"
                  className="glove-display py-3 pr-4 text-left font-medium text-[var(--glove-ink)]"
                >
                  {optionDisplayName(group.key)}
                </th>
                <td className="py-3 text-right text-[var(--glove-muted)]">
                  {group.values.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {showGuide ? (
        <aside
          aria-label="Easy Guide"
          className="rounded-[var(--glove-radius-card)] border border-[var(--glove-mist-line)] bg-[var(--glove-mist)] px-4 py-3.5 text-[15px] leading-snug text-[var(--glove-primary)] md:px-5 md:text-[16px]"
          {...sectionGroupAttr("product", "guide")}
        >
          <span {...fieldAttr("glove.product.guide-text")}>{guideText}</span>{" "}
          {guideLabel && guideHref ? (
            <>
              <Link
                href={guideHref}
                className="font-bold underline decoration-[var(--glove-primary-tint)] decoration-2 underline-offset-4 transition-colors hover:decoration-[var(--glove-primary)]"
                {...fieldAttr("glove.product.guide-link-label")}
              >
                {guideLabel}
              </Link>
              !
            </>
          ) : null}
        </aside>
      ) : null}
    </>
  );

  return (
    <div className="pt-6 pb-[var(--glove-section-pad-y)] md:pt-10">
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />
      <GloveContainer className="flex flex-col gap-8 md:gap-10">
        <div className="border-b border-[var(--glove-line)] pb-4">
          <GloveBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Shop", href: "/shop" },
              { label: product.name },
            ]}
          />
        </div>

        <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-12">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <GloveProductGallery
              images={product.images}
              productName={product.name}
            />
          </div>

          <div
            className="flex min-w-0 flex-col gap-4"
            {...sectionGroupAttr("product", "details")}
          >
            <h1 className="glove-body m-0 text-[clamp(26px,3vw,30px)] leading-tight font-normal text-[var(--glove-ink)]">
              {product.name}
            </h1>
            {additional.productTagline ? (
              <p className="m-0 -mt-2 text-[15px] text-[var(--glove-muted)]">
                {additional.productTagline}
              </p>
            ) : null}

            <GloveBuyBox
              product={product}
              numbered={madeToOrder}
              intro={intro}
              addOns={addOns}
              addOnSectionAttrs={sectionGroupAttr("product", "addons")}
              categories={categories}
              linkCategories={isEnabled("collections")}
              cartEnabled={isEnabled("cart")}
              copy={{
                addToCart: get("glove.product.add-to-cart-label"),
                unavailable: get("glove.product.unavailable-text"),
                notify: get("glove.product.notify-text"),
                comingSoonHeading: get("glove.product.coming-soon-heading"),
                comingSoonBody: get("glove.product.coming-soon-body"),
                addOns: {
                  heading: get("glove.product.addons-heading"),
                  helper: get("glove.product.addons-helper"),
                  chainLabel: get("glove.product.chain-label"),
                  noChainLabel: get("glove.product.no-chain-label"),
                  charmsLabel: get("glove.product.charms-label"),
                  charmsLimit: get("glove.product.charms-limit-text"),
                  gloveLine: get("glove.product.glove-line-label"),
                  charmLine: get("glove.product.charm-line-label"),
                  totalLine: get("glove.product.total-label"),
                },
              }}
            />

            {showShipping || showReturns || showQuestions ? (
              <div className="flex flex-col divide-y divide-[var(--glove-line)] border-b border-[var(--glove-line)] text-[14px]">
                {showShipping ? (
                  <SupportRow
                    title="Shipping"
                    sectionAttrs={sectionGroupAttr("product", "shipping")}
                    note={shippingSummary}
                    noteKey="glove.product.shipping-summary"
                    policyHref={hasShippingPolicy ? "/shipping-policy" : null}
                    policyLabel="Read the full shipping policy"
                  />
                ) : null}
                {showReturns ? (
                  <SupportRow
                    title="Returns"
                    sectionAttrs={sectionGroupAttr("product", "returns")}
                    note={returnsSummary}
                    noteKey="glove.product.returns-summary"
                    policyHref={hasRefundPolicy ? "/refund-policy" : null}
                    policyLabel="Read the full returns policy"
                  />
                ) : null}
                {showQuestions ? (
                  <p
                    className="m-0 py-3"
                    {...sectionGroupAttr("product", "questions")}
                  >
                    <Link
                      href="/contact"
                      className="font-bold text-[var(--glove-primary)] underline underline-offset-4"
                      {...fieldAttr("glove.product.question-text")}
                    >
                      {questionText}
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {hasRich || longPlain ? (
          <GloveReveal>
            <section
              aria-labelledby="glove-description-heading"
              className="border-t border-[var(--glove-line)] pt-10 md:pt-12"
            >
              <h2
                id="glove-description-heading"
                className="glove-body m-0 mb-3 text-[24px] font-normal text-[var(--glove-ink)]"
                {...fieldAttr("glove.product.description-heading")}
              >
                {descriptionHeading}
              </h2>
              {hasRich && rich ? (
                <TiptapRenderer content={rich} className={PROSE_CLASS} />
              ) : (
                <p className="m-0 max-w-[75ch] text-[15px] leading-[1.7] whitespace-pre-line text-[var(--glove-text)]">
                  {longPlain}
                </p>
              )}
            </section>
          </GloveReveal>
        ) : null}

        <GloveProductReviews
          productId={product.id}
          productName={product.name}
          heading={get("glove.product.reviews-heading")}
          prompt={get("glove.product.review-prompt")}
          body={get("glove.product.review-body")}
          buttonLabel={get("glove.product.review-button-label")}
        />

        <GloveRelatedProducts
          productId={product.id}
          heading={get("glove.product.related-heading")}
        />
      </GloveContainer>
    </div>
  );
}

function SupportRow({
  title,
  sectionAttrs,
  note,
  noteKey,
  policyHref,
  policyLabel,
}: {
  title: string;
  sectionAttrs: Record<string, string>;
  note: string;
  noteKey: string;
  policyHref: string | null;
  policyLabel: string;
}) {
  return (
    <div className="py-3" {...sectionAttrs}>
      <h2 className="glove-display m-0 text-[14px] font-medium text-[var(--glove-ink)]">
        {title}
      </h2>
      {note ? (
        <p
          className="m-0 mt-1 leading-relaxed whitespace-pre-line text-[var(--glove-text)]"
          {...fieldAttr(noteKey)}
        >
          {note}
        </p>
      ) : null}
      {policyHref ? (
        <Link
          href={policyHref}
          className="mt-1 inline-block font-bold text-[var(--glove-primary)] underline underline-offset-4"
        >
          {policyLabel}
        </Link>
      ) : null}
    </div>
  );
}
