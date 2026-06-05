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
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { NoiseProductCard } from "../shared/sledge-product-card";
import { SledgeProductActions } from "./sledge-product-actions";

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

  const f = resolveFields(business?.siteContent?.customFields, [
    "sledge.global.product-shipping-description",
    "sledge.global.product-question-description",
    "sledge.global.product-care-instructions",
    "sledge.global.product-shipping-details",
  ]);

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

  return (
    <PageTransition>
      {/* ── Main product layout ── */}
      <div className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
            {/* ── Left: Gallery ── */}
            <div>
              {/* Main image */}
              <div
                className="relative overflow-hidden bg-gray-100"
                style={{ aspectRatio: "1 / 1" }}
              >
                {activeImage ? (
                  <Image
                    src={activeImage.url}
                    alt={product.name ?? "Product image"}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-gray-400">No image</span>
                  </div>
                )}

                {activeImage && (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label="Enlarge image"
                    className="absolute top-3 right-3 flex items-center justify-center rounded-full bg-white/90 p-2 shadow-sm transition-opacity hover:opacity-80"
                  >
                    <Search className="size-4 text-gray-700" />
                  </button>
                )}
              </div>

              {/* Thumbnail strip below main image */}
              {images.length > 1 && (
                <div className="mt-3 flex gap-2">
                  {images.slice(0, 5).map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImg(i)}
                      className="relative shrink-0 overflow-hidden transition-opacity hover:opacity-80"
                      style={{
                        width: "72px",
                        height: "72px",
                        border:
                          activeImg === i
                            ? "2px solid var(--sl-coral)"
                            : "2px solid #d1d5db",
                      }}
                      aria-label={`View image ${i + 1}`}
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
              )}
            </div>

            {/* ── Right: Product details ── */}
            <div className="flex flex-col gap-4">
              {/* Product name */}
              <h1
                className="font-heading leading-tight"
                style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}
              >
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-center gap-3">
                <span className="text-xl font-semibold">
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && displayCompareAtPrice && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(displayCompareAtPrice)}
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--sl-ink-soft)" }}
                >
                  {product.description}
                </p>
              )}

              {/* Product-level trust badges as bold text */}
              {displayTrustBadges.length > 0 && (
                <div className="flex flex-col gap-1">
                  {displayTrustBadges.map((badge) => (
                    <p key={badge.label} className="text-sm font-semibold">
                      {badge.label}
                    </p>
                  ))}
                </div>
              )}

              {/* Global trust badges */}
              {(globalProductTrustBadges?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-1">
                  {globalProductTrustBadges?.map((badge) => (
                    <p key={badge.label} className="text-sm font-semibold">
                      {badge.label}
                    </p>
                  ))}
                </div>
              )}

              {/* Global shipping description */}
              {f["sledge.global.product-shipping-description"] && (
                <p className="text-sm font-semibold">
                  {f["sledge.global.product-shipping-description"]}
                </p>
              )}

              {/* Variant selector + stock + add to cart */}
              <SledgeProductActions product={product} business={business} />

              {/* Details + Shipping accordions */}
              {(f["sledge.global.product-care-instructions"] ??
                f["sledge.global.product-shipping-details"]) && (
                <div className="mt-2">
                  {f["sledge.global.product-care-instructions"] && (
                    <details
                      open
                      className="group border-b border-[#e8e8e8] py-5 first:border-t"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
                        Care Instructions
                        <span
                          aria-hidden="true"
                          className="text-xl font-light transition-transform duration-200 group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p
                        className="pt-3.5 text-sm leading-[1.7]"
                        style={{ color: "var(--sl-ink-soft)" }}
                      >
                        {f["sledge.global.product-care-instructions"]}
                      </p>
                    </details>
                  )}
                  {f["sledge.global.product-shipping-details"] && (
                    <details className="group border-b border-[#e8e8e8] py-5 first:border-t">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
                        Shipping &amp; Returns
                        <span
                          aria-hidden="true"
                          className="text-xl font-light transition-transform duration-200 group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p
                        className="pt-3.5 text-sm leading-[1.7]"
                        style={{ color: "var(--sl-ink-soft)" }}
                      >
                        {f["sledge.global.product-shipping-details"]}
                      </p>
                    </details>
                  )}
                </div>
              )}

              {/* Category */}
              {firstCollection && (
                <p className="text-xs" style={{ color: "var(--sl-ink-soft)" }}>
                  Category:{" "}
                  <Link
                    href={`/collections/${firstCollection.slug}`}
                    className="underline hover:no-underline"
                    style={{ color: "var(--sl-coral)" }}
                  >
                    {firstCollection.name}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs: Description + Additional Information ── */}
      <div className="bg-white pb-14">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          {/* Tab buttons */}
          <div className="flex" style={{ marginBottom: "-1px" }}>
            {(["description", "additional"] as const).map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="px-5 py-2.5 text-sm transition-colors"
                style={{
                  border: "1px solid #d1d5db",
                  borderLeft: i > 0 ? "none" : "1px solid #d1d5db",
                  borderBottom:
                    activeTab === tab ? "1px solid white" : "1px solid #d1d5db",
                  background: activeTab === tab ? "white" : "#f5f5f5",
                  color:
                    activeTab === tab ? "var(--sl-ink)" : "var(--sl-ink-soft)",
                  position: "relative",
                  zIndex: activeTab === tab ? 1 : 0,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {tab === "description"
                  ? "Description"
                  : "Additional Information"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bg-white p-8" style={{ border: "1px solid #d1d5db" }}>
            {activeTab === "description" && (
              <div>
                <h2
                  className="font-heading mb-4"
                  style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
                >
                  Description
                </h2>
                {product.description && (
                  <p
                    className="leading-relaxed"
                    style={{ fontSize: "15px", color: "var(--sl-ink-soft)" }}
                  >
                    {product.description}
                  </p>
                )}
              </div>
            )}

            {activeTab === "additional" && (
              <div>
                {/* Details — TipTap additionalInformation */}
                {!isAdditionalEmpty && (
                  <details
                    open
                    className="group border-b py-5 first:border-t"
                    style={{ borderColor: "#e8e8e8" }}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium select-none [&::-webkit-details-marker]:hidden">
                      Details
                      <span
                        aria-hidden="true"
                        className="text-xl font-light transition-transform duration-200 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <div
                      className="pt-3.5 leading-[1.7]"
                      style={{
                        fontSize: "15px",
                        color: "var(--sl-ink-soft)",
                      }}
                    >
                      <TiptapRenderer
                        content={
                          additionalFields?.additionalInformation as TiptapJSON
                        }
                      />
                    </div>
                  </details>
                )}

                {/* Shipping & Returns */}
                {f["sledge.global.product-shipping-description"] && (
                  <details
                    className="group border-b py-5 first:border-t"
                    style={{ borderColor: "#e8e8e8" }}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium select-none [&::-webkit-details-marker]:hidden">
                      Shipping &amp; Returns
                      <span
                        aria-hidden="true"
                        className="text-xl font-light transition-transform duration-200 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <div
                      className="pt-3.5 leading-[1.7]"
                      style={{
                        fontSize: "15px",
                        color: "var(--sl-ink-soft)",
                      }}
                    >
                      <p>{f["sledge.global.product-shipping-description"]}</p>
                    </div>
                  </details>
                )}

                {/* Ask a question */}
                {f["sledge.global.product-question-description"] && (
                  <details
                    className="group border-b py-5 first:border-t"
                    style={{ borderColor: "#e8e8e8" }}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium select-none [&::-webkit-details-marker]:hidden">
                      Ask a Question
                      <span
                        aria-hidden="true"
                        className="text-xl font-light transition-transform duration-200 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <div
                      className="pt-3.5 leading-[1.7]"
                      style={{
                        fontSize: "15px",
                        color: "var(--sl-ink-soft)",
                      }}
                    >
                      <p>
                        {f["sledge.global.product-question-description"]}{" "}
                        <Link
                          href="/contact"
                          className="underline hover:no-underline"
                          style={{ color: "var(--sl-coral)" }}
                        >
                          You can reach out to us here.
                        </Link>
                      </p>
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Related products ── */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="bg-white pb-16">
          <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
            <h2
              className="font-heading mb-8"
              style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}
            >
              Related Products
            </h2>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {relatedProducts.slice(0, 4).map((p, index) => (
                <NoiseProductCard
                  key={p.id}
                  product={p as Product}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && (
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
                className="absolute top-3 right-3 rounded-full bg-white/80 p-1.5 transition-colors hover:bg-white"
              >
                <X className="size-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
