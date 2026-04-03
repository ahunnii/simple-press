import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../types";

export function DefaultCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <main className="flex-1 px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Collections</h1>
          <div className="text-muted-foreground mb-4 flex items-center text-sm">
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-600">Collections</span>
          </div>
          <p className="text-gray-600">
            {list.length} collection{list.length !== 1 ? "s" : ""}
          </p>
        </div>

        {list.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-gray-500">
              No collections available at this time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
            {list.map((collection) => {
              const productCount = collection._count.collectionProducts;
              return (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-100">
                    <Image
                      src={collection.imageUrl ?? "/placeholder.svg"}
                      alt={collection.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h2 className="mb-1 text-lg font-semibold text-gray-900 group-hover:text-gray-700">
                      {collection.name}
                    </h2>
                    {collection.description ? (
                      <p className="mb-2 line-clamp-2 text-sm text-gray-600">
                        {collection.description}
                      </p>
                    ) : null}
                    <p className="text-sm text-gray-500">
                      {productCount} product{productCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
