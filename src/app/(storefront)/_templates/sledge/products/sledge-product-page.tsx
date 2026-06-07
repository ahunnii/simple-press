"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import {
  getListFieldValue,
  isContentEmpty,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";
import { parseCardAdditionalFields } from "~/lib/products";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import {
  SLEDGE_PAGE_CONTAINER,
  SLEDGE_PROSE,
  SledgePageSection,
} from "../shared/sledge-page-layout";
import { SledgeProductRail } from "../shared/sledge-product-rail";
import { SledgeProductActions } from "./sledge-product-actions";

function ProductAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="sl-product-accordion group border-b border-[var(--sl-border)] py-5 first:border-t"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between select-none [&::-webkit-details-marker]:hidden">
        {title}
        <span
          aria-hidden="true"
          className="font-sans text-xl font-light text-[var(--sl-ink-soft)] transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="sl-eyebrow pt-3.5 font-sans text-sm leading-[1.7]">
        {children}
      </div>
    </details>
  );
}

export function SledgeProductPage({
  product,
  business,
}: DefaultProductPageTemplateProps) {
  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const {
    formatPrice,
    displayPrice,
    isOnSale,
    displayCompareAtPrice,
    additionalFields,
    displayTrustBadges,
  } = useProduct(product);

  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "additional">(
    "description",
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  useEffect(() => {
    setActiveImg(0);
    window.scrollTo(0, 0);
  }, [product.slug]);

  const isAdditionalEmpty = isContentEmpty(
    additionalFields?.additionalInformation as TiptapJSON,
  );

  const additional = parseCardAdditionalFields(product.additionalFields);

  const f = resolveFields(business?.siteContent?.customFields, [
    "sledge.global.product-shipping-description",
    "sledge.global.product-question-description",
    "sledge.global.product-care-instructions",
    "sledge.global.product-shipping-details",
    "sledge.global.shop-cta-text",
    "sledge.global.shop-cta-link",
  ]);

  const shopCtaText = f["sledge.global.shop-cta-text"] ?? "Browse Shop";
  const shopCtaHref = f["sledge.global.shop-cta-link"] ?? "/shop";

  const globalProductTrustBadges = parseTemplateTrustBadgesListRows(
    getListFieldValue(
      business?.siteContent?.customFields,
      "sledge.global.product-trust-badges",
    ),
    [],
  );

  type CollectionRef = {
    collection: { id: string; name: string; slug: string } | null;
  };
  const colProds = (
    product as unknown as { collectionProducts?: CollectionRef[] }
  ).collectionProducts;
  const firstCollection = colProds?.[0]?.collection ?? null;

  const images = product.images.length > 0 ? product.images : [];
  const activeImage = images[activeImg];

  const hasAdditionalTab =
    !isAdditionalEmpty ||
    !!f["sledge.global.product-shipping-description"] ||
    !!f["sledge.global.product-question-description"];

  const hasSidebarAccordions =
    !!f["sledge.global.product-care-instructions"] ||
    !!f["sledge.global.product-shipping-details"];

  return (
    <PageTransition>
      {/* Breadcrumb */}
      <nav
        className={cn(SLEDGE_PAGE_CONTAINER, "pt-8 pb-2")}
        aria-label="Breadcrumb"
      >
        <ol className="sl-eyebrow flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs tracking-[0.14em] uppercase">
          <li>
            <Link href="/shop" className="transition-opacity hover:opacity-60">
              Shop
            </Link>
          </li>
          {firstCollection ? (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/collections/${firstCollection.slug}`}
                  className="transition-opacity hover:opacity-60"
                >
                  {firstCollection.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden="true">/</li>
          <li className="max-w-[32ch] truncate text-[var(--sl-ink)]">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Main product layout */}
      <section className={cn(SLEDGE_PAGE_CONTAINER, "pb-10 md:pb-14")}>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Gallery */}
          <div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-[var(--sl-green)]">
              {activeImage ? (
                <Image
                  src={activeImage.url}
                  alt={product.name ?? "Product image"}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="sledge-card-placeholder absolute inset-0 flex items-center justify-center">
                  <span className="sledge-card-placeholder-num select-none">
                    ★
                  </span>
                </div>
              )}

              {activeImage ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label="Enlarge image"
                  className="absolute top-3 right-3 flex items-center justify-center rounded-full border border-[var(--sl-border)] bg-white/90 p-2 shadow-sm transition-opacity hover:opacity-80"
                >
                  <Search className="size-4 text-[var(--sl-ink)]" />
                </button>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className="mt-3 flex gap-2">
                {images.slice(0, 5).map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={cn(
                      "relative size-[72px] shrink-0 overflow-hidden rounded-sm transition-opacity hover:opacity-80",
                      activeImg === i
                        ? "ring-2 ring-[var(--sl-coral)] ring-offset-2"
                        : "ring-1 ring-[var(--sl-border)]",
                    )}
                    aria-label={`View image ${i + 1}`}
                    aria-current={activeImg === i ? "true" : undefined}
                  >
                    <Image
                      src={img.url}
                      alt={`View ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Details */}
          <FadeIn className="flex flex-col gap-5">
            {firstCollection ? (
              <Link
                href={`/collections/${firstCollection.slug}`}
                className="sl-eyebrow self-start font-sans text-xs tracking-[0.18em] uppercase transition-opacity hover:opacity-60"
              >
                {firstCollection.name}
              </Link>
            ) : null}

            <h1 className="sl-product-title font-serif leading-tight tracking-tight">
              {product.name}
            </h1>

            {additional?.productTagline ? (
              <p className="sledge-card-tagline font-mono text-[11px] tracking-[0.14em] uppercase">
                {additional.productTagline}
              </p>
            ) : null}

            <div className="flex flex-wrap items-baseline gap-3 border-t border-[var(--sl-border)] pt-5">
              <span className="sledge-card-price font-mono text-xl">
                {formatPrice(displayPrice)}
                {product.variants.length > 1 ? "+" : ""}
              </span>
              {isOnSale && displayCompareAtPrice ? (
                <span className="sledge-price-compare font-mono text-base line-through">
                  {formatPrice(displayCompareAtPrice)}
                </span>
              ) : null}
              {product.sku ? (
                <span className="sl-eyebrow ml-auto font-mono text-[10px] tracking-[0.14em] uppercase">
                  SKU · {product.sku}
                </span>
              ) : null}
            </div>

            {product.description ? (
              <p className="sl-eyebrow max-w-prose font-sans text-sm leading-relaxed md:text-[15px] md:leading-[1.85]">
                {product.description}
              </p>
            ) : null}

            {displayTrustBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayTrustBadges.map((badge) => (
                  <span
                    key={badge.label}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--sl-border)] bg-[var(--sl-cream)] px-2.5 py-1 font-sans text-[10px] tracking-[0.12em] text-[var(--sl-ink)] uppercase"
                  >
                    <badge.Icon className="size-3 text-[var(--sl-coral)]" />
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}

            {(globalProductTrustBadges?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-1.5">
                {globalProductTrustBadges?.map((badge) => (
                  <p
                    key={badge.label}
                    className="font-sans text-xs font-semibold tracking-[0.08em] text-[var(--sl-ink)] uppercase"
                  >
                    {badge.label}
                  </p>
                ))}
              </div>
            ) : null}

            {f["sledge.global.product-shipping-description"] ? (
              <p className="sl-eyebrow font-sans text-xs tracking-[0.1em] uppercase">
                {f["sledge.global.product-shipping-description"]}
              </p>
            ) : null}

            <SledgeProductActions product={product} business={business} />

            {hasSidebarAccordions ? (
              <div className="mt-2">
                {f["sledge.global.product-care-instructions"] ? (
                  <ProductAccordion
                    title="Care Instructions"
                    defaultOpen
                  >
                    {f["sledge.global.product-care-instructions"]}
                  </ProductAccordion>
                ) : null}
                {f["sledge.global.product-shipping-details"] ? (
                  <ProductAccordion title="Shipping & Returns">
                    {f["sledge.global.product-shipping-details"]}
                  </ProductAccordion>
                ) : null}
              </div>
            ) : null}
          </FadeIn>
        </div>
      </section>

      {/* Description tabs */}
      <SledgePageSection className="border-t border-[var(--sl-border)] pt-10 md:pt-12">
        <div className="-mb-px flex">
          {(["description", "additional"] as const)
            .filter((tab) => tab === "description" || hasAdditionalTab)
            .map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-5 py-2.5 font-sans text-xs tracking-[0.14em] uppercase transition-colors",
                  activeTab === tab
                    ? "z-1 border border-[var(--sl-border)] border-b-white bg-white text-[var(--sl-ink)]"
                    : "z-0 border border-[var(--sl-border)] bg-[var(--sl-cream)] text-[var(--sl-ink-soft)] hover:text-[var(--sl-ink)]",
                )}
              >
                {tab === "description"
                  ? "Description"
                  : "Additional Information"}
              </button>
            ))}
        </div>

        <div className="sl-tab-panel bg-white p-6 md:p-8">
          {activeTab === "description" && (
            <div>
              <h2 className="sl-tab-heading font-heading mb-4 font-semibold text-[var(--sl-orange)] uppercase">
                Description
              </h2>
              {product.description ? (
                <p className="sl-eyebrow max-w-prose font-sans text-[15px] leading-[1.85]">
                  {product.description}
                </p>
              ) : (
                <p className="sl-eyebrow font-sans text-sm">
                  No description available.
                </p>
              )}
            </div>
          )}

          {activeTab === "additional" && hasAdditionalTab && (
            <div>
              {!isAdditionalEmpty ? (
                <ProductAccordion title="Details" defaultOpen>
                  <TiptapRenderer
                    content={
                      additionalFields?.additionalInformation as TiptapJSON
                    }
                    className={SLEDGE_PROSE}
                  />
                </ProductAccordion>
              ) : null}

              {f["sledge.global.product-shipping-description"] ? (
                <ProductAccordion title="Shipping & Returns">
                  <p>{f["sledge.global.product-shipping-description"]}</p>
                </ProductAccordion>
              ) : null}

              {f["sledge.global.product-question-description"] ? (
                <ProductAccordion title="Ask a Question">
                  <p>
                    {f["sledge.global.product-question-description"]}{" "}
                    <Link
                      href="/contact"
                      className="text-[var(--sl-coral)] underline underline-offset-4 transition-opacity hover:opacity-70"
                    >
                      You can reach out to us here.
                    </Link>
                  </p>
                </ProductAccordion>
              ) : null}
            </div>
          )}
        </div>
      </SledgePageSection>

      <SledgeProductRail
        heading="Related Products"
        ctaText={shopCtaText}
        ctaHref={shopCtaHref}
        products={(relatedProducts ?? []) as Product[]}
      />

      <AnimatePresence>
        {lightboxOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[activeImg]?.url ?? "/placeholder.svg"}
                alt={product.name ?? "Product image"}
                width={1200}
                height={1200}
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label="Close"
                className="absolute top-3 right-3 rounded-full border border-[var(--sl-border)] bg-white/90 p-1.5 transition-colors hover:bg-white"
              >
                <X className="size-5 text-[var(--sl-ink)]" />
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </PageTransition>
  );
}
