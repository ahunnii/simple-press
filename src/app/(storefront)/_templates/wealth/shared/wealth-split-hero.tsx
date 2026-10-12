import type { WealthTone } from "./wealth-block";
import type { WealthPhotoTreatment } from "./wealth-photo";
import { cn } from "~/lib/utils";

import { wealthToneClass } from "./wealth-block";
import { WealthPhoto } from "./wealth-photo";

type WealthSplitHeroProps = {
  /** Photo URL. Empty / null / undefined → full-width color panel only. */
  image?: string | null;
  imageAlt?: string;
  /** CSS object-position for the crop, e.g. "38% 50%". */
  imagePosition?: string;
  /** Desktop split: `two-thirds` (≈63/37, homepage) or `sixty` (60/40,
   *  content pages). Mobile always stacks photo-then-panel. */
  ratio?: "two-thirds" | "sixty";
  /** Photo on the right at ≥900px. */
  reverse?: boolean;
  /** Panel color block. Defaults to forest. */
  tone?: Extract<WealthTone, "forest" | "primary" | "sage" | "surface">;
  /** Photo treatment. Defaults to the flat forest tint. */
  treatment?: WealthPhotoTreatment;
  /** Hero photos are usually the LCP — defaults to true. */
  priority?: boolean;
  /** The panel's content: eyebrow, `.wealth-hero__statement` /
   *  `.wealth-hero__title`, `.wealth-hero__rule`, `.wealth-hero__excerpt`,
   *  `.wealth-btn-row`. Direct children get rhythm spacing. */
  children: React.ReactNode;
  as?: "section" | "header" | "div";
  className?: string;
  panelClassName?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">;

/**
 * Split hero: forest-tinted photo + color panel (design.md redesign
 * "wealth-split-hero"). Server component. Extra attributes (`aria-label`,
 * `sectionGroupAttr(...)`) land on the root.
 */
export function WealthSplitHero({
  image,
  imageAlt = "",
  imagePosition,
  ratio = "two-thirds",
  reverse = false,
  tone = "forest",
  treatment = "tint",
  priority = true,
  children,
  as: Tag = "section",
  className,
  panelClassName,
  ...rest
}: WealthSplitHeroProps) {
  const hasImage = !!image?.trim();
  return (
    <Tag
      {...rest}
      className={cn(
        "wealth-hero",
        wealthToneClass(tone),
        ratio === "sixty" && "wealth-hero--60",
        reverse && "wealth-hero--reverse",
        !hasImage && "wealth-hero--noimage",
        className,
      )}
    >
      {hasImage ? (
        <WealthPhoto
          src={image ?? ""}
          alt={imageAlt}
          treatment={treatment}
          objectPosition={imagePosition}
          priority={priority}
          sizes={
            ratio === "sixty"
              ? "(min-width: 900px) 60vw, 100vw"
              : "(min-width: 900px) 64vw, 100vw"
          }
          className="wealth-hero__media"
        />
      ) : null}
      <div className={cn("wealth-hero__panel", panelClassName)}>{children}</div>
    </Tag>
  );
}
