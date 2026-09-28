import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";

import { DreamPhoto } from "../shared/dream-photo";

type Collection = RouterOutputs["collections"]["getAllPublic"][number];

/**
 * Collection tile: hairline 3:4 photo frame (with the designed fallback when
 * the collection has no image), Italiana name, quiet product count. Same
 * tile shape used on the `/collections` grid and the "more collections"
 * cross-sell on `/collections/<slug>` (design consistency with
 * `products/dream-related-card.tsx`).
 */
export function DreamCollectionCard({
  collection,
}: {
  collection: Collection;
}) {
  const count = collection._count.collectionProducts;

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group flex flex-col gap-3 rounded-[var(--dream-radius-photo)] no-underline"
    >
      <DreamPhoto
        src={collection.imageUrl ?? ""}
        alt={collection.name}
        aspect="3 / 4"
        fallbackTone="sky"
      />
      <span className="flex flex-col gap-0.5 px-1">
        <span
          className="text-[22px] leading-[1.2] text-[var(--dream-ink)] decoration-[var(--dream-rose)] underline-offset-4 group-hover:underline"
          style={{ fontFamily: "var(--font-dream-display)" }}
        >
          {collection.name}
        </span>
        {collection.description ? (
          <span className="line-clamp-2 text-[14px] leading-[1.5] text-[var(--dream-soft)]">
            {collection.description}
          </span>
        ) : null}
        <span className="text-[13px] text-[var(--dream-soft)] tabular-nums">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </span>
    </Link>
  );
}
