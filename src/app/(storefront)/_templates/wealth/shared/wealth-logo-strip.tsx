import Image from "next/image";

import { cn } from "~/lib/utils";

export type WealthLogo = {
  key?: string;
  src: string;
  /** The organisation's name — the logo's alt text. */
  alt: string;
  href?: string | null;
  /** Intrinsic size hints for layout before load; CSS caps the height. */
  width?: number;
  height?: number;
  /** Spread on the `<li>` (e.g. `listItemAttr(fieldKey, i)`). */
  attrs?: Record<string, string>;
};

type WealthLogoStripProps = {
  logos: WealthLogo[];
  /** Accessible name for the list, e.g. "Some of the co-ops we've supported". */
  label?: string;
  className?: string;
};

/**
 * Co-op logo strip (design.md redesign): 3-up phones / 6-up desktop,
 * grayscale + 72% opacity, full color on hover/focus. Logos with an href
 * link out (new tab for http(s)). Renders nothing for an empty list.
 */
export function WealthLogoStrip({
  logos,
  label,
  className,
}: WealthLogoStripProps) {
  const items = logos.filter((l) => l.src.trim());
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className={cn("wealth-logos", className)}>
      {items.map((logo, i) => {
        const img = (
          <Image
            src={logo.src}
            alt={logo.alt}
            width={logo.width ?? 300}
            height={logo.height ?? 150}
            sizes="(min-width: 900px) 180px, 30vw"
          />
        );
        const href = logo.href?.trim();
        const external = !!href && /^https?:\/\//i.test(href);
        return (
          <li key={logo.key ?? `${logo.src}-${i}`} {...logo.attrs}>
            {href ? (
              <a
                href={href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {img}
                {external ? (
                  <span className="sr-only"> (opens in new tab)</span>
                ) : null}
              </a>
            ) : (
              img
            )}
          </li>
        );
      })}
    </ul>
  );
}
