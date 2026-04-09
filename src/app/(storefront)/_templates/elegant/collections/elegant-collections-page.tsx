import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";

export function ElegantCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-secondary/20 flex items-center justify-center py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-muted-foreground mb-3 text-sm tracking-widest uppercase">
            Shop
          </p>
          <h1 className="text-foreground font-serif text-4xl font-light tracking-wide md:text-5xl">
            Collections
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Explore our thoughtfully curated collections.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
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
                  <div className="bg-card overflow-hidden rounded-sm">
                    <div className="relative aspect-4/3 w-full overflow-hidden">
                      <Image
                        src={collection.imageUrl ?? "/placeholder.svg"}
                        alt={collection.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-6">
                      <h2 className="text-foreground font-serif text-xl font-light tracking-wide">
                        {collection.name}
                      </h2>
                      {collection.description && (
                        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                          {collection.description}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-3 text-xs tracking-widest uppercase">
                        {count} {count === 1 ? "piece" : "pieces"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
