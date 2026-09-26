import { Suspense } from "react";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";
import { NoiseCollectionCard } from "../shared/noise-collection-card";
import { NoiseCollectionClient } from "./noise-collection-client";

export function NoiseCollectionPage({
  collection,
  additionalCollections,
  business,
}: DefaultCollectionPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "noise.collections.detail-overline",
    "noise.collections.detail-empty-text",
    "noise.collections.detail-browse-text",
    "noise.collections.detail-back-label",
    "noise.collections.more-overline",
    "noise.collections.more-heading",
  ]);

  const detailOverline = f["noise.collections.detail-overline"] ?? "";
  const detailEmptyText = f["noise.collections.detail-empty-text"] ?? "";
  const detailBrowseText = f["noise.collections.detail-browse-text"] ?? "";
  const detailBackLabel = f["noise.collections.detail-back-label"] ?? "";
  const moreOverline = f["noise.collections.more-overline"] ?? "";
  const moreHeading = f["noise.collections.more-heading"] ?? "";

  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter(
      (p): p is NonNullable<typeof p> => p != null,
    ) as unknown as Product[];

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 6);

  return (
    <PageTransition>
      {/* ── Centered header — "Collection" overline + h1 + description ── */}
      <section
        className="px-6 pt-12 pb-14 text-center"
        style={{
          background: "var(--vn-paper)",
          borderBottom: "1px solid var(--vn-line-soft) ",
        }}
        {...sectionGroupAttr("collections", "detail")}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1440px" }}>
          <p
            className="mb-4 font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
            {...fieldAttr("noise.collections.detail-overline")}
          >
            {detailOverline}
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {collection.name}
          </h1>
          {collection.description && (
            <p
              className="mx-auto mt-6 font-sans leading-[1.85]"
              style={{
                fontSize: "15px",
                color: "var(--vn-ink-soft)",
                maxWidth: "56ch",
              }}
            >
              {collection.description}
            </p>
          )}
        </FadeIn>
      </section>

      {/* ── Products: sidebar filters + sort + grid (client) ── */}
      {products.length === 0 ? (
        <FadeIn
          className="px-7 py-24 text-center"
          style={{ background: "var(--vn-paper)" }}
        >
          <p
            className="font-serif text-2xl font-light italic"
            style={{ color: "var(--vn-steel-mist)" }}
            {...fieldAttr("noise.collections.detail-empty-text")}
          >
            {detailEmptyText}
          </p>
          <Link
            href="/shop"
            className="vn-stamp vn-stamp-solid mt-8 inline-flex text-[10px]"
            {...fieldAttr("noise.collections.detail-browse-text")}
          >
            {detailBrowseText}
          </Link>
        </FadeIn>
      ) : (
        <Suspense fallback={<div className="px-7 py-24 text-center" />}>
          <NoiseCollectionClient
            products={products}
            backHref="/collections"
            backLabel={detailBackLabel}
          />
        </Suspense>
      )}

      {/* ── More collections ── */}
      {others.length > 0 && (
        <section
          className="border-foreground border-t-2 px-7 pt-14 pb-14"
          style={{ background: "var(--vn-paper)" }}
        >
          <div className="mx-auto max-w-[1440px]">
            <FadeIn className="mb-10 flex items-end justify-between gap-6">
              <div>
                <p
                  className="mb-3 font-mono text-[9.5px] tracking-[0.22em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                  {...fieldAttr("noise.collections.more-overline")}
                >
                  {moreOverline}
                </p>
                <h2
                  className="font-serif leading-none tracking-tight italic"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    letterSpacing: "-0.02em",
                  }}
                  {...fieldAttr("noise.collections.more-heading")}
                >
                  {moreHeading}
                </h2>
              </div>
              <Link
                href="/collections"
                className="hidden items-center gap-3 font-mono text-[10px] tracking-[0.22em] uppercase transition-opacity hover:opacity-60 md:flex"
                style={{ color: "var(--vn-ink)" }}
              >
                All collections →
              </Link>
            </FadeIn>

            <StaggerContainer
              className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6"
              staggerDelay={0.05}
            >
              {others.map((col, i) => (
                <StaggerItem key={col.id}>
                  <NoiseCollectionCard
                    collection={col}
                    index={i}
                    aspect="4/5"
                    showNumber
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
