import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { GloveButton, GloveHandIcon } from "../shared";

type GloveEmptyStateProps = {
  heading?: string;
  headingFieldKey?: string;
  body?: string;
  bodyFieldKey?: string;
  /** Optional action; hidden unless both label and href are set. */
  cta?: { label: string; href: string; fieldKey?: string };
  /** Replaces the default glove glyph. */
  icon?: ReactNode;
  className?: string;
};

/**
 * Designed empty state for the content pages: mist panel, glove glyph,
 * Poppins heading, Lato body and an optional purple action.
 */
export function GloveEmptyState({
  heading,
  headingFieldKey,
  body,
  bodyFieldKey,
  cta,
  icon,
  className,
}: GloveEmptyStateProps) {
  const showCta = !!cta && cta.label.trim().length > 0 && cta.href.length > 0;
  return (
    <div
      className={cn(
        "glove-mist-panel mx-auto flex max-w-2xl flex-col items-center px-6 py-14 text-center md:py-20",
        className,
      )}
    >
      <span className="text-[var(--glove-primary)]">
        {icon ?? <GloveHandIcon className="size-14" />}
      </span>
      {heading ? (
        <h2
          className="glove-display mt-5 text-[22px] leading-tight font-medium text-[var(--glove-ink)] md:text-[26px]"
          {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
        >
          {heading}
        </h2>
      ) : null}
      {body ? (
        <p
          className="glove-body mt-3 max-w-md text-[15px] leading-relaxed text-[var(--glove-text)]"
          {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
        >
          {body}
        </p>
      ) : null}
      {showCta && cta ? (
        <div className="mt-7">
          <GloveButton href={cta.href} variant="woo">
            <span {...(cta.fieldKey ? fieldAttr(cta.fieldKey) : {})}>
              {cta.label}
            </span>
          </GloveButton>
        </div>
      ) : null}
    </div>
  );
}
