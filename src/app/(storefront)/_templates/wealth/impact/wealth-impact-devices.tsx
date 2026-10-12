import Image from "next/image";

import { cn } from "~/lib/utils";

import { WealthReveal } from "../shared/wealth-reveal";
import { numeralSize, personInitials } from "./impact-rows";

/**
 * Report-only visual devices (design.md "Impact Report — v2" → "Report-only
 * devices"). Server-safe: no hooks, no "use client". Styles live in
 * globals.css region "wealth impact v2 A".
 */

// ─── Rings ───────────────────────────────────────────────────────────────────

/** Where the ring set bleeds off its block (CSS `--<placement>` modifier). */
export type WealthRingsPlacement = "cover" | "left" | "tr" | "br" | "tl";

const RING_MIN_R = 22;
const RING_MAX_R = 199;

/**
 * Concentric circle strokes (8–12, flat, no gradient), absolutely placed so
 * an arc bleeds off the block edge. Decorative: `aria-hidden`, not
 * focusable. The PARENT block must carry `.wealth-impact-ringed` (relative,
 * clipped, isolated) and the rings should be its FIRST child so content
 * paints above them. Stroke colour/opacity follow the tone context.
 */
export function WealthRings({
  placement,
  rings = 11,
  className,
}: {
  placement: WealthRingsPlacement;
  /** Number of circles, clamped to 8–12. */
  rings?: number;
  className?: string;
}) {
  const count = Math.max(8, Math.min(12, Math.round(rings)));
  const step = (RING_MAX_R - RING_MIN_R) / (count - 1);
  return (
    <svg
      className={cn(
        "wealth-impact-rings",
        `wealth-impact-rings--${placement}`,
        className,
      )}
      viewBox="0 0 400 400"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor">
        {Array.from({ length: count }, (_, i) => (
          <circle
            key={i}
            cx="200"
            cy="200"
            r={Math.round((RING_MIN_R + step * i) * 10) / 10}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

// ─── ↘ heading mark ──────────────────────────────────────────────────────────

/** The 2024 report's ↘ stroked arrow, under every report H2. Decorative. */
export function ImpactHeadingMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("wealth-impact-mark", className)}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 6l15.5 15.5M22 8.5V22H8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

// ─── Numeral tile ────────────────────────────────────────────────────────────

/**
 * Square tile with a Jost numeral and a hard ledge. Light context → forest
 * tile + white numeral + sage ledge; forest context → sage tile + btn-ink
 * numeral (CSS follows `.wealth-on-forest`). The numeral steps down by
 * length (`numeralSize`) so "$300K" fits. `fieldProps` go on the numeral
 * (spread `fieldAttr(key)` for scalar values; list values take none).
 */
export function ImpactNumeralTile({
  value,
  size = "base",
  fieldProps,
  className,
}: {
  value: string;
  size?: "base" | "lg";
  fieldProps?: Record<string, string>;
  className?: string;
}) {
  const step = numeralSize(value);
  return (
    <span
      className={cn(
        "wealth-impact-tile",
        size === "lg" && "wealth-impact-tile--lg",
        step !== "base" && `wealth-impact-tile--${step}`,
        className,
      )}
    >
      <span {...fieldProps} className="wealth-impact-tile__num">
        {value}
      </span>
    </span>
  );
}

// ─── Circle portrait ─────────────────────────────────────────────────────────

/**
 * People photos only: round crop with an accent circle offset down-right
 * (the ledge, as a circle). No `src` → a sage circle with the person's
 * initials (aria-hidden; render the name as text elsewhere). `alt` is the
 * photo description; pass "" when the adjacent text already names the
 * person and the photo adds nothing.
 */
export function ImpactPortrait({
  src,
  alt,
  name,
  size = "base",
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  /** Used for the initials fallback. */
  name: string;
  size?: "base" | "lg";
  /** next/image `sizes`; defaults to the CSS portrait width. */
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "wealth-impact-portrait",
        size === "lg" && "wealth-impact-portrait--lg",
        className,
      )}
    >
      <div className="wealth-impact-portrait__clip">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={
              sizes ??
              (size === "lg" ? "(min-width: 900px) 264px, 168px" : "184px")
            }
            priority={priority}
          />
        ) : (
          <span className="wealth-impact-portrait__initials" aria-hidden="true">
            {personInitials(name)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Framed report photo ─────────────────────────────────────────────────────

/**
 * Report photo in FULL colour, framed square-cornered with the sage offset
 * block behind it (bottom-right). The frame's size comes from `aspect` or
 * the caller's class. Used by the cover and the thank-you group photo.
 */
export function ImpactFramedPhoto({
  src,
  alt,
  sizes = "(min-width: 900px) 42vw, 100vw",
  priority = false,
  objectPosition,
  aspect,
  className,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  objectPosition?: string;
  /** CSS aspect-ratio, e.g. "4 / 5". */
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("wealth-impact-frame", className)}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={objectPosition ? { objectPosition } : undefined}
      />
    </div>
  );
}

// ─── Half-bleed photo ────────────────────────────────────────────────────────

/**
 * The media half of a `.wealth-impact-bleed` split (history, spotlights,
 * call to action, ways to support): a full-colour photo that runs to the
 * viewport edge on ≥900px and stacks under (or, `--left`, above) the text on
 * phones. Render it as a DIRECT child of the `.wealth-impact-bleed` element,
 * before the `.wealth-container`. Never wrap it in a `WealthReveal` (the
 * reveal's transform would become the absolute photo's containing block);
 * pass `reveal` instead, which makes the media element itself the reveal.
 */
export function ImpactBleedPhoto({
  src,
  alt,
  sizes = "(min-width: 1300px) 44vw, (min-width: 900px) 41vw, 100vw",
  objectPosition,
  reveal = false,
  className,
}: {
  src: string;
  alt: string;
  sizes?: string;
  objectPosition?: string;
  /** Fade the photo in with the wealth reveal (delay step 1). */
  reveal?: boolean;
  className?: string;
}) {
  const image = (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      style={objectPosition ? { objectPosition } : undefined}
    />
  );
  const cls = cn("wealth-impact-bleed__media", className);
  return reveal ? (
    <WealthReveal delay={1} threshold={0} className={cls}>
      {image}
    </WealthReveal>
  ) : (
    <div className={cls}>{image}</div>
  );
}
