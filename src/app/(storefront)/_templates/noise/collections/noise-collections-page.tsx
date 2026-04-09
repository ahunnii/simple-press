import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from "~/components/page-animations";

export function NoiseCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <PageTransition>
      {/* Header */}
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <FadeIn>
            <p className="mb-4 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
              Visual Noise Detroit
            </p>
            <h1 className="font-serif text-5xl font-light leading-tight tracking-tight text-foreground md:text-6xl">
              Collections
            </h1>
            <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-muted-foreground">
              Each collection is a curated statement — assembled with intention,
              worn with purpose.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        {list.length === 0 ? (
          <FadeIn>
            <div className="py-20 text-center">
              <p className="font-sans text-muted-foreground">
                No collections available at this time.
              </p>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((collection) => {
              const count = collection._count.collectionProducts;
              return (
                <StaggerItem key={collection.id}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden">
                      <Image
                        src={collection.imageUrl ?? "/placeholder.svg"}
                        alt={collection.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-foreground/10 transition-opacity group-hover:bg-foreground/20" />
                    </div>
                    <div className="mt-4">
                      <h2 className="font-serif text-xl font-light text-foreground group-hover:opacity-70 transition-opacity">
                        {collection.name}
                      </h2>
                      {collection.description && (
                        <p className="mt-1 font-sans text-sm leading-relaxed text-muted-foreground line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                      <p className="mt-2 font-sans text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                        {count} {count === 1 ? "piece" : "pieces"}
                      </p>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </section>
    </PageTransition>
  );
}
