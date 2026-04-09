import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { resolveFields } from "..";

export function PollenCollectionsPage({
  business,
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];
  const f = resolveFields(business.siteContent?.customFields, [
    "pollen.collections.listing-title",
    "pollen.collections.listing-intro",
  ]);

  return (
    <div className="bg-white pt-28">
      {/* Header */}
      <div className="border-b border-[#2a351f]/10 bg-[#f5f2ee] px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="mb-2 text-sm font-medium tracking-wider text-[#5e7747] uppercase">
          Collections
        </p>
        <h1 className="text-4xl font-bold text-[#2a351f] md:text-5xl">
          {f["pollen.collections.listing-title"] ?? "Our Collections"}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-[#4c566a]">
          {f["pollen.collections.listing-intro"] ?? "Browse our curated collections."}
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {list.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-[#4c566a]">
              No collections available at this time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((collection) => {
              const count = collection._count.collectionProducts;
              return (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group block"
                >
                  <div className="overflow-hidden rounded-md border border-[#2a351f]/10 bg-white shadow-sm transition-shadow hover:shadow-md">
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-[#f5f2ee]">
                      <Image
                        src={collection.imageUrl ?? "/placeholder.svg"}
                        alt={collection.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-5">
                      <h2 className="text-xl font-semibold text-[#2a351f] transition-colors group-hover:text-[#5e7747]">
                        {collection.name}
                      </h2>
                      {collection.description && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#4c566a]">
                          {collection.description}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-[#4c566a]">
                          {count} {count === 1 ? "product" : "products"}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-medium text-[#215935]">
                          Shop now
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
