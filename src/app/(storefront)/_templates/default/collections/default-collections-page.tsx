import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";

export function DefaultCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <div>
      {/* Page hero */}
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
            Shop by collection
          </span>
          <h1 className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]">
            Collections
          </h1>
          {list.length > 0 && (
            <p className="mt-4 text-[17px] text-[#6b6b6b]">
              {list.length} collection{list.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {list.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-[#6b6b6b]">
                No collections available at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((collection, i) => {
                const count = collection._count.collectionProducts;
                return (
                  <Link
                    key={collection.id}
                    href={`/collections/${collection.slug}`}
                    className="group block"
                  >
                    <div
                      className={`relative mb-4 aspect-3/4 overflow-hidden rounded-(--radius) ${
                        i % 3 === 1
                          ? "bg-[#efece8]"
                          : i % 3 === 2
                            ? "bg-[#1a1a1a]"
                            : "bg-[#f6f6f6]"
                      }`}
                    >
                      <Image
                        src={collection.imageUrl ?? "/placeholder.svg"}
                        alt={collection.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h2 className="font-serif text-[15px] font-medium tracking-[-0.005em] transition-opacity group-hover:opacity-70">
                        {collection.name}
                      </h2>
                      {collection.description && (
                        <p className="line-clamp-2 text-[13px] leading-relaxed text-[#6b6b6b]">
                          {collection.description}
                        </p>
                      )}
                      <p className="text-[14px] text-[#6b6b6b]">
                        {count} product{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
