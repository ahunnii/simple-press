import Link from "next/link";

import type { Product } from "~/types";
import { formatProductDisplayPrice } from "~/lib/prices";

import { DreamPhoto } from "../shared/dream-photo";

/**
 * Related-product tile: hairline 26px photo frame (with the designed
 * fallback when the product has no photo), Italiana name, quiet price.
 * The whole tile is one link; the photo's hover zoom comes from
 * `.dream-photo` itself.
 */
export function DreamRelatedCard({ product }: { product: Product }) {
  const image = product.images[0];
  const alt = image?.altText?.trim() ? image.altText : product.name;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex flex-col gap-3 rounded-[var(--dream-radius-photo)] no-underline"
    >
      <DreamPhoto
        src={image?.url ?? ""}
        alt={alt ?? product.name}
        aspect="4 / 5"
        fallbackTone="sky"
      />
      <span className="flex flex-col gap-0.5 px-1">
        <span
          className="text-[22px] leading-[1.2] text-[var(--dream-ink)] decoration-[var(--dream-rose)] underline-offset-4 group-hover:underline"
          style={{ fontFamily: "var(--font-dream-display)" }}
        >
          {product.name}
        </span>
        <span className="text-[15px] text-[var(--dream-soft)] tabular-nums">
          {formatProductDisplayPrice(product)}
        </span>
      </span>
    </Link>
  );
}
