import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";

export function PollenCollectionsPage({
  business,
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];
  const f = resolveFields(business.siteContent?.customFields, [
    "pollen.collections.page-title",
    "pollen.collections.page-subtitle",
    "pollen.collections.listing-intro",
  ]);

  return (
    <PageTransition>
      <section
        className="mx-auto max-w-7xl px-4 pt-40 pb-8 sm:px-6 lg:px-8"
        {...sectionGroupAttr("collections", "main")}
      >
        <FadeIn direction="up">
          <div className="mb-12">
            <p className="mb-2 text-sm font-medium tracking-wider text-[#5e7747] uppercase">
              {f["pollen.collections.page-subtitle"] ?? "Collections"}
            </p>
            <h1 className="text-4xl font-bold text-[#2a351f] md:text-5xl">
              {f["pollen.collections.page-title"] ?? "Our Collections"}
            </h1>
            {f["pollen.collections.listing-intro"] && (
              <p className="mt-3 max-w-2xl text-[#4c566a]">
                {f["pollen.collections.listing-intro"]}
              </p>
            )}
          </div>
        </FadeIn>

        {list.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-gray-500">
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
      </section>
    </PageTransition>
  );
}
