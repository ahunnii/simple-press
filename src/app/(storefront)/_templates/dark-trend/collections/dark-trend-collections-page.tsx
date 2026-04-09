import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";

import { DarkTrendGeneralLayout } from "../dark-trend-general-layout";

export function DarkTrendCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <DarkTrendGeneralLayout title="Collections">
      {list.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-white/60">
            No collections available at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((collection) => {
            const count = collection._count.collectionProducts;
            return (
              <Link
                key={collection.id}
                href={`/collections/${collection.slug}`}
                className="group block"
              >
                <div className="boty-transition overflow-hidden rounded-xl bg-[#1F1F1F] group-hover:scale-[1.02]">
                  <div className="relative aspect-4/3 overflow-hidden">
                    <Image
                      src={collection.imageUrl ?? "/placeholder.svg"}
                      alt={collection.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute right-0 bottom-0 left-0 p-5">
                      <h2 className="text-xl font-bold text-white">
                        {collection.name}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-purple-400">
                        {count} {count === 1 ? "product" : "products"}
                      </p>
                    </div>
                  </div>
                  {collection.description && (
                    <div className="p-5">
                      <p className="line-clamp-2 text-sm text-white/70">
                        {collection.description}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DarkTrendGeneralLayout>
  );
}
