"use client";

import Link from "next/link";

import type { DefaultProductPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { Product } from "~/types";
import { computeSavingsLabel } from "~/lib/prices";
import { isContentEmpty } from "~/lib/template-fields";
import { api } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ProductGalleryVertical } from "~/app/(storefront)/_components/product-page/product-gallery-vertical-sticky";

import { DefaultProductCard } from "../shared/default-product-card";
import { DefaultProductActions } from "./default-product-actions";

function AccordionItem({
  summary,
  children,
  defaultOpen,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-[#e8e8e8] py-5 first:border-t"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        {summary}
        <span className="text-xl font-light transition-transform duration-200 group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="pt-3.5 text-sm leading-[1.7] text-[#6b6b6b]">
        {children}
      </div>
    </details>
  );
}

export function DefaultProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  const {
    formatPrice,
    displayPrice,
    additionalFields,
    isOnSale,
    displayCompareAtPrice,
  } = useProduct(product);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const isAdditionalEmpty = isContentEmpty(
    additionalFields?.additionalInformation as TiptapJSON,
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1440px] px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 pt-6 pb-8 text-[11px] font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
          <Link href="/" className="hover:text-[#0a0a0a] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/shop"
            className="hover:text-[#0a0a0a] transition-colors"
          >
            Shop
          </Link>
          <span>/</span>
          <span className="text-[#0a0a0a] normal-case tracking-normal">
            {product.name}
          </span>
        </div>

        {/* PDP layout */}
        <div className="grid grid-cols-1 gap-10 pb-24 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          {/* Gallery */}
          <ProductGalleryVertical
            images={product.images}
            productName={product.name}
            enableLightbox
            styleProps={{
              containerClassName:
                "lg:sticky lg:top-[calc(72px+24px)] lg:self-start",
            }}
          />

          {/* Info panel */}
          <div className="flex flex-col gap-6">
            {/* Name + price */}
            <div className="flex flex-col gap-4">
              <h1 className="font-serif text-[36px] leading-[1.1] font-medium tracking-[-0.02em]">
                {product.name}
              </h1>
              {additionalFields?.productTagline && (
                <p className="text-sm text-[#6b6b6b]">
                  {additionalFields.productTagline}
                </p>
              )}
              <div className="flex items-center gap-4">
                <span className="text-[22px] font-medium">
                  {formatPrice(displayPrice)}
                </span>
                {isOnSale && displayCompareAtPrice && (
                  <>
                    <span className="text-[18px] text-[#a3a3a3] line-through">
                      {formatPrice(displayCompareAtPrice)}
                    </span>
                    <span className="inline-flex items-center rounded-[2px] bg-[#0a0a0a] px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] uppercase text-white">
                      {computeSavingsLabel(displayPrice, displayCompareAtPrice)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-[15px] leading-[1.65] text-[#6b6b6b]">
                {product.description}
              </p>
            )}

            {/* Actions (variant selector + qty + add to cart) */}
            <DefaultProductActions product={product} />

            {/* Trust signals */}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-[#6b6b6b]">
              <span>✓ Ships in 1–2 business days</span>
              <span>✓ Free returns within 30 days</span>
            </div>

            {/* Accordion */}
            <div className="mt-2">
              <AccordionItem summary="Details" defaultOpen>
                {!isAdditionalEmpty ? (
                  <TiptapRenderer
                    content={
                      additionalFields?.additionalInformation as TiptapJSON
                    }
                    className="prose prose-sm max-w-none"
                  />
                ) : (
                  <p>
                    Materials, care instructions, and any other details about
                    this product. Edit this from your product settings.
                  </p>
                )}
              </AccordionItem>
              <AccordionItem summary="Shipping &amp; returns">
                <p>
                  Ships within 1–2 business days. US orders over $75 ship free.
                  International rates calculated at checkout. 30-day returns, no
                  questions asked.
                </p>
              </AccordionItem>
              <AccordionItem summary="Ask a question">
                <p>
                  We answer most questions within a day.{" "}
                  <Link
                    href="/contact"
                    className="underline hover:no-underline"
                  >
                    Contact us
                  </Link>{" "}
                  and we&apos;ll get back to you.
                </p>
              </AccordionItem>
            </div>

            {/* Shipping link */}
            <p className="text-xs text-[#6b6b6b]">
              <Link
                href="/shipping-policy"
                className="underline hover:no-underline"
              >
                Shipping
              </Link>{" "}
              calculated at checkout
            </p>
          </div>
        </div>

        {/* You may also like */}
        {(relatedProducts?.length ?? 0) > 0 && (
          <section className="border-t border-[#e8e8e8] pb-24 pt-16">
            <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
                  Pair it with
                </p>
                <h2 className="font-serif text-3xl font-semibold tracking-tight">
                  You may also like
                </h2>
              </div>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-sm font-medium border-b border-current pb-0.5 transition-[gap] hover:gap-3 shrink-0"
              >
                All products →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {relatedProducts?.map((p, index) => (
                <DefaultProductCard
                  key={p.id}
                  product={p as Product}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
