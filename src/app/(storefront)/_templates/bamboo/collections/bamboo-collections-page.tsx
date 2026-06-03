import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "../index";

export function BambooCollectionsPage({
  business,
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];
  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.collections.listing-title",
    "bamboo.collections.listing-intro",
  ]);
  return (
    <div className="bg-background">
      {/* Header */}
      <div
        {...sectionGroupAttr("collections", "listing")}
        className="bg-secondary/30 border-border border-b px-4 py-16 text-center sm:px-6 lg:px-8"
      >
        <h1 className="font-heading text-foreground text-4xl font-bold md:text-5xl">
          {f["bamboo.collections.listing-title"]}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-base">
          {f["bamboo.collections.listing-intro"]}
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {list.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground text-lg">
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
                  <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-lg">
                    <div className="relative aspect-4/3 w-full overflow-hidden">
                      <Image
                        src={collection.imageUrl ?? "/placeholder.svg"}
                        alt={collection.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-5">
                      <h2 className="font-heading text-card-foreground group-hover:text-primary text-xl font-semibold transition-colors">
                        {collection.name}
                      </h2>
                      {collection.description && (
                        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                          {collection.description}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          {count} {count === 1 ? "product" : "products"}
                        </span>
                        <span className="text-primary flex items-center gap-1 text-sm font-medium">
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
