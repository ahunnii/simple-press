import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { OliveChip } from "./olive-chip";
import { hasOliveImage, OliveImageFallback } from "./olive-image-fallback";

type OliveCategoryCardProps = {
  image: string;
  /** Describes the photograph. The label is read separately, so do not repeat it. */
  alt: string;
  label: string;
  /** Template field key whose value is exactly `label`; enables editor live text. */
  labelFieldKey?: string;
  href: string;
  /**
   * Swatch for the chip on the tab. A colour name or CSS colour; `oliveChipToken`
   * from the nav overlay rotates four brand tokens if you have nothing better.
   */
  chipColor?: string;
  /** Small ink-soft caption, e.g. "18 pieces". */
  count?: string;
  priority?: boolean;
  /** Passed to next/image. Defaults to a quarter-width four-up row. */
  sizes?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveCategoryCard — a photograph with a tab on it, like a divider in the
 * swatch book.
 *
 * The tab is the only place a chip is allowed to stand for a category (see the
 * chip discipline in design.md). The whole card is one link; the photograph
 * pushes in slightly on hover while the card itself warms and lifts, so the
 * two motions read as one gesture.
 */
export function OliveCategoryCard({
  image,
  alt,
  label,
  labelFieldKey,
  href,
  chipColor,
  count,
  priority = false,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px",
  className,
  style,
}: OliveCategoryCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "olive-card olive-card-lift group block h-full overflow-hidden",
        className,
      )}
      style={style}
    >
      <span
        className="relative block w-full overflow-hidden"
        style={{ aspectRatio: "3 / 4" }}
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
          <OliveImageFallback className="absolute inset-0" />
        )}

        <span
          className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-2 px-2.5 py-1.5"
          style={{
            backgroundColor: "var(--olive-white)",
            border: "1px solid var(--olive-hairline)",
            borderRadius: "var(--olive-card-radius)",
          }}
        >
          {chipColor ? (
            <OliveChip
              color={chipColor}
              label={label}
              size={12}
              srOnlyLabel={false}
            />
          ) : null}
          <span
            className="olive-label"
            style={{ color: "var(--olive-ink)" }}
            {...(labelFieldKey ? fieldAttr(labelFieldKey) : {})}
          >
            {label}
          </span>
        </span>
      </span>

      {count ? (
        <span className="olive-caption block px-3 py-2.5">{count}</span>
      ) : null}
    </Link>
  );
}
