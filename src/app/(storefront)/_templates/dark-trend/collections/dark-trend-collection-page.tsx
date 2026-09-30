import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";

export function DarkTrendCollectionPage({
  business,
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null);

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  const f = resolveFields(business.siteContent?.customFields, [
    "dark-trend.collections.detail-back-label",
    "dark-trend.collections.detail-empty",
    "dark-trend.collections.detail-browse-label",
    "dark-trend.collections.detail-more-heading",
  ]);

  const backLabel = f["dark-trend.collections.detail-back-label"] ?? "";
  const emptyText = f["dark-trend.collections.detail-empty"] ?? "";
  const browseLabel = (
    f["dark-trend.collections.detail-browse-label"] ?? ""
  ).trim();
  const moreHeading = f["dark-trend.collections.detail-more-heading"] ?? "";

  return (
    <DarkTrendGeneralLayout
      title={collection.name}
      excerpt={collection.description ?? undefined}
      productsCount={products.length}
    >
      <div {...sectionGroupAttr("collections", "detail")} className="mb-8">
        <Link
          href="/collections"
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span {...fieldAttr("dark-trend.collections.detail-back-label")}>
            {backLabel}
          </span>
        </Link>
      </div>

      {/* Products */}
      {products.length === 0 ? (
        <div
          {...sectionGroupAttr("collections", "detail")}
          className="py-20 text-center"
        >
          <p
            {...fieldAttr("dark-trend.collections.detail-empty")}
            className="text-lg text-white/60"
          >
            {emptyText}
          </p>
          {browseLabel ? (
            <Link
              href="/shop"
              className="mt-4 inline-block text-sm text-purple-400 hover:underline"
            >
              <span
                {...fieldAttr("dark-trend.collections.detail-browse-label")}
              >
                {browseLabel}
              </span>
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => {
            const hasVariants = product.variants.length > 0;
            const displayPrice = hasVariants
              ? (product.variants[0]?.price ?? product.price)
              : product.price;

            return (
              <Link
                key={product.id}
                href={`/shop/${product.slug}`}
                className="group block"
                style={{ transitionDelay: `${index * 60}ms` }}
              >
                <div className="boty-transition overflow-hidden rounded-xl bg-[#1F1F1F] group-hover:scale-[1.02]">
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={product.images[0]?.url ?? "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl text-white">{product.name}</h3>
                    <p className="mt-1 text-lg font-medium text-white">
                      {formatPrice(displayPrice)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* More collections */}
      {others.length > 0 && (
        <div
          {...sectionGroupAttr("collections", "detail")}
          className="mt-24 border-t border-white/10 pt-16"
        >
          <h2
            {...fieldAttr("dark-trend.collections.detail-more-heading")}
            className="mb-8 text-center text-2xl font-bold text-white"
          >
            {moreHeading}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((col) => {
              const count = col._count.collectionProducts;
              return (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="group block"
                >
                  <div className="boty-transition overflow-hidden rounded-xl bg-[#1F1F1F] group-hover:scale-[1.02]">
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={col.imageUrl ?? "/placeholder.svg"}
                        alt={col.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                      <div className="absolute right-0 bottom-0 left-0 p-4">
                        <h3 className="font-bold text-white">{col.name}</h3>
                        <p className="text-sm text-purple-400">
                          {count} {count === 1 ? "product" : "products"}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </DarkTrendGeneralLayout>
  );
}
