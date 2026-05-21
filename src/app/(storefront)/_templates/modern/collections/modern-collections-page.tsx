import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";

import { resolveFields } from "..";

export function ModernCollectionsPage({
  business,
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];
  const f = resolveFields(business.siteContent?.customFields, [
    "modern.collections.tagline",
    "modern.collections.title",
    "modern.collections.intro",
  ]);

  return (
    <div className="bg-background">
      <div className="border-border border-b">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {f["modern.collections.tagline"]}
          </p>
          <h1 className="text-foreground mt-2 font-serif text-4xl md:text-5xl">
            {f["modern.collections.title"]}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-lg">
            {f["modern.collections.intro"]}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
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
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-sm">
                    <Image
                      src={collection.imageUrl ?? "/placeholder.svg"}
                      alt={collection.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/20 transition-opacity group-hover:bg-black/30" />
                  </div>
                  <div className="mt-4">
                    <h2 className="text-foreground font-serif text-xl">
                      {collection.name}
                    </h2>
                    {collection.description && (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                        {collection.description}
                      </p>
                    )}
                    <p className="text-muted-foreground mt-2 text-xs tracking-wide uppercase">
                      {count} {count === 1 ? "product" : "products"}
                    </p>
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
