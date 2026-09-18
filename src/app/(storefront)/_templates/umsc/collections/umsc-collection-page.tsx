import Image from "next/image";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { UmscButton } from "../shared/umsc-button";
import { UmscCollectionDoor } from "../shared/umsc-collection-door";
import { UmscHeading } from "../shared/umsc-heading";
import {
  hasCustomImage,
  UmscImageFallback,
} from "../shared/umsc-image-fallback";
import { UmscLede } from "../shared/umsc-lede";
import { UmscProductGrid } from "../shared/umsc-product-grid";
import { UmscReveal, UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

/**
 * UmscCollectionPage — design.md "Collection": hero with the collection
 * image bleeding right (reusing `UmscPageHero`'s right-side image slot) +
 * description lede, grid of its products, an "Other collections" compact
 * door row at the bottom, and a designed empty state. Purely data-driven —
 * no per-collection template fields — except the one shared empty-state
 * line resolved from the `collections.hero` field module.
 */
export function UmscCollectionPage({
  business,
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "umsc.collections.empty-body",
  ]);

  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter(
      (p): p is NonNullable<typeof p> => p != null,
    ) as unknown as Product[];

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 4);
  const hasImage = hasCustomImage(collection.imageUrl ?? undefined);

  return (
    <div>
      {/* Hero — collection image bleeding right */}
      <section
        aria-label="Collection introduction"
        className="relative border-b-2 border-[var(--umsc-gold)] bg-[var(--umsc-black)]"
      >
        <div
          className="mx-auto grid items-center gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24"
          style={{ maxWidth: "var(--umsc-container)" }}
        >
          <div>
            <UmscHeading as="h1" className="text-[var(--umsc-cream-on-black)]">
              {collection.name}
            </UmscHeading>
            {collection.description && (
              <UmscLede onBlack className="mt-5">
                {collection.description}
              </UmscLede>
            )}
            <p className="umsc-sans mt-6 text-[13px] tracking-[0.08em] text-[var(--umsc-cream-on-black)] uppercase">
              {products.length} product{products.length !== 1 ? "s" : ""}
            </p>
          </div>
          {hasImage ? (
            <div className="relative hidden aspect-[4/3] w-full overflow-hidden border border-[var(--umsc-line-gold)] lg:block">
              <Image
                src={collection.imageUrl!}
                alt=""
                fill
                className="object-cover"
                sizes="40vw"
                priority
              />
            </div>
          ) : (
            <div className="relative hidden aspect-[4/3] w-full overflow-hidden lg:block">
              <UmscImageFallback onBlack />
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <UmscSection tone="paper" aria-label={`${collection.name} products`}>
        <h2 className="sr-only">{collection.name} products</h2>
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <div className="grid w-full max-w-[520px] grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <UmscImageFallback key={i} aspect="1 / 1" />
              ))}
            </div>
            <p
              {...fieldAttr("umsc.collections.empty-body")}
              className="umsc-sans max-w-[46ch] text-[15px] text-[var(--umsc-muted)]"
            >
              {f["umsc.collections.empty-body"] ?? ""}
            </p>
            <UmscButton href="/shop" variant="link">
              Go to the shop
            </UmscButton>
          </div>
        ) : (
          <UmscProductGrid products={products} />
        )}
      </UmscSection>

      {/* Other collections */}
      {others.length > 0 && (
        <UmscSection
          tone="cream"
          aria-label="Other collections"
          className="border-t border-[var(--umsc-line)]"
        >
          <UmscReveal>
            <UmscHeading as="h2" className="mb-8">
              Other collections
            </UmscHeading>
          </UmscReveal>
          <UmscRevealGroup className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {others.map((c, i) => (
              <div
                key={c.id}
                className="umsc-reveal-item"
                style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
              >
                <UmscCollectionDoor
                  href={`/collections/${c.slug}`}
                  title={c.name}
                  image={c.imageUrl ?? undefined}
                  aspect="3 / 2"
                />
              </div>
            ))}
          </UmscRevealGroup>
        </UmscSection>
      )}
    </div>
  );
}
