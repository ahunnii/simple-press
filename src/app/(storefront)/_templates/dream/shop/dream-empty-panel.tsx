"use client";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { navHrefFlag } from "~/app/(storefront)/_components/nav/nav-flags";

import { DreamButton } from "../shared/dream-button";
import { DreamMark } from "../shared/dream-mark";
import { DreamReveal } from "../shared/dream-reveal";

type Props = {
  heading: string;
  /** Blank hides the message. */
  body: string;
  /** Blank (label or href) hides the button. */
  ctaLabel: string;
  ctaHref: string;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  ctaLabelFieldKey?: string;
  /** Spread on the panel root for the preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
  className?: string;
};

/**
 * Designed empty state for the purchase path (empty shop, empty cart,
 * nothing to check out): a sky-to-paper panel (design.md "Palette › empty-
 * state panels") with a hairline frame, the business mark on a tinted sky
 * badge, an Italiana heading, a quiet message, and one ink pill.
 *
 * The button's destination is flag-checked with `navHrefFlag`: when the
 * page it points at is turned off (e.g. `/shop` with `products` off) the
 * button HIDES — it never swaps to another destination (B2.1 / B7.3).
 */
export function DreamEmptyPanel({
  heading,
  body,
  ctaLabel,
  ctaHref,
  headingFieldKey,
  bodyFieldKey,
  ctaLabelFieldKey,
  sectionAttrs,
  className,
}: Props) {
  const { isEnabled } = useStorefrontFlags();
  const flag = ctaHref ? navHrefFlag(ctaHref) : null;
  const showCta =
    ctaLabel.trim() !== "" &&
    ctaHref.trim() !== "" &&
    (flag === null || isEnabled(flag));

  return (
    <div
      {...sectionAttrs}
      className={cn(
        "rounded-[var(--dream-radius-card)] border border-[var(--dream-line)] bg-[linear-gradient(180deg,var(--dream-sky)_0%,var(--dream-paper)_100%)] px-6 py-16 sm:py-20",
        className,
      )}
    >
      <DreamReveal>
        <div className="mx-auto flex max-w-[34rem] flex-col items-center gap-5 text-center">
          <div
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full border border-[var(--dream-line)] bg-[var(--dream-paper)]"
          >
            <DreamMark className="block size-8 opacity-50" />
          </div>
          <h2
            className="[font-family:var(--font-dream-display)] text-[clamp(28px,3.4vw,38px)] leading-[1.1] text-[var(--dream-ink)]"
            {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          >
            {heading}
          </h2>
          {body ? (
            <p
              className="max-w-[44ch] text-[17px] leading-[1.7] text-[var(--dream-soft)]"
              {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
            >
              {body}
            </p>
          ) : null}
          {showCta ? (
            <div className="mt-2">
              <DreamButton href={ctaHref}>
                <span
                  {...(ctaLabelFieldKey ? fieldAttr(ctaLabelFieldKey) : {})}
                >
                  {ctaLabel}
                </span>
              </DreamButton>
            </div>
          ) : null}
        </div>
      </DreamReveal>
    </div>
  );
}
