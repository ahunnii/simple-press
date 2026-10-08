import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "~/lib/utils";

import { GlovePrice } from "./glove-price";

type GloveCharmCardProps = {
  name: string;
  /** Category line under the name (e.g. "Charms"). Blank hides it. */
  category?: string;
  image: string;
  href: string;
  /** Price in cents. */
  price: number;
  maxPrice?: number | null;
  compareAtPrice?: number | null;
  className?: string;
  style?: CSSProperties;
};

/**
 * White card for the Charms carousel. The image swings from its top edge on
 * hover/focus (`.glove-swing`, once per hover; settled under reduced motion).
 */
export function GloveCharmCard({
  name,
  category,
  image,
  href,
  price,
  maxPrice,
  compareAtPrice,
  className,
  style,
}: GloveCharmCardProps) {
  return (
    <div
      className={cn(
        "glove-charm-card relative flex h-full flex-col overflow-hidden rounded-[var(--glove-radius-card)] bg-[var(--glove-paper)] p-4 text-center shadow-[var(--glove-shadow-sm)]",
        className,
      )}
      style={style}
    >
      <div className="glove-swing relative mx-auto aspect-square w-full max-w-[220px]">
        <Image
          src={image}
          alt=""
          fill
          sizes="220px"
          className="object-contain"
        />
      </div>
      <h3 className="glove-display mt-3 text-[14px] font-medium text-[var(--glove-ink)]">
        <Link href={href} className="glove-product-title-link">
          {name}
        </Link>
      </h3>
      {category ? (
        <p className="mt-0.5 text-[13px] text-[var(--glove-muted)]">
          {category}
        </p>
      ) : null}
      <p className="mt-1">
        <GlovePrice
          price={price}
          maxPrice={maxPrice}
          compareAtPrice={compareAtPrice}
          size="sm"
        />
      </p>
    </div>
  );
}
