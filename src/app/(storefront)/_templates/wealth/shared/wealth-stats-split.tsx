import type { WealthTone } from "./wealth-block";
import type { WealthPhotoTreatment } from "./wealth-photo";
import { cn } from "~/lib/utils";

import { wealthToneClass } from "./wealth-block";
import { WealthPhoto } from "./wealth-photo";

type WealthStatsSplitProps = {
  /** Photo URL. Empty → the panel spans the full width on the container. */
  image?: string | null;
  imageAlt?: string;
  imagePosition?: string;
  /** Defaults to the forest duotone. */
  treatment?: WealthPhotoTreatment;
  /** Panel color block. Defaults to primary (white text only). */
  tone?: Extract<WealthTone, "primary" | "forest">;
  /** Photo on the right at ≥900px. */
  reverse?: boolean;
  /** Head content (eyebrow + heading) above the stats. */
  head?: React.ReactNode;
  /** The stats — usually `<WealthStats variant="rows" …/>`. */
  children: React.ReactNode;
  /** Footer row under a hairline (e.g. "See our impact report" button). */
  foot?: React.ReactNode;
  as?: "section" | "div";
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">;

/**
 * Stats split (design.md redesign "wealth-stats-split"): duotone photo +
 * primary panel holding big-number stats. Full-bleed, no outer section
 * padding — the panel carries its own. Server component; extra attributes
 * (`aria-labelledby`, `sectionGroupAttr(...)`) land on the root.
 */
export function WealthStatsSplit({
  image,
  imageAlt = "",
  imagePosition,
  treatment = "duotone",
  tone = "primary",
  reverse = false,
  head,
  children,
  foot,
  as: Tag = "section",
  className,
  ...rest
}: WealthStatsSplitProps) {
  const hasImage = !!image?.trim();
  return (
    <Tag
      {...rest}
      className={cn(
        "wealth-statsplit",
        wealthToneClass(tone),
        reverse && "wealth-statsplit--reverse",
        !hasImage && "wealth-statsplit--noimage",
        className,
      )}
    >
      {hasImage ? (
        <WealthPhoto
          src={image ?? ""}
          alt={imageAlt}
          treatment={treatment}
          objectPosition={imagePosition}
          sizes="(min-width: 900px) 50vw, 100vw"
          className="wealth-statsplit__media"
        />
      ) : null}
      <div className="wealth-statsplit__panel">
        {head ? <div className="wealth-statsplit__head">{head}</div> : null}
        {children}
        {foot ? <div className="wealth-statsplit__foot">{foot}</div> : null}
      </div>
    </Tag>
  );
}
