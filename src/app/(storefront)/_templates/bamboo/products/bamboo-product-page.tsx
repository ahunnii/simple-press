"use client";

import type { CSSProperties } from "react";
import { useEffect } from "react";
import Link from "next/link";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { BambooGlyphId } from "../shared/bamboo-glyph";
import type { Product } from "~/types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { TrackView } from "~/components/analytics/track-view";
import { ProductDetailsAdditionalInfoTabs } from "~/app/(storefront)/_components/product-page/additional-info-tabs";

import { resolveFields } from "..";
import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooHorizontalProductCard } from "../shared/bamboo-product-card";
import { BambooReveal } from "../shared/bamboo-reveal";
import { DEFAULT_WHY_STRIP_BENEFITS } from "../shop";
import { BambooProductActions } from "./bamboo-product-actions";
import { BambooProductGallery } from "./bamboo-product-gallery";

/** Leaf-glyph cycle for the trust row and description-note markers — same
 * three tones the mockup cycles through for its `.claims` list. */
const LEAF_CYCLE: BambooGlyphId[] = ["s-leaf-d", "s-leaf", "s-leaf-l"];

export function BambooProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    displayCompareAtPrice,
    additionalFields,
    displayTrustBadges,
    isOnSale,
    inStock,
    remainingStock,
    isInventoryTracked,
  } = useProduct(product);

  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "bamboo.products.reassurance-heading",
    "bamboo.products.reassurance-body",
    "bamboo.products.reassurance-button-text",
    "bamboo.products.reassurance-button-link",
  ]);
  // Product-data-first: when this product has its own
  // `additionalFields.productFeatures` claims (`useProduct`'s
  // `displayTrustBadges`), those win over the shared `why-strip-list`
  // field — only the label text is kept, since the trust row always
  // renders in the leaf-glyph presentation (LEAF_CYCLE below), never the
  // DB-selected Lucide icon.
  const benefits: { label: string }[] =
    displayTrustBadges.length > 0
      ? displayTrustBadges.map((badge) => ({ label: badge.label }))
      : (parseTemplateTrustBadgesListRows(
          getListFieldValue(customFields, "bamboo.products.why-strip-list"),
          DEFAULT_WHY_STRIP_BENEFITS,
        ) ?? DEFAULT_WHY_STRIP_BENEFITS);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [product.slug]);

  const stockLine = !inStock
    ? "Out of stock"
    : isInventoryTracked && remainingStock > 0
      ? `In stock — ${remainingStock} available`
      : "In stock";

  return (
    // flex column + flex-1 so this root grows to fill <main> (a column flex
    // container) and the trailing pine BambooEdge's mt-auto can pin to the
    // bottom instead of leaving a strip of paper above the footer.
    <div className="flex flex-1 flex-col bg-[var(--bamboo-paper)]">
      <TrackView
        event={ANALYTICS_EVENTS.PRODUCT_VIEW}
        data={{ productId: product.id }}
      />

      {/* ===== 1. breadcrumb ===== */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto w-[min(1200px,calc(100%-48px))] pt-[26px]"
      >
        <ol className="m-0 flex flex-wrap items-center gap-[0.55rem] p-0 text-[0.93rem] text-[var(--bamboo-muted)]">
          <li>
            <Link
              href="/shop"
              className="text-[var(--bamboo-pine)] no-underline hover:underline"
            >
              Shop
            </Link>
          </li>
          <li aria-hidden="true" className="text-[var(--bamboo-muted)]">
            /
          </li>
          <li>
            <span aria-current="page" className="text-[var(--bamboo-ink-soft)]">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      {/* ===== 2. purchase ===== */}
      <section className="mx-auto w-[min(1200px,calc(100%-48px))] pt-[clamp(18px,2vw,30px)] pb-[clamp(52px,6vw,88px)]">
        <div className="grid grid-cols-1 gap-[clamp(30px,4.4vw,72px)] lg:grid-cols-[1.02fr_0.98fr]">
          {/* No outer BambooReveal here — the gallery is `lg:sticky`, and a
              transformed ancestor (the reveal's pre-`.in` translateY) would
              disrupt sticky's containing-block math. BambooProductGallery
              wraps its OWN inner frame/thumbnails in BambooReveal instead
              (matches the mockup's `.gal-wrap.reveal`/`.thumbs.reveal`
              nesting). */}
          <BambooProductGallery
            images={product.images}
            productName={product.name}
          />

          <BambooReveal style={{ "--rd": "60ms" } as CSSProperties}>
            <div className="flex items-center gap-[18px]">
              <BambooGlyph
                id="s-wreath"
                className="h-auto w-[70px] flex-none max-[900px]:w-[52px]"
              />
              <h1 className="font-heading max-w-[16ch] text-[clamp(2rem,3.4vw,2.85rem)] leading-[1.08] font-bold tracking-[-0.026em] text-[var(--bamboo-pine)]">
                {product.name}
              </h1>
            </div>

            {additionalFields?.productTagline ? (
              <p className="mt-2 text-lg font-light text-[var(--bamboo-ink-soft)]">
                {additionalFields.productTagline}
              </p>
            ) : null}

            <p className="mt-5 flex flex-wrap items-baseline gap-[0.6rem]">
              <span className="text-[0.8rem] font-medium tracking-[0.1em] text-[var(--bamboo-muted)] uppercase">
                From
              </span>
              <b className="font-heading text-[2.15rem] leading-none font-bold tracking-[-0.022em] text-[var(--bamboo-ink)]">
                {formatPrice(displayPrice)}
              </b>
              {isOnSale && displayCompareAtPrice ? (
                <span className="text-lg text-[var(--bamboo-muted)] line-through">
                  <span className="sr-only">Original price: </span>
                  {formatPrice(displayCompareAtPrice)}
                </span>
              ) : null}
            </p>
            {/* Variant products get their stock signal from the variant
                selector (per-variant count under the purchase row, sold-out
                pills): this page-level line comes from a separate useProduct
                instance that never learns about a pill switch, so it would
                freeze on the first variant. Simple products keep it. */}
            {product.variants.length === 0 && (
              <p className="mt-2.5 flex items-center gap-2 text-[0.92rem] text-[var(--bamboo-muted)]">
                <i
                  aria-hidden="true"
                  className={cn(
                    "h-[9px] w-[9px] flex-none rounded-full",
                    inStock
                      ? "bg-[var(--bamboo-ill-leaf-mid)]"
                      : "bg-[var(--bamboo-terracotta-deep)]",
                  )}
                />
                {stockLine}
              </p>
            )}

            <div className="mt-7">
              <BambooProductActions product={product} business={business} />
            </div>

            {benefits.length > 0 ? (
              <ul className="mt-7 grid list-none grid-cols-2 gap-x-[22px] gap-y-[13px] p-0">
                {benefits.map((benefit, i) => (
                  <li
                    key={`${benefit.label}-${i}`}
                    className="flex items-center gap-[0.55rem] text-[0.96rem] text-[var(--bamboo-ink-soft)]"
                  >
                    <BambooGlyph
                      id={LEAF_CYCLE[i % LEAF_CYCLE.length] ?? "s-leaf"}
                      className="h-auto w-[23px] flex-none"
                    />
                    {benefit.label}
                  </li>
                ))}
              </ul>
            ) : null}

            {product.description ? (
              <p className="mt-7 max-w-[60ch] leading-relaxed whitespace-pre-line text-[var(--bamboo-ink-soft)]">
                {product.description}
              </p>
            ) : null}

            <ProductDetailsAdditionalInfoTabs
              product={product}
              includeCard={false}
              styleProps={{
                tabsClassName:
                  "mt-10 border-t border-[var(--bamboo-outline)] pt-2",
                tabsListClassName:
                  "mx-0 h-auto justify-start gap-[30px] bg-transparent p-0",
                tabsTriggerClassName:
                  "font-heading h-auto rounded-none border-0 bg-transparent px-0.5 py-[15px] text-[1.02rem] font-semibold text-[var(--bamboo-muted)] shadow-none after:bottom-0 after:h-[3px] after:rounded-[2px] after:bg-[var(--bamboo-pine)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--bamboo-pine)] data-[state=active]:shadow-none",
                contentClassName:
                  "mt-[22px] max-w-[60ch] leading-relaxed whitespace-pre-line text-[var(--bamboo-ink-soft)]",
              }}
            />
          </BambooReveal>
        </div>
      </section>

      <BambooEdge from="paper" to="sage" variant="b" />

      {/* ===== 3. reassurance ===== */}
      <section
        {...sectionGroupAttr("products", "detail")}
        aria-labelledby="bamboo-pdp-detail-h"
        className="relative overflow-hidden bg-[var(--bamboo-sage)] py-[clamp(46px,5.4vw,78px)]"
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <span
            className="bamboo-el bamboo-el--b bamboo-pdp-stalk"
            style={
              {
                "--w": "196px",
                "--l": "93%",
                "--b": "-168px",
                "--d": ".24s",
              } as CSSProperties
            }
          >
            <span
              className="bamboo-tilt"
              style={{ "--rz": "-4deg" } as CSSProperties}
            >
              <span
                className="bamboo-sway"
                style={
                  {
                    "--dur": "8.6s",
                    "--dl": "-2.7s",
                    "--a1": "-1.2deg",
                    "--a2": "1deg",
                  } as CSSProperties
                }
              >
                <BambooGlyph id="s-culm-tan" />
              </span>
            </span>
          </span>
          <span
            className="bamboo-drift bamboo-pdp-leaf-a"
            style={
              {
                "--l": "6%",
                "--t": "5%",
                "--w": "27px",
                "--dur": "17s",
                "--dl": "-3s",
                "--dx": "80px",
                "--dy": "330px",
                "--dr": "170deg",
              } as CSSProperties
            }
          >
            <BambooGlyph id="s-leaf" />
          </span>
          <span
            className="bamboo-drift bamboo-pdp-leaf-b"
            style={
              {
                "--l": "38%",
                "--t": "2%",
                "--w": "23px",
                "--dur": "20s",
                "--dl": "-11s",
                "--dx": "-60px",
                "--dy": "360px",
                "--dr": "-160deg",
              } as CSSProperties
            }
          >
            <BambooGlyph id="s-leaf-d" />
          </span>
          <span
            className="bamboo-drift bamboo-m-hide"
            style={
              {
                "--l": "62%",
                "--t": "9%",
                "--w": "25px",
                "--dur": "18.5s",
                "--dl": "-7s",
                "--dx": "70px",
                "--dy": "300px",
                "--dr": "190deg",
              } as CSSProperties
            }
          >
            <BambooGlyph id="s-leaf-l" />
          </span>
        </div>

        <div className="relative z-1 mx-auto grid w-[min(1200px,calc(100%-48px))] grid-cols-1 items-center gap-[clamp(32px,4.4vw,68px)] lg:grid-cols-2">
          <div className="flex items-start gap-4">
            <BambooGlyph id="s-truck" className="h-9 w-auto flex-none" />
            <div>
              <h2
                id="bamboo-pdp-detail-h"
                {...fieldAttr("bamboo.products.reassurance-heading")}
                className="font-heading text-[1.5rem] leading-[1.15] font-bold tracking-[-0.01em] text-[var(--bamboo-pine)]"
              >
                {f["bamboo.products.reassurance-heading"] ?? ""}
              </h2>
              <p
                {...fieldAttr("bamboo.products.reassurance-body")}
                className="mt-2 max-w-[42ch] text-[var(--bamboo-ink)]"
              >
                {f["bamboo.products.reassurance-body"] ?? ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3.5 lg:justify-end">
            <Link href="/shop" className="bamboo-btn bamboo-btn-ghost">
              Back to all products
            </Link>
            <Link
              href={f["bamboo.products.reassurance-button-link"] ?? "/contact"}
              className="bamboo-btn bamboo-btn-ghost"
            >
              <span {...fieldAttr("bamboo.products.reassurance-button-text")}>
                {f["bamboo.products.reassurance-button-text"] ?? ""}
              </span>
            </Link>
          </div>
        </div>
      </section>

      <BambooEdge from="sage" to="paper" variant="c" />

      {/* ===== 4. related products =====
          No mockup precedent for this rail (grep confirms
          mockup-b-product.elided.html never mentions "related"), so it was
          extrapolated from the other templates' shared `getRelated`
          contract. Deliberately NOT wrapped in `BambooReveal`/
          `BambooRevealGroup`: this is the last content section on the page,
          and a shopper who has scrolled this far has already scrolled it
          into view before any entrance animation would matter — rendering
          it plainly guarantees the rail is never left sitting in its
          pre-`.in` `opacity:0` state (the "renders nothing" runtime finding)
          regardless of viewport/IntersectionObserver timing this close to
          the end of the document. */}
      {/* The whole section (heading included) waits for the query — a bare
          "You Might Also Like" heading over nothing while the related query
          loads (or if it fails) was a runtime-QA finding. */}
      {relatedProducts ? (
        <section className="mx-auto w-[min(1200px,calc(100%-48px))] py-[clamp(46px,5.4vw,78px)]">
          <h2 className="font-heading text-[clamp(1.7rem,2.6vw,2.2rem)] font-bold text-[var(--bamboo-pine)]">
            You Might Also Like
          </h2>
          {relatedProducts.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {relatedProducts.map((p, index) => (
                <BambooHorizontalProductCard
                  key={p.id}
                  product={p as Product}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <p className="mt-8 text-center text-[var(--bamboo-ink-soft)]">
              No related products found
            </p>
          )}
        </section>
      ) : null}

      <BambooEdge from="paper" to="pine" variant="a" />
    </div>
  );
}
