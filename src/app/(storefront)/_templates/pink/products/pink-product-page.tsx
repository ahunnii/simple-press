import Image from "next/image";
import Link from "next/link";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { parseTemplateListRows } from "~/lib/template-fields";
import { ANALYTICS_EVENTS } from "~/lib/umami/track";
import { formatPrice } from "~/lib/prices";
import { isSectionVisible } from "~/lib/sp-meta";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { TrackView } from "~/components/analytics/track-view";
import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { resolveFields } from "../index";
import { PinkAccordion } from "../shared/pink-accordion";
import { PinkDarkBand } from "../shared/pink-dark-band";
import { PinkEyebrow } from "../shared/pink-eyebrow";
import { PinkImageFallback } from "../shared/pink-image-fallback";
import type { PinkStat } from "../shared/pink-stat-tiles";
import { PinkStatTiles } from "../shared/pink-stat-tiles";
import { PinkProductCard } from "../shared/pink-product-card";
import { PinkProductActions } from "./pink-product-actions";
import { PinkProductGallery } from "./pink-product-gallery";
import { PinkProductReviewsSection } from "./pink-product-reviews";

const FIELD_KEYS = [
  "pink.global.product-story-image",
  "pink.global.product-story-eyebrow",
  "pink.global.product-story-heading",
  "pink.global.product-story-body",
  "pink.global.product-related-heading",
  "pink.global.product-related-link-label",
  "pink.global.product-question",
];

const DEFAULT_PANELS: TemplateListRow[] = [
  {
    _id: "default-panel-1",
    title: "Care & keeping",
    body: "Keep out of direct sun and away from damp. Spot clean only — a dry cloth handles most dust.",
  },
  {
    _id: "default-panel-2",
    title: "Shipping & returns",
    body: "Ships in 3–5 days, boxed by hand. Each piece is one of one, so returns are accepted only if something arrives damaged.",
  },
  {
    _id: "default-panel-3",
    title: "Commissions",
    body: "Want something close to this but not quite? Reach out — most commissions take 2–4 weeks.",
  },
];

const DEFAULT_STATS: PinkStat[] = [
  { _id: "default-stat-1", value: "1 of 1", label: "Editions" },
  { _id: "default-stat-2", value: "100%", label: "Hand sewn" },
  { _id: "default-stat-3", value: "3–5 days", label: "To ship" },
];

/** `Product.additionalFields.productSpecs` — label/value pairs (design.md → Product → "Details"). */
function parseProductSpecs(raw: unknown): { label: string; value: string }[] {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return [];
  const specs = (raw as Record<string, unknown>).productSpecs;
  if (!Array.isArray(specs)) return [];
  const out: { label: string; value: string }[] = [];
  for (const row of specs) {
    if (row == null || typeof row !== "object") continue;
    const label = (row as Record<string, unknown>).label;
    const value = (row as Record<string, unknown>).value;
    if (typeof label === "string" && typeof value === "string") {
      out.push({ label, value });
    }
  }
  return out;
}

/**
 * Product page — design.md → "Per-page section concepts → Product".
 *
 * Gallery + Details are fully DB-driven (no fields, no section — see the
 * "Page key note"). `global.product-panels` / `-story` / `-related` are the
 * only fielded sections, declared `page: "global"` since product pages have
 * no editor tab of their own.
 */
export async function PinkProductPage({ product, business }: DefaultProductPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const [collectionLink, related] = await Promise.all([
    db.collectionProduct.findFirst({
      where: { productId: product.id, collection: { businessId: business.id } },
      select: { collection: { select: { name: true, slug: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    api.product.getRelated({ productId: product.id }),
  ]);
  const firstCollection = collectionLink?.collection ?? null;

  const additional = product.additionalFields as
    | { comingSoon?: boolean; productTagline?: string }
    | null;

  const specs = parseProductSpecs(product.additionalFields);

  const panelsRows = parseTemplateListRows(customFields?.["pink.global.product-panels"]);
  const panels = panelsRows.length > 0 ? panelsRows : DEFAULT_PANELS;

  const statsRows = parseTemplateListRows(customFields?.["pink.global.product-story-stats"]);
  const stats: PinkStat[] =
    statsRows.length > 0
      ? statsRows.map((row, i) => ({
          _id: typeof row._id === "string" ? row._id : `stat-${i}`,
          value: typeof row.value === "string" ? row.value : "",
          label: typeof row.label === "string" ? row.label : "",
        }))
      : DEFAULT_STATS;

  const panelsVisible = isSectionVisible(customFields, "pink", "global.product-panels");
  const storyVisible = isSectionVisible(customFields, "pink", "global.product-story");
  const relatedVisible = isSectionVisible(customFields, "pink", "global.product-related");

  return (
    <>
      <TrackView event={ANALYTICS_EVENTS.PRODUCT_VIEW} data={{ productId: product.id }} />

      {/* ── Breadcrumb ── */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 px-5 py-3.5 text-[13px] md:px-10"
        style={{ borderBottom: "1px solid var(--pink-line)" }}
      >
        <Link href="/" style={{ color: "var(--pink-subtle)" }}>
          Home
        </Link>
        <span aria-hidden="true" style={{ color: "var(--pink-line-strong)" }}>
          /
        </span>
        <Link href="/shop" style={{ color: "var(--pink-subtle)" }}>
          Shop
        </Link>
        {firstCollection && (
          <>
            <span aria-hidden="true" style={{ color: "var(--pink-line-strong)" }}>
              /
            </span>
            <Link href={`/collections/${firstCollection.slug}`} style={{ color: "var(--pink-subtle)" }}>
              {firstCollection.name}
            </Link>
          </>
        )}
        <span aria-hidden="true" style={{ color: "var(--pink-line-strong)" }}>
          /
        </span>
        <span className="max-w-[30ch] truncate" style={{ color: "var(--pink-ink)" }} aria-current="page">
          {product.name}
        </span>
      </nav>

      {/* ── Gallery + details ── */}
      <section className="px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto grid max-w-[1280px] gap-10 sm:grid-cols-2 sm:gap-12">
          <PinkProductGallery
            images={product.images}
            productName={product.name}
            badge={additional?.comingSoon ? { label: "Coming soon", tone: "ink" } : undefined}
          />

          <div className="flex flex-col gap-5">
            <PinkEyebrow tone="paper">{firstCollection?.name ?? "One of one"}</PinkEyebrow>

            <h1
              className="pink-display"
              style={{
                fontSize: "clamp(30px, 3.6vw, 48px)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {product.name}
            </h1>

            {additional?.productTagline && (
              <p className="text-[15px]" style={{ color: "var(--pink-muted)" }}>
                {additional.productTagline}
              </p>
            )}

            {product.description && (
              <p
                className="max-w-[52ch] text-[17px] leading-[1.7] whitespace-pre-line"
                style={{ color: "var(--pink-body)" }}
              >
                {product.description}
              </p>
            )}

            {specs.length > 0 && (
              <dl className="grid grid-cols-2 gap-[1px]" style={{ background: "var(--pink-line)", border: "1px solid var(--pink-line)" }}>
                {specs.map((spec, i) => (
                  <div key={`${spec.label}-${i}`} className="flex flex-col gap-1 px-4 py-3" style={{ background: "var(--pink-paper)" }}>
                    <dt className="pink-label">{spec.label}</dt>
                    <dd className="text-[14px] font-medium" style={{ color: "var(--pink-ink)" }}>
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <PinkProductActions product={product} />

            {f["pink.global.product-question"] && (
              <p className="text-[13px]" style={{ color: "var(--pink-subtle)" }}>
                <span {...fieldAttr("pink.global.product-question")}>
                  {f["pink.global.product-question"]}
                </span>{" "}
                <Link href="/contact" className="underline" style={{ color: "var(--pink-rose)" }}>
                  Ask us a question
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── global.product-panels ── */}
      {panelsVisible && (
        <section
          aria-labelledby="pink-product-panels-heading"
          className="border-t px-5 py-2 md:px-10"
          style={{ borderColor: "var(--pink-line)" }}
          {...sectionGroupAttr("global", "product-panels")}
        >
          <div className="mx-auto max-w-[760px]">
            {/* `PinkAccordion` triggers are h3; without an h2 the outline went
                h1 → h3 here (axe heading-order). Hidden, so the design is
                unchanged — the accordion is meant to read as a bare stack. */}
            <h2 id="pink-product-panels-heading" className="sr-only">
              Product details
            </h2>
            <PinkAccordion
              items={panels.map((row, i) => ({
                id: typeof row._id === "string" ? row._id : `panel-${i}`,
                title: typeof row.title === "string" ? row.title : "",
                content: typeof row.body === "string" ? row.body : "",
              }))}
              defaultOpenIndex={0}
            />
          </div>
        </section>
      )}

      {/* ── global.product-story ── */}
      {storyVisible && (
        <PinkDarkBand ariaLabel="How it's made" sectionAttrs={sectionGroupAttr("global", "product-story")}>
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-14">
            {/* Unset → a designed dark-surface fallback (review 2026-07-29,
                P1) rather than an empty ink-tint void. A light placeholder
                slab here reads as a broken image on the dark band. */}
            <div className="relative aspect-square overflow-hidden">
              {f["pink.global.product-story-image"] ? (
                <Image
                  src={f["pink.global.product-story-image"]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 45vw"
                />
              ) : (
                <PinkImageFallback surface="dark" aspect="1 / 1" />
              )}
            </div>
            <div className="flex flex-col gap-4">
              <PinkEyebrow tone="dark" fieldKey="pink.global.product-story-eyebrow">
                {f["pink.global.product-story-eyebrow"] ?? ""}
              </PinkEyebrow>
              <h2
                className="pink-display"
                style={{ fontSize: "clamp(26px, 2.8vw, 38px)", fontWeight: 600, letterSpacing: "-0.025em" }}
                {...fieldAttr("pink.global.product-story-heading")}
              >
                {f["pink.global.product-story-heading"] ?? ""}
              </h2>
              <p
                className="max-w-[56ch] text-[16px] leading-[1.7]"
                style={{ color: "var(--pink-ink-body)" }}
                {...fieldAttr("pink.global.product-story-body")}
              >
                {f["pink.global.product-story-body"] ?? ""}
              </p>
              <PinkStatTiles stats={stats} columns={4} className="mt-2" />
            </div>
          </div>
        </PinkDarkBand>
      )}

      {/* ── Reviews — flag-gated, no fields (see pink-product-reviews.tsx) ── */}
      <PinkProductReviewsSection productId={product.id} productName={product.name} />

      {/* ── global.product-related ── */}
      {relatedVisible && related.length > 0 && (
        <section
          aria-label="Related products"
          className="px-5 py-16 md:px-10"
          {...sectionGroupAttr("global", "product-related")}
        >
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2
                className="pink-display"
                style={{ fontSize: "clamp(24px, 2.6vw, 32px)", fontWeight: 600, letterSpacing: "-0.02em" }}
                {...fieldAttr("pink.global.product-related-heading")}
              >
                {f["pink.global.product-related-heading"] ?? ""}
              </h2>
              <Link
                href="/shop"
                className="shrink-0 text-[14px] font-medium"
                style={{ color: "var(--pink-rose)" }}
                {...fieldAttr("pink.global.product-related-link-label")}
              >
                {f["pink.global.product-related-link-label"] ?? ""}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {related.slice(0, 4).map((p) => (
                <PinkProductCard
                  key={p.id}
                  href={`/shop/${p.slug}`}
                  imageUrl={p.images[0]?.url}
                  imageAlt={p.name}
                  title={p.name}
                  price={formatPrice(p.variants[0]?.price ?? p.price)}
                  wishlist={{
                    productId: p.id,
                    slug: p.slug,
                    rawPrice: p.variants[0]?.price ?? p.price,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
