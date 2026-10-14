import type { WealthTone } from "./wealth-block";
import type { WealthLedgeButtonVariant } from "./wealth-ledge-button";
import { cn } from "~/lib/utils";

import { wealthToneClass } from "./wealth-block";
import { WealthLedgeButton } from "./wealth-ledge-button";

export type WealthProgramTone = Extract<
  WealthTone,
  "forest" | "primary" | "sage" | "surface"
>;

/** Card order on the homepage: forest → primary → sage → surface. */
export const WEALTH_PROGRAM_TONES: readonly WealthProgramTone[] = [
  "forest",
  "primary",
  "sage",
  "surface",
];

type WealthProgramCardProps = {
  tone?: WealthProgramTone;
  /** Line icon (inline SVG or a Lucide icon) — stroked in the block's icon
   *  color, 56px. Decorative: give it aria-hidden. */
  icon?: React.ReactNode;
  /** Small mono index, e.g. "01". */
  number?: string;
  title: React.ReactNode;
  copy?: React.ReactNode;
  /** CTA: a ledge button whose variant follows the tone (sage-on-dark on
   *  forest/primary, forest on sage, sage on surface) unless overridden. */
  cta?: {
    label: React.ReactNode;
    href: string;
    external?: boolean;
    variant?: WealthLedgeButtonVariant;
  } | null;
  titleAs?: "h2" | "h3" | "h4";
  /** Editor wiring: spread `fieldAttr(...)` on the title / copy elements. */
  titleProps?: Record<string, string>;
  copyProps?: Record<string, string>;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "title">;

function ctaVariantFor(tone: WealthProgramTone): {
  variant: WealthLedgeButtonVariant;
  onDark: boolean;
} {
  if (tone === "forest" || tone === "primary") {
    return { variant: "accent", onDark: true };
  }
  if (tone === "sage") return { variant: "forest", onDark: false };
  return { variant: "accent", onDark: false };
}

/**
 * Solid color program card (design.md redesign "wealth-program-card"):
 * icon, mono number, italic Jost title, copy, ledge button pinned to the
 * bottom. Lay several out in `.wealth-programs` (1 / 2 / 4 columns;
 * `.wealth-programs--3` for three). Extra attributes (e.g.
 * `listItemAttr(key, i)`) land on the `<article>`.
 */
export function WealthProgramCard({
  tone = "forest",
  icon,
  number,
  title,
  copy,
  cta,
  titleAs: TitleTag = "h3",
  titleProps,
  copyProps,
  className,
  ...rest
}: WealthProgramCardProps) {
  const auto = ctaVariantFor(tone);
  return (
    <article
      {...rest}
      className={cn("wealth-program", wealthToneClass(tone), className)}
    >
      {icon ? <div className="wealth-program__icon">{icon}</div> : null}
      {number ? <span className="wealth-program__num">{number}</span> : null}
      <TitleTag {...titleProps} className="wealth-program__title">
        {title}
      </TitleTag>
      {copy ? (
        <p {...copyProps} className="wealth-program__copy">
          {copy}
        </p>
      ) : null}
      {cta?.href ? (
        <div className="wealth-program__cta">
          <WealthLedgeButton
            href={cta.href}
            external={cta.external}
            variant={cta.variant ?? auto.variant}
            onDark={
              cta.variant
                ? tone === "forest" || tone === "primary"
                : auto.onDark
            }
          >
            {cta.label}
          </WealthLedgeButton>
        </div>
      ) : null}
    </article>
  );
}
