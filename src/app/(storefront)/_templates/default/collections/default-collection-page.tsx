import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";

import { DefaultProductCard } from "../shared/default-product-card";

export function DefaultCollectionPage({
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null);

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  return (
    <div>
      {/* Page hero */}
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-0 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
          >
            <Link href="/" className="transition-colors hover:text-[#0a0a0a]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/collections"
              className="transition-colors hover:text-[#0a0a0a]"
            >
              Collections
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="font-semibold text-[#0a0a0a]">
              {collection.name}
            </span>
          </nav>

          {/* <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
            Collection
          </span> */}
          <h1 className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-4 mb-10 max-w-[560px] text-[17px] text-[#6b6b6b]">
              {collection.description}
            </p>
          )}
          <p className="mb-10 text-sm text-[#6b6b6b]">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>

          {/* Banner image */}
          {collection.imageUrl && (
            <div className="relative aspect-21/6 overflow-hidden rounded-t-(--radius) bg-[#f6f6f6]">
              <Image
                src={collection.imageUrl}
                alt={collection.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1440px) 100vw, 1440px"
              />
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-[#6b6b6b]">
                No products in this collection yet.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
              >
                View all products <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {collection.collectionProducts.map((cp, index) => {
                const product = cp.product;
                if (!product) return null;
                return (
                  <DefaultProductCard
                    key={cp.id}
                    product={product as Product}
                    index={index}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* More collections */}
      {others.length > 0 && (
        <section className="border-t border-[#e8e8e8] bg-[#f6f6f6] px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-serif text-2xl font-medium tracking-tight">
                More collections
              </h2>
              <Link
                href="/collections"
                className="inline-flex shrink-0 items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
              >
                All collections <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-3">
              {others.map((col) => {
                const count = col._count.collectionProducts;
                return (
                  <Link
                    key={col.id}
                    href={`/collections/${col.slug}`}
                    className="group block"
                  >
                    <div className="relative mb-4 aspect-4/3 overflow-hidden rounded-[var(--radius)] bg-[#e8e8e8]">
                      <Image
                        src={col.imageUrl ?? "/placeholder.svg"}
                        alt={col.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                      />
                    </div>
                    <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] transition-opacity group-hover:opacity-70">
                      {col.name}
                    </h3>
                    <p className="mt-0.5 text-[14px] text-[#6b6b6b]">
                      {count} product{count !== 1 ? "s" : ""}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
