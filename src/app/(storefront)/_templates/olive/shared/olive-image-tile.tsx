import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { hasOliveImage, OliveImageFallback } from "./olive-image-fallback";

type OliveImageTileProps = {
  image: string;
  /** Describes the photograph. The label is read separately, so do not repeat it. */
  alt: string;
  label: string;
  /** Template field key whose value is exactly `label`; enables editor live text. */
  labelFieldKey?: string;
  href: string;
  /** Optional second line, styled as the ghost link. Not itself interactive. */
  cta?: string;
  priority?: boolean;
  /** Passed to next/image. Defaults to a two-up row. */
  sizes?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveImageTile — the big 2-up photograph, with its label on a card pinned
 * into the bottom-left corner.
 *
 * Portrait on a phone (4:5) and landscape on a laptop (3:2), so the pair
 * stacks without either one becoming a letterbox. The white label card is the
 * same stock as everything else on the page — the photograph is the surface,
 * the card is the print on it.
 */
export function OliveImageTile({
  image,
  alt,
  label,
  labelFieldKey,
  href,
  cta,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  className,
  style,
}: OliveImageTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "olive-card olive-card-lift group relative block aspect-[4/5] overflow-hidden md:aspect-[3/2]",
        className,
      )}
      style={style}
    >
      {hasOliveImage(image) ? (
        <Image
          src={image}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="olive-photo-push object-cover"
        />
      ) : (
        <OliveImageFallback className="absolute inset-0" size={44} />
      )}

      <span
        className="pointer-events-none absolute bottom-3 left-3 flex max-w-[min(20rem,80%)] flex-col gap-1 px-4 py-3"
        style={{
          backgroundColor: "var(--olive-white)",
          border: "1px solid var(--olive-hairline)",
          borderRadius: "var(--olive-card-radius)",
        }}
      >
        <span
          className="olive-h3"
          {...(labelFieldKey ? fieldAttr(labelFieldKey) : {})}
        >
          {label}
        </span>
        {cta ? (
          <span className="olive-btn olive-btn-ghost self-start">{cta}</span>
        ) : null}
      </span>
    </Link>
  );
}
